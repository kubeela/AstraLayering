"""Run the installed imagegen CLI; credentials stay in the local configuration."""
import argparse, concurrent.futures, datetime, hashlib, json, os, pathlib, subprocess, sys

p = argparse.ArgumentParser()
p.add_argument('--cli', type=pathlib.Path, required=True)
p.add_argument('--config', type=pathlib.Path)
p.add_argument('--stage', choices=['color', 'maps'], required=True)
p.add_argument('--sample', action='append')
a = p.parse_args()
root = pathlib.Path(__file__).resolve().parents[2]
env = os.environ.copy()
if a.config:
    config = json.loads(a.config.read_text())
    env['OPENAI_API_KEY'] = config['api_key']
    env['OPENAI_BASE_URL'] = config['base_url']

def run(sample, kind):
    folder = root / 'demos/lighting-lab' / sample
    out = folder / ('generated-color.png' if kind == 'color' else kind + '-generated.png')
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    contract = {'model': 'gpt-image-2', 'quality': 'high', 'size': '1536x2048', 'promptSHA256': digest(folder / (kind + '-prompt.txt')), 'referenceSHA256': None if kind == 'color' else digest(folder / 'generated-color.png')}
    receipt = folder / (kind + '-generation.json')
    if out.exists():
        if not receipt.exists(): raise RuntimeError(f'{sample}/{kind}: existing output needs a verified generation receipt')
        retained = json.loads(receipt.read_text())
        if any(retained.get(k) != v for k, v in contract.items()) or retained.get('outputSHA256') != digest(out):
            raise RuntimeError(f'{sample}/{kind}: input, prompt or output changed; archive the old sample before regeneration')
        print(f'{sample}/{kind}: retained; inputs verified', flush=True)
        return
    args = [sys.executable, str(a.cli), 'generate' if kind == 'color' else 'edit', '--model', 'gpt-image-2', '--quality', 'high', '--size', '1536x2048', '--no-augment', '--prompt-file', str(folder / (kind + '-prompt.txt')), '--out', str(out)]
    if kind != 'color': args += ['--image', str(folder / 'generated-color.png')]
    log = root / '.web/lighting-generation' / f'{sample}-{kind}.log'
    log.parent.mkdir(parents=True, exist_ok=True)
    print(f'{sample}/{kind}: starting', flush=True)
    with log.open('w') as f:
        result = subprocess.run(args, env=env, stdout=f, stderr=subprocess.STDOUT)
    if result.returncode: raise RuntimeError(f'{sample}/{kind} failed; inspect local log {log.name}')
    receipt.write_text(json.dumps({**contract, 'outputSHA256': digest(out), 'completedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}, indent=2) + '\n')
    print(f'{sample}/{kind}: saved', flush=True)

samples = a.sample or ['front', 'hand-face', 'turn']
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    jobs = [pool.submit(run, s, k) for s in samples for k in (['color'] if a.stage == 'color' else ['normal', 'depth'])]
    for job in concurrent.futures.as_completed(jobs): job.result()
