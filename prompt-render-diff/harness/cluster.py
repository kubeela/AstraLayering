import re,sys,os,difflib,collections
def norm(t):
    t=re.sub(r'(提示词来源：)\S+', r'\1P', t)
    t=re.sub(r'"path": "[^"]*"', '"path": "P"', t)
    t=re.sub(r'/tmp/[^\s"：，、）)]*?/(part-layering|clothing-part-layering|raster-layering|clothing-raster-layering)(?=[/\s"]|$)', r'<TASK>/\1', t)
    t=re.sub(r'/tmp/[A-Za-z0-9._-]+', '<TMP>', t)
    t=re.sub(r'[^\s"：]*/\.agents/skills/live2d-maker/', '<SKILL>/', t)
    return t
a,b=sys.argv[1:3]
groups=collections.defaultdict(list)
for line in open(sys.argv[3]):
  if not line.startswith('DIFF'): continue
  pa=line.split()[1]; pb=pa.replace(a,b,1)
  x=norm(open(pa).read()).splitlines(); y=norm(open(pb).read()).splitlines()
  d=[l for l in difflib.unified_diff(x,y,lineterm='',n=0) if l[:1] in '+-' and not l.startswith(('---','+++'))]
  groups['\n'.join(d)].append(pa)
for k,v in sorted(groups.items(),key=lambda kv:-len(kv[1])):
  print('=====',len(v),'files; e.g.',v[0].split('/',2)[2])
  print(k[:3000]); print()
print(len(groups),'clusters')
