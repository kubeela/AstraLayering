import json
from pathlib import Path

path = Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_v4\refinement\groups\physics_details\4.部件色盘\palette.json')
data = json.loads(path.read_text(encoding='utf-8'))
data['inferred_colors'] = [
    {
        'part_id': ['streamer_right', 'streamer_left'],
        'region': '两条半透明软带的原生蓝色与透明度',
        'source_sample_ids': ['20', '21', '22', '23', '24'],
        'usage': '这些色样仅是白底前的合成观测色。着色时用偏蓝的薄带材质层加独立透明度和柔光，沿带身、翻面、边缘分别调节；背后换成头发或肤色时须重新合成。alpha 未能从单张原图唯一反推。',
        'basis': '原图带体亮度随位置、背景与重叠变化；白底观测像素含背景贡献，不能作为不透明材质本色。',
        'color_origin': 'inferred_transparency',
    },
    {
        'part_id': ['streamer_right', 'streamer_left'],
        'region': '软带翻折背面及被发束遮挡段',
        'source_sample_ids': ['20', '21', '22', '23'],
        'usage': '翻面先沿用本侧软带蓝相，局部略降亮度并提高层叠密度；软硬交界在金属带头下方保持清楚。',
        'basis': '线稿衔接记录中 *_ribbon_reverse/front 和隐藏上段；原图只直接呈现部分正面，背面是结构推断。',
        'color_origin': 'inferred_hidden_surface',
    },
    {
        'part_id': ['headdress_halo', 'headdress_branch_left', 'headdress_branch_right', 'headdress_center'],
        'region': '头环端部、枝角根座、冠石侧背面',
        'source_sample_ids': ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '12'],
        'usage': '隐藏硬件背面延续正面银蓝材质；侧面更窄、更暗，外露反光只放在转折与边缘；不取线稿中性色作原图色。',
        'basis': '同件可见正面材料与线稿记载的完整背形、薄侧缘、根座、插接。',
        'color_origin': 'inferred_hidden_surface',
    },
    {
        'part_id': ['forehead_jewel', 'earring_left', 'earring_right'],
        'region': '额饰后座、耳后钩与宝石背切面',
        'source_sample_ids': ['14', '15', '16', '25', '26', '27', '28', '29'],
        'usage': '后座与耳钩延续冷银细线，宝石侧背面沿对应正面蓝相压暗；保持宝石硬边，隐藏链段不取肤色/发色。',
        'basis': '原图可见石体与链钩，加上已审线稿中记录的后座、后钩与完整石背。',
        'color_origin': 'inferred_hidden_surface',
    },
    {
        'part_id': ['foot_chain_left', 'foot_chain_right'],
        'region': '踝后完整链环与足背后链',
        'source_sample_ids': ['30', '32', '33', '34', '35'],
        'usage': '后段沿用前链冷银蓝，但受踝遮挡时减亮；蓝珠背面跟随本脚正面蓝相压暗，左右各自接续，不强制镜像。',
        'basis': '可见前链珠色与线稿衔接记录中的完整隐藏后环、足背回链。',
        'color_origin': 'inferred_hidden_surface',
    },
    {
        'part_id': 'forehead_jewel',
        'region': '小坠投到额头上的旧承影接口',
        'source_sample_ids': [],
        'hex': '#956970',
        'usage': '仅用于接续 SVG 中 fx_forehead_jewel_on_face / face6_jewel_shade 的原投影色；既有渐变 stop-opacity 为 0.08、0.4、0.4、0，且另有软化。它不是原图实测额饰材质色，也不替代最终承影核对。',
        'basis': '已审第3步 character.svg 的 face6_jewel_shade 渐变及 fx_forehead_jewel_editable_path 引用。',
        'color_origin': 'upstream_svg_interface',
    },
]
data['scope'] = {
    'group_id': 'physics_details',
    'part_ids': ['headdress_halo', 'headdress_branch_left', 'headdress_branch_right', 'headdress_center', 'forehead_jewel', 'streamer_left', 'streamer_right', 'earring_left', 'earring_right', 'foot_chain_left', 'foot_chain_right'],
    'line_art_sha256': '0b2e53db3fe8542714ef0443760e6c85a55f7ac2e284a166fd1cb15aa8a5f6aa',
}
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(path, len(data['samples']), len(data['inferred_colors']))
