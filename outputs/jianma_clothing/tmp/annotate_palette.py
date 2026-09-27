import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / '4.衣装色盘' / 'palette.json'
data = json.loads(path.read_text(encoding='utf-8'))
sid = {s['name']: s['id'] for s in data['samples']}

def ids(*names):
    return [sid[name] for name in names]

data['material_notes'] = [
    dict(part_id='inner_bodice,collar_back,collar_front_left,collar_front_right', material='不透明暖白内搭与挺立领',
         source_sample_ids=ids('内搭暖白中面','内搭冷蓝折面','立领亮面','立领内面'),
         spatial_layers='胸衣正面留纵向宽暖白亮面；胸侧细纵褶用冷蓝灰。领前外面更挺亮，内折窄冷蓝；领后环不可见，仅沿同材质延续。',
         transparency='不透明；颈侧灰色只描述折面，不应将皮肤或头发投影染进整片底色。'),
    dict(part_id='mantle_back,mantle_front_left,mantle_front_right', material='白绸肩披与银白卷纹',
         source_sample_ids=ids('肩披白色宽面','肩披体积蓝灰','肩披银白卷纹','肩披反折暗面'),
         spatial_layers='肩顶和外缘保持宽白亮面；胸侧回折为短窄蓝灰暗面；细银白卷纹作为不透明凸起线单独叠上。后片只可保守继承前片材质。',
         transparency='不透明；外来发束投影应独立于肩披固有折面。'),
    dict(part_id='opaque_upper_left,opaque_upper_right,opaque_lower_left,opaque_lower_right', material='白色不透明绣纹袖',
         source_sample_ids=ids('绣袖白底','绣袖浅蓝内折','袖上浅银纹'),
         spatial_layers='上袖和下袖共用白底；顺肘腕形成弧形浅蓝折面，袖口更挺。卷纹/包边为细白银线，不用大片蓝灰代替。',
         transparency='袖身不透明；垂纱覆盖处另行合成，不把其蓝色混合像素当袖布本色。'),
    dict(part_id='coat_back,coat_front_left,coat_front_right', material='白色敞襟厚绸',
         source_sample_ids=ids('外衣前襟暖白','外衣纵向冷折','外衣深缝投影','外衣薄边高光'),
         spatial_layers='双前襟由胸至下摆保持纵向宽亮面、窄冷折和细银白外缘。右襟深缝投影属于前襟压内搭/裙层的外来阴影；背片材料承接前襟，但受光不能从正面实测复制。',
         transparency='不透明；外来投影与绸布本体颜色分层。'),
    dict(part_id='waist_back,waist_front,waist_knot,waist_tails', material='蓝白织带与蓝缎结',
         source_sample_ids=ids('蓝腰带中面','腰带暗蓝窄条','腰带白色交织','腰结湖蓝面','腰尾纵亮面','腰尾内折深蓝'),
         spatial_layers='前腰水平蓝白叠条与暗蓝窄分界，结翼横向反光；垂带沿纵向形成亮中面和深内折。隐藏后环和尾根保留完整底形，后环色仅由前段同材质推断。',
         transparency='织带与结为不透明，勿以胸饰或长坠阴影替代带色。'),
    dict(part_id='skirt_inner_front,skirt_inner_back', material='轻白内裙',
         source_sample_ids=ids('白内裙中面','白内裙阴褶'),
         spatial_layers='正面可见处为细长纵褶的暖白中面与蓝灰窄阴褶；被蓝裙遮住的中心及后摆按完整白布推断。',
         transparency='不透明。'),
    dict(part_id='skirt_blue_front,skirt_blue_back', material='蓝色轻绸中裙',
         source_sample_ids=ids('蓝中裙亮蓝面','蓝中裙浅蓝边','蓝中裙冷暗褶','蓝裙翻起底面'),
         spatial_layers='正面由腰至摆有长纵亮蓝面和窄暗蓝折面，侧缘有浅蓝透光边；翻起下摆另用横向冷底面。背幅不可见，底色与材质承接前幅，阴影方向需重估。',
         transparency='视觉有透光感，但未能从叠层像素唯一求出实体 alpha；先作为轻绸处理，后续穿戴合成校准。'),
    dict(part_id='skirt_outer_back,skirt_outer_left,skirt_outer_right', material='白色层叠外裙',
         source_sample_ids=ids('外裙白色正面','外裙冷蓝折面','外裙深层褶影','外裙底缘亮边'),
         spatial_layers='左右开口外裙的正面为宽白面；大卷边有横向/纵向交替的蓝灰内折；层间暗处是局部遮挡投影；波浪底缘为窄亮边。后摆宽度和折向无实测。',
         transparency='主体不透明；薄边可以稍淡，但不得把白底整体降透明度。'),
    dict(part_id='gauze_sleeve_left,gauze_sleeve_right', material='浅蓝半透明垂袖',
         source_sample_ids=ids('纱袖覆白合成','纱袖覆蓝合成','纱袖暗折合成','纱袖高亮合成','纱袖白色滚边','纱袖刺绣细线'),
         spatial_layers='纱面单层浅蓝、折返叠层较深；长尾既有纵向透光面也有斜向和横向折面。白色滚边与卷纹作为独立不透明细线，局部反光窄亮。',
         transparency='四个纱面色样均是与绣袖、内外裙、身体或白背景混合后的屏幕色，不是可再降低 alpha 的材质本色。后侧根部不可见；纱底色与 alpha 仅列于 inferred_colors，须在真实穿戴叠层上校准。'),
    dict(part_id='chest_ornament', material='蓝釉银饰与青蓝宝石',
         source_sample_ids=ids('胸饰蓝釉面','胸饰蓝釉暗面','胸饰银色亮边','胸饰中央宝石'),
         spatial_layers='蓝釉宽面与深蓝小折面分开，凸银边窄亮，中央菱石有青蓝内光和深色包镶；金属/宝石高光保持小面积。',
         transparency='宝石可有内部透亮感；不要用透明纱 alpha 处理金属。'),
    dict(part_id='pendant_anchor,pendant_chain,pendant_beads,pendant_tassel', material='前坠银链、蓝珠与白丝穗',
         source_sample_ids=ids('长坠银链','长坠蓝珠暗面','长坠蓝珠亮面','长坠蓝色结头','坠穗冷白丝线'),
         spatial_layers='细银链亮暗交替；三颗蓝珠分别有冷暗包边和小片亮面；下接蓝结、冷白长丝线与窄紫蓝阴线。链与穗悬在蓝裙前，投影另置。',
         transparency='硬珠与链不透明；白穗为独立丝线。'),
    dict(part_id='foot_chain_left,foot_chain_right', material='现有双足链',
         source_sample_ids=ids('足链银珠','足链蓝石'),
         spatial_layers='脚背银链珠为极细灰蓝点线，踝前蓝石为小面积青蓝亮点；左右对称时保留各自投影。',
         transparency='足链色样受皮肤暖色反射影响；不要用皮肤色做银链固有色。'),
]

data['inferred_colors'] = [
    dict(part_id='gauze_sleeve_left,gauze_sleeve_right', hex='#76B0E8', alpha_range=[0.28,0.48],
         source_sample_ids=ids('纱袖覆白合成','纱袖高亮合成','纱袖覆蓝合成'),
         usage='单层浅蓝纱的候选材质色；先在白背景、白绣袖及蓝裙上分别试合成。',
         basis='原图纱面像素包含底层颜色；由浅蓝合成像素与白背景的差异保守估计，无法唯一反推色值和透明度。'),
    dict(part_id='gauze_sleeve_left,gauze_sleeve_right', hex='#6D9FD8', alpha_range=[0.42,0.65],
         source_sample_ids=ids('纱袖暗折合成','纱袖覆蓝合成'),
         usage='折返/叠层候选冷蓝色；只在真实双层处使用，避免同一区域重复透明带。',
         basis='右袖深蓝折面混入背后的裙布与前层纱，无法从单张合成参考求得独立纱层 alpha。'),
    dict(part_id='coat_back,mantle_back,skirt_inner_back,skirt_outer_back', hex='#E5EDF8', alpha_range=[1.0,1.0],
         source_sample_ids=ids('肩披白色宽面','外衣前襟暖白','白内裙中面','外裙白色正面'),
         usage='不可见白色后片的冷向中间值参考；具体后片依所属材料分别调整。',
         basis='后片没有原图实测；仅继承相连前片的白绸材料，背面光照和褶向需后续校准。'),
]

path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(len(data['samples']),len(data['material_notes']),len(data['inferred_colors']))
