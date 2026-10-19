"""Read-only verification of tutorial reference payloads and optional Git blobs."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[3]
CATALOG = ROOT / 'tutorial/live2d-guidance/layering-reference-inventory.json'


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def verify(git_ref=None):
    manifest = json.loads(CATALOG.read_text(encoding='utf-8'))
    checked = 0
    for entry in manifest['files']:
        path = (ROOT / entry['path']).resolve()
        if not path.is_relative_to(ROOT):
            raise ValueError(f'Path escapes repository: {entry["path"]}')
        if not path.is_file() or path.stat().st_size != entry['bytes'] or digest(path) != entry['sha256']:
            raise ValueError(f'File does not match recorded original: {entry["path"]}')
        if path.suffix.lower() == '.zip':
            with zipfile.ZipFile(path) as archive:
                bad = archive.testzip()
                if bad is not None:
                    raise ValueError(f'ZIP CRC mismatch: {entry["path"]}: {bad}')
        if git_ref is not None:
            result = subprocess.run(['git', 'show', f'{git_ref}:{entry["path"]}'], cwd=ROOT,
                                    check=True, stdout=subprocess.PIPE)
            if hashlib.sha256(result.stdout).hexdigest() != entry['sha256']:
                raise ValueError(f'Git bytes differ or reference is not committed: {entry["path"]}')
        checked += 1
    print(json.dumps({'verified_files': checked, 'verified_bytes': sum(e['bytes'] for e in manifest['files']),
                      'git_ref': git_ref, 'original_packages_crc': 'passed'}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--git-ref', help='Also compare files with a Git revision; use an empty string for the index')
    verify(parser.parse_args().git_ref)
