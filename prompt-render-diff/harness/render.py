#!/usr/bin/env python3
# render.py <capture dir> <skill root>  -> writes <capture dir>/rendered/
import json, os, re, sys, glob, collections, hashlib, shutil
cap, skill = sys.argv[1], os.path.abspath(sys.argv[2]).rstrip('/')
out = os.path.join(cap, 'rendered'); shutil.rmtree(out, ignore_errors=True)
def norm(s):
    if not isinstance(s, str): return s
    s = s.replace(skill, '<SKILL>')
    s = re.sub(r'/tmp/[A-Za-z0-9._-]+', '/tmp/<TMP>', s)
    s = re.sub(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '<UUID>', s)
    s = re.sub(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z', '<TIME>', s)
    return s
def deep(x):
    if isinstance(x, dict): return {k: deep(v) for k, v in x.items() if v is not None}
    if isinstance(x, list): return [deep(v) for v in x]
    return norm(x)
recs = []
for f in glob.glob(os.path.join(cap, 'raw', '*.jsonl')):
    for line in open(f): recs.append(json.loads(line))
recs.sort(key=lambda r: (r['test'], r['n']))
seen = collections.Counter()
for r in recs:
    d = deep(r['data'])
    if r['site'] in ('run', 'raster'):
        step = (d or {}).get('step') or 'none'; name = re.sub(r'[/ ]', '_', (d or {}).get('name') or '')
    else:
        step = r['site']; name = ''
    tf, tn = r['test'].split(' :: ', 1)
    sub = (r['test'], r['site'], step, name); seen[sub] += 1
    path = os.path.join(out, tf.replace('/', '__'), re.sub(r'[^\w\u4e00-\u9fff-]+', '_', tn)[:120],
                        f"{r['site']}.{step}.{name}.{seen[sub]:02d}.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as w:
        if r['site'] in ('run', 'raster'):
            w.write(d.get('prompt', '') + '\n')
            for k in ('recoveryPrompt',):
                if d.get(k): w.write(f'\n======== {k} ========\n' + d[k] + '\n')
            for i in d.get('images') or []: w.write('\n======== image ========\n' + json.dumps(i, ensure_ascii=False, indent=1) + '\n')
            for t in d.get('tools') or []: w.write(f"\n======== tool {t['name']} ========\n" + (t.get('description') or '') + '\n')
            if d.get('threadId'): w.write('\n======== threadId ========\n')
        else:
            for item in d: w.write(('======== text ========\n' + item['text']) if 'text' in item else '======== image ' + str(item.get('image')) + ' ========' ); w.write('\n')
print(len(recs), 'records')
