"""头发色盘的默认展示设置；采样与排版复用公共工具，输入可覆盖这些建议。"""
from pathlib import Path
import runpy


DEFAULTS = {
    'title': '头发色盘 / 原图取色与层次',
    'region': '头发',
    'footer': '按原图位置组织整体体积、发束明暗与反光；外来投影独立，隐藏补色注明推断。',
    'groups': [('base', '头发 · 基础色'), ('volume', '整体体积 · 纵向与横向渐变'),
               ('local', '发束局部 · 凹凸与梢部深浅'), ('reflection', '材质 · 冷暖反光与亮带'),
               ('contour', '边缘与纹理 · 线色'), ('comparison', '外来投影与独立高光 · 对照色')],
}


if __name__ == '__main__':
    core = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'extract_palette.py'))
    core['main'](defaults=DEFAULTS)
