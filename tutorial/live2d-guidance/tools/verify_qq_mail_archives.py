"""Check the 25 downloaded mail attachments and ordered volume hashes, read-only."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[3]
DEFAULT = ROOT / 'tutorial/live2d-guidance/model-originals/archives/qq-mail-20261009'


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def verify(directory):
    expected = json.loads((directory / 'expected-attachments.json').read_text(encoding='utf-8'))
    records = json.loads((directory / 'download-records.json').read_text(encoding='utf-8'))
    if sorted(e['email'] for e in expected) != list(range(1, 26)):
        raise ValueError('Expected email numbers are not exactly 1 through 25')
    if sorted(e['email'] for e in records) != list(range(1, 26)):
        raise ValueError('Downloaded email numbers are not exactly 1 through 25')
    recorded = {e['email']: e for e in records}
    if len({e['name'] for e in expected}) != 25:
        raise ValueError('Attachment names are duplicated')
    if {p.name for p in directory.glob('*.zip')} != {e['name'] for e in expected}:
        raise ValueError('Downloaded ZIP filenames do not match the 25 emails')

    files, groups, complete = [], {}, []
    for item in expected:
        if Path(item['name']).name != item['name']:
            raise ValueError('Unsafe attachment filename')
        path = directory / item['name']
        record = recorded[item['email']]
        sha = digest(path)
        if record['name'] != item['name'] or path.stat().st_size != item['expectedBytes'] or sha != record['sha256']:
            raise ValueError(f'Attachment differs from mail declaration or saved bytes: {path.name}')
        with zipfile.ZipFile(path) as archive:
            bad = archive.testzip()
            if bad is not None:
                raise ValueError(f'ZIP CRC failed: {path.name}: {bad}')
            members = archive.namelist()
            match = re.fullmatch(r'(.+)_part(\d+)_of_(\d+)\.zip', path.name)
            if match:
                model, number, total = match.group(1), int(match.group(2)), int(match.group(3))
                member = f'{model}.part{number:03}.bin'
                if members.count(member) != 1 or members.count('README_恢复说明.txt') != 1:
                    raise ValueError(f'Volume contents missing or duplicated: {path.name}')
                instructions = archive.read('README_恢复说明.txt').decode('utf-8-sig')
                expected_hash = re.search(r'预期[：:]\s*([a-fA-F0-9]{64})', instructions)
                if expected_hash is None:
                    raise ValueError(f'Original ZIP hash is missing from {path.name}')
                group = groups.setdefault(model, {'total': total, 'volumes': [], 'sha256': expected_hash.group(1).lower()})
                if group['total'] != total or group['sha256'] != expected_hash.group(1).lower():
                    raise ValueError(f'Volume metadata conflict: {model}')
                group['volumes'].append({'number': number, 'zip': path.name, 'member': member})
            else:
                complete.append({'name': path.name, 'bytes': path.stat().st_size, 'sha256': sha,
                                 'zip_crc': 'passed', 'entries': len(members)})
        files.append({'email': item['email'], 'name': path.name, 'bytes': path.stat().st_size,
                      'sha256': sha, 'mail_size_matches': True, 'zip_crc': 'passed'})

    assembled = []
    for model, group in sorted(groups.items()):
        volumes = sorted(group['volumes'], key=lambda v: v['number'])
        if [v['number'] for v in volumes] != list(range(1, group['total'] + 1)):
            raise ValueError(f'Missing or duplicate volumes: {model}')
        joined_hash, joined_bytes = hashlib.sha256(), 0
        for volume in volumes:
            with zipfile.ZipFile(directory / volume['zip']) as archive, archive.open(volume['member']) as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    joined_hash.update(block)
                    joined_bytes += len(block)
        if joined_hash.hexdigest() != group['sha256']:
            raise ValueError(f'Ordered volume content does not match original ZIP hash: {model}')
        assembled.append({'name': model + '.zip', 'volumes': group['total'], 'missing_volumes': [],
                          'ordered_content_bytes': joined_bytes, 'sha256': group['sha256'],
                          'original_hash_matches': True, 'attachments': [v['zip'] for v in volumes]})
    if len(assembled) != 6 or len(complete) != 1 or sum(g['volumes'] for g in assembled) != 24:
        raise ValueError('Expected six multi-volume models and one complete model archive')
    return {'verified_on': '2026-10-20', 'expected_emails': 25, 'downloaded_attachments': len(files),
            'attachment_bytes': sum(f['bytes'] for f in files), 'missing_emails': [],
            'all_attachment_sizes_match': True, 'all_attachment_sha256_match': True,
            'all_zip_crc_passed': True, 'volumes_complete': True, 'original_archive_hashes_match': True,
            'first_subject_numbering': '1/19 is the valid first mail; the later total is 25',
            'files': files, 'multipart_models': assembled, 'complete_archives': complete,
            'method': 'MIME attachments decoded from the QQ webmail original-message page; no browser credentials or full mail headers saved',
            'workflow_changes': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=DEFAULT)
    parser.add_argument('--report', type=Path, help='Optionally write the verification result as JSON')
    args = parser.parse_args()
    result = verify(args.directory.resolve())
    if args.report:
        with args.report.open('w', encoding='utf-8', newline='\n') as stream:
            json.dump(result, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
    print(json.dumps({k: v for k, v in result.items() if k not in ['files', 'multipart_models', 'complete_archives']}, ensure_ascii=False))
    print(json.dumps(result['multipart_models'] + result['complete_archives'], ensure_ascii=False, indent=2))
