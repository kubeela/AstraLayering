"""Authoring-only change ledger; never an input of the drawing workflows."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = ROOT / 'workflows/templates/部件专项'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def initialize():
    target = OUT / 'before.json'
    if target.exists():
        return
    files = {}
    for folder in ('workflows', 'workflow_clothing'):
        for path in (ROOT / folder).rglob('*'):
            if path.is_file() and '__pycache__' not in path.parts:
                raw = path.read_bytes()
                files[path.relative_to(ROOT).as_posix()] = {
                    'sha256': digest(raw),
                    'text': raw.decode('utf-8-sig') if path.suffix in ('.txt', '.md', '.yaml', '.model') else None,
                }
    target.write_text(json.dumps(files, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / 'changes.json').write_text('[]\n', encoding='utf-8')

def change(relative, anchor, replacement, sources, retained, reason):
    path = ROOT / relative if relative.startswith('workflow') else BASE / relative
    raw = path.read_bytes()
    bom = raw.startswith(b'\xef\xbb\xbf')
    text = raw.decode('utf-8-sig').replace('\r\n', '\n')
    assert text.count(anchor) == 1, (relative, text.count(anchor), anchor)
    newline = '\r\n' if b'\r\n' in raw else '\n'
    updated = text.replace(anchor, replacement).replace('\n', newline)
    records_path = OUT / 'changes.json'
    records = json.loads(records_path.read_text(encoding='utf-8'))
    records.append(dict(path=path.relative_to(ROOT).as_posix(), before=anchor, after=replacement,
                        sources=sources, retained=retained, reason=reason))
    path.write_bytes((b'\xef\xbb\xbf' if bom else b'') + updated.encode('utf-8'))
    records_path.write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

initialize()
