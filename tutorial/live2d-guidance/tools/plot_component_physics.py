"""Plot the measured response JSON with matplotlib; writes only the requested figure."""
import json
import sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

report = json.loads(Path(sys.argv[1]).read_text())
cjk = next((f.name for f in font_manager.fontManager.ttflist if 'CJK' in f.name), None)
if cjk:
    plt.rcParams['font.family'] = cjk
plt.rcParams.update({'svg.fonttype': 'path', 'svg.hashsalt': 'astra-component-response', 'axes.unicode_minus': False})
figure, axes = plt.subplots(1, 2, figsize=(11, 3.8), constrained_layout=True)
colors = {'default': '#526d82', 'existing-example': '#bd6236'}
for axis, kind in zip(axes, ['ribbon', 'cloth']):
    for sample in (r for r in report['responses'] if r['kind'] == kind):
        rows = sample['curve']
        axis.plot([r['seconds'] for r in rows], [r['tip'] for r in rows],
                  color=colors[sample['preset']], linewidth=2,
                  label='默认配置' if sample['preset'] == 'default' else '已有慢速示例配置')
    axis.axhline(0, color='#888888', linewidth=.7)
    axis.set(xlim=(0, 4), title='长条' if kind == 'ribbon' else '宽布', xlabel='时间（秒）', ylabel='末端横向位移（像素）')
    axis.grid(alpha=.2)
    axis.legend(frameon=False, fontsize=9)
figure.suptitle('相同末端扰动下的现有求解器响应 · 150×650 · 120 Hz', fontsize=12)
figure.savefig(sys.argv[2], dpi=160, metadata={'Date': None} if sys.argv[2].endswith('.svg') else None)
plt.close(figure)
