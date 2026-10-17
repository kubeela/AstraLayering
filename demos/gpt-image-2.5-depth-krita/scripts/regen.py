"""Regenerate selected parts with the current prepare_depth prompt template.

Writes prompt-v2.txt and generated-v2.png (attempt logs gen-v2-<model>-<n>.log)
next to the original generation; the assembly prefers generated-v2.png.
"""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import prepare_depth as pd  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MODELS = ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']


def run(pid, rec, nodes, names, tries=3):
    w = ROOT / 'work/parts' / pid
    node, _ = nodes[pid]
    prompt = (w / 'prompt-v2-custom.txt').read_text() if (w / 'prompt-v2-custom.txt').exists() else \
        pd.prompt(node, [names[o] for o in rec['occludedBy']])
    (w / 'prompt-v2.txt').write_text(prompt)
    image1 = w / 'sketch-bent.png' if (w / 'sketch-bent.png').exists() and (w / 'prompt-v2-custom.txt').exists() else w / 'source-crop.png'
    for n in range(tries):
        model = MODELS[n % 2]
        out = w / 'generated-v2.png'
        cmd = ['forgeax-imagegen', 'edit', '--model', model, '--image', str(image1), '--image', str(w / 'control-crop.png'),
               '--prompt-file', str(w / 'prompt-v2.txt'), '--size', f"{rec['size'][0]}x{rec['size'][1]}", '--quality', 'high',
               '--background', 'transparent', '--output-format', 'png', '--no-augment', '--out', str(out)]
        with open(w / f'gen-v2-{model}-{n}.log', 'w') as log:
            ok = subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT).returncode == 0
        if ok and out.exists():
            (w / 'generated-v2.json').write_text(json.dumps(dict(model=model, attempt=n, image1=image1.name)) + '\n')
            return f'{pid}: ok ({model}, try {n})'
    return f'{pid}: FAILED'


def main():
    man = {p['id']: p for p in json.loads((ROOT / 'work/manifest.json').read_text())['parts']}
    tree = json.loads((pd.STANDARD / 'groups.json').read_text())
    nodes = {n['id']: (n, p) for n, p in pd.leaves(tree['groups'])}
    names = {k: v[0].get('name') or k.split('/')[-1] for k, v in nodes.items()}
    with ThreadPoolExecutor(6) as ex:
        for r in ex.map(lambda pid: run(pid, man[pid], nodes, names), sys.argv[1:]):
            print(r, flush=True)


if __name__ == '__main__':
    main()
