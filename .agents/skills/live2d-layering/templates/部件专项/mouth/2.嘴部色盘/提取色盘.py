"""嘴部色盘的默认展示设置；采样与排版复用公共工具，输入可覆盖这些建议。"""
from pathlib import Path
import runpy


DEFAULTS = {
    'title': '嘴部色盘 / 原图取色与位置',
    'region': '嘴部',
    'footer': '结合原彩图区分固有色、渐变与投影；嘴周层次和口腔颜色分别保留归属。',
    'groups': [('cavity', '嘴内 · 口腔颜色'), ('interior', '嘴内部件 · 牙齿与舌头'),
               ('lips', '唇部 · 固有色与体积层次'), ('contour', '嘴上与嘴下 · 轮廓色'),
               ('skin', '嘴周皮肤 · 底色与体积层次'), ('comparison', '投影、高光与妆色 · 对照色')],
}


if __name__ == '__main__':
    core = runpy.run_path(str(Path(__file__).resolve().parents[4] / 'tools' / 'extract_palette.py'))
    core['main'](defaults=DEFAULTS)
