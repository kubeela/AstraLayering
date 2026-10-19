from pathlib import Path
p=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/evidence/build_eye.py')
s=p.read_text(encoding='utf-8')
a='M 405.70,197.20 C 406.37,194.28 410.13,192.43 414.16,192.71 C 421.86,192.76 427.80,196.92 431.61,201.80'
b='M 405.70,197.20 C 404.91,192.42 410.27,187.49 418.18,188.25 C 425.86,187.68 430.54,193.72 431.61,201.80'
assert a in s
p.write_text(s.replace(a,b),encoding='utf-8')
