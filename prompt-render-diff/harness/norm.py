import re,sys,os
def norm(t):
    t=re.sub(r'(提示词来源：)\S+', r'\1P', t)
    t=re.sub(r'"path": "[^"]*"', '"path": "P"', t)
    return t
a,b=sys.argv[1:3]
n=0
for root,_,fs in os.walk(a):
  for f in fs:
    pa=os.path.join(root,f); pb=pa.replace(a,b,1)
    if not os.path.exists(pb): print('ONLY',pa); continue
    if norm(open(pa).read())!=norm(open(pb).read()): print('DIFF',pa); n+=1
print(n)
