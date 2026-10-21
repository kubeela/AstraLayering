"""Private Krita worker: fixed module installation and image matting operations."""
from krita import Krita, Extension
from PyQt5.QtCore import QTimer
from PyQt5.QtWidgets import QApplication
from pathlib import Path
import os, sys, json, traceback, time, platform, sysconfig, site

JOB_PATH = Path(os.environ['LAYERING_MATTING_JOB'])
JOB = json.loads(JOB_PATH.read_text(encoding='utf-8'))
ROOT = JOB_PATH.parent

def atomic(path, value):
    p = Path(path)
    tmp = p.with_suffix(p.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.replace(p)

def host():
    return {'python': sys.version, 'version': list(sys.version_info[:3]),
            'abi': sysconfig.get_config_var('SOABI'), 'machine': platform.machine(),
            'platform': sys.platform, 'prefix': sys.prefix, 'krita': Krita.instance().version(),
            'home': os.environ.get('HOME'), 'config': os.environ.get('XDG_CONFIG_HOME')}

def packages():
    site.ENABLE_USER_SITE = False
    sys.path[:] = [p for p in sys.path if not (('site-packages' in p or 'dist-packages' in p)
                                             and not str(Path(p).resolve()).startswith(str(Path(sys.prefix).resolve()) + os.sep))]
    sys.path.insert(0, JOB['packages'])
    import torch
    if torch.version.cuda is not None:
        raise RuntimeError('自动 matting 环境必须使用 CPU PyTorch。')
    torch.set_num_threads(4)
    torch.set_num_interop_threads(2)
    from transformers import VitMatteForImageMatting, VitMatteImageProcessor
    from pymatting import estimate_foreground_ml
    model = VitMatteForImageMatting.from_pretrained(JOB['weights'], local_files_only=True, dtype=torch.float32).eval()
    processor = VitMatteImageProcessor.from_pretrained(JOB['weights'], local_files_only=True)
    return torch, model, processor, estimate_foreground_ml

def infer(input_path, output_path, loaded=None):
    import numpy as np
    from PIL import Image
    from scipy import ndimage as ndi
    torch, model, processor, estimate_foreground = loaded or packages()
    image = Image.open(input_path).convert('RGB')
    c = np.asarray(image, dtype=np.float64) / 255
    h, w = c.shape[:2]
    rim = np.concatenate([c[:min(12,h)].reshape(-1,3), c[-min(12,h):].reshape(-1,3),
                          c[:, :min(12,w)].reshape(-1,3), c[:, -min(12,w):].reshape(-1,3)])
    b = np.median(rim, axis=0)
    support = np.mean(np.max(np.abs(rim - b), axis=1) < .125)
    if support < .6 or b.max() - b.min() < .5:
        raise ValueError('Nano 图片没有可靠的红、绿或蓝纯色背景。')
    close = np.max(np.abs(c - b), axis=2) < .035
    seed = np.zeros(close.shape, bool)
    seed[0] = close[0]; seed[-1] = close[-1]; seed[:,0] = close[:,0]; seed[:,-1] = close[:,-1]
    exterior = ndi.binary_propagation(seed, mask=close)
    safe_bg = ndi.binary_erosion(exterior, iterations=6, border_value=1)
    tri = np.full((h,w), .5); tri[safe_bg] = 0
    ideal = np.zeros(3); ideal[np.argmax(b)] = 1
    bound = np.max(np.where(ideal > .5, 1 - c, c), axis=2)
    fg = (bound > .93) & ndi.binary_erosion(~exterior, iterations=2)
    tri[fg] = 1
    trimap = Image.fromarray(np.uint8(tri * 255 + .5))
    start = time.monotonic()
    inputs = processor(images=image, trimaps=trimap, return_tensors='pt')
    with torch.inference_mode():
        a = model(**inputs).alphas[0,0,:h,:w].numpy().astype(np.float64)
    a[tri == 0] = 0; a[tri == 1] = 1
    f = estimate_foreground(c, a)
    rgba = np.uint8(np.clip(np.dstack([f,a]),0,1)*255+.5)
    if not np.any(rgba[:,:,3]) or not np.any(rgba[:,:,3] == 0):
        raise ValueError('Matting 未生成有效的透明前景。')
    Image.fromarray(rgba).save(output_path)
    Image.fromarray(np.uint8(np.clip(a,0,1)*255+.5)).save(str(output_path)+'.alpha.png')
    trimap.save(str(output_path)+'.trimap.png')
    return {'method':'vitmatte-foreground-ml','size':[w,h], 'key':(b*255).tolist(),
            'seconds':time.monotonic()-start,'backgroundPixels':int(safe_bg.sum()),
            'foregroundSeeds':int(fg.sum()),'unknownPixels':int((tri==.5).sum())}

class Worker(Extension):
    def setup(self):
        for widget in QApplication.topLevelWidgets():
            widget.hide()
        QTimer.singleShot(100, self.run)
    def createActions(self, window):
        pass
    def run(self):
        result = {'host':host()}
        try:
            if os.environ.get('HOME') != JOB['expectedHome'] or os.environ.get('XDG_CONFIG_HOME') != JOB['expectedConfig']:
                raise RuntimeError('Krita 启动入口覆盖了 HOME / XDG 隔离配置；请使用保留传入环境的 --krita 入口。')
            mode = JOB['mode']
            if mode == 'install':
                if not (3,10) <= sys.version_info[:2] <= (3,13):
                    raise RuntimeError('本套预编译包支持 Krita Python 3.10～3.13；当前为 '+sys.version.split()[0])
                sys.path.insert(0, JOB['pip'])
                from pip._internal.cli.main import main
                requirements = Path(JOB['requirements']).read_text().splitlines()
                if sys.platform != 'darwin':
                    requirements = [s+'+cpu' if s.startswith(('torch==','torchvision==')) else s for s in requirements]
                args = ['--isolated','install','--ignore-installed','--no-cache-dir','--no-compile',
                        '--only-binary=:all:','--no-warn-script-location','--target',JOB['packages'],
                        '--index-url','https://pypi.org/simple']
                if sys.platform != 'darwin':
                    args += ['--extra-index-url','https://download.pytorch.org/whl/cpu']
                code = main(args + [s for s in requirements if s.strip() and not s.startswith('#')])
                if code:
                    raise RuntimeError('Python 模块安装失败，pip exit='+str(code))
                loaded = packages()
                import numpy as np
                from PIL import Image
                torch, model, processor, estimate_foreground = loaded
                image = Image.new('RGB',(64,64),(220,140,180)); tri = Image.new('L',(64,64),128)
                with torch.inference_mode():
                    a = model(**processor(images=image,trimaps=tri,return_tensors='pt')).alphas[0,0].numpy().astype(np.float64)
                f = estimate_foreground(np.asarray(image,dtype=np.float64)/255,a)
                if a.shape != (64,64) or f.shape != (64,64,3) or not np.isfinite(f).all():
                    raise RuntimeError('安装后的实际推理检查失败。')
                from importlib.metadata import distributions
                result['modules'] = {d.metadata['Name']:d.version for d in distributions(path=[JOB['packages']])}
            elif mode == 'infer':
                # Load from the private package tree before NumPy/Pillow imports.
                loaded = packages()
                result['matting'] = infer(JOB['input'],JOB['output'],loaded)
            elif mode != 'probe':
                raise ValueError('未知 matting worker 操作。')
            result['success'] = True
        except BaseException:
            result.update({'success':False,'error':traceback.format_exc()})
        atomic(ROOT/'result.json', result)
        QApplication.instance().quit()

Krita.instance().addExtension(Worker(Krita.instance()))
