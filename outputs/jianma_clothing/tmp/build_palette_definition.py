import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
items = []

def add(name, role, part_id, region, usage, basis, x, y, method='point', radius=None):
    entry = dict(name=name, role=role, part_id=part_id, region=region,
                 usage=usage, basis=basis, x=x, y=y, method=method)
    if radius is not None:
        entry['radius'] = radius
    items.append(entry)

# All coordinates are on the 941 x 1672 original reference. A sampled dark
# pixel is described by its visible job, never silently promoted to base dye.
add('内搭暖白中面','white_silk','inner_bodice','胸衣中央', '不透明底布中面，纵向留宽亮区','实测胸衣非金属、非外衣区域',435,490,'median',2)
add('内搭冷蓝折面','white_silk','inner_bodice','胸衣右侧纵褶','胸腰窄纵折暗面','实测袖披与外襟之间可见内搭',420,472)
add('立领亮面','white_silk','collar_front_left,collar_front_right','颈前立领','挺布迎光宽面','实测正面立领；左右可共用',414,288,'median',2)
add('立领内面','white_silk','collar_front_left,collar_front_right,collar_back','颈侧内折','立领内侧冷蓝，背段依据前领推断','实测前领内折，背领不可见',392,309)
add('肩披白色宽面','white_silk','mantle_front_left,mantle_front_right,mantle_back','肩披外缘','肩顶宽白面与背片基准','实测左肩；背面共享材质属推断',329,477,'median',3)
add('肩披体积蓝灰','white_silk','mantle_front_left,mantle_front_right','左肩披折面','卷纹旁的局部冷阴，向边缘软化','实测左肩披，不作整片基色',330,340)
add('肩披银白卷纹','trim','mantle_front_left,mantle_front_right,mantle_back','左肩纹样','细窄凸起绣纹；背面延续需保守','实测前片纹样亮段',326,371)
add('肩披反折暗面','white_silk','mantle_front_left,mantle_front_right','胸侧肩披折回','短窄反折灰蓝，勿铺满肩披','实测胸侧转折',355,404)
add('绣袖白底','white_silk','opaque_upper_left,opaque_upper_right,opaque_lower_left,opaque_lower_right','左前臂袖身','不透明绣布中面','实测左袖，左右同材料',266,619,'median',3)
add('绣袖浅蓝内折','white_silk','opaque_lower_left,opaque_lower_right','左肘下袖','顺手臂弧线的褶阴','实测左下袖折面',289,683)
add('袖上浅银纹','trim','opaque_upper_left,opaque_upper_right,opaque_lower_left,opaque_lower_right','左袖卷纹','细线绣纹与袖口包边，宽约数像素','实测左袖亮纹',205,700)
add('外衣前襟暖白','white_silk','coat_front_left,coat_front_right,coat_back','左前襟胸段','厚绸宽亮面，纵向延续','实测左前襟；背片仅材质参照',380,493,'median',2)
add('外衣纵向冷折','white_silk','coat_front_left,coat_front_right','左前襟腰下','沿襟边长纵折，从胸腰向下渐宽','实测前襟折面',362,640)
add('外衣深缝投影','cast_shadow','coat_front_left,coat_front_right','右襟内侧','外襟压内搭/裙层的窄投影，独立层','实测交叠阴影，非布料本色',545,570)
add('外衣薄边高光','trim','coat_front_left,coat_front_right','左襟外缘','窄银白轮廓，沿长边不等宽','实测前襟亮缘',370,570)
add('蓝腰带中面','blue_fabric','waist_front,waist_back','前腰上蓝条','织带正面湖蓝，水平环腰','实测前段；背段同材质推断',394,528,'median',2)
add('腰带暗蓝窄条','blue_fabric','waist_front,waist_back','前腰上条下沿','带层分界暗蓝细横线','实测前腰下沿',445,527)
add('腰带白色交织','white_silk','waist_front,waist_back','前腰白条','白色交织和折光，水平带','实测前腰左侧',399,546,'median',2)
add('腰结湖蓝面','blue_fabric','waist_knot','腰结左折翼','软缎亮中面，结翼横向反光','实测前腰结',438,548)
add('腰尾纵亮面','blue_fabric','waist_tails','左垂带','垂带纵向亮面，边缘窄高光','实测垂带上段',430,620)
add('腰尾内折深蓝','blue_fabric','waist_tails','右垂带内折','纵向窄暗折，不能当整带基色','实测右尾折面',454,600)
add('白内裙中面','white_silk','skirt_inner_front,skirt_inner_back','蓝裙旁白裙内层','轻白布纵褶中面；后片同材质推断','实测正面下裙',328,1304,'median',3)
add('白内裙阴褶','white_silk','skirt_inner_front,skirt_inner_back','蓝裙左侧内层','窄蓝灰纵褶，向下摆过渡','实测白内裙',336,1170)
add('蓝中裙亮蓝面','blue_fabric','skirt_blue_front,skirt_blue_back','前中裙左面','长纵向透光亮带，非透明纱袖','实测蓝中裙；背片同材质推断',390,1200,'median',2)
add('蓝中裙浅蓝边','blue_fabric','skirt_blue_front','中裙右边缘','下摆与右缘窄亮蓝反光','实测右边缘',475,1080)
add('蓝中裙冷暗褶','blue_fabric','skirt_blue_front','中裙中右纵褶','由腰至下摆不等宽暗蓝折面','实测蓝中裙暗折',461,1160)
add('蓝裙翻起底面','blue_fabric','skirt_blue_front','中裙下摆翻折','短横向偏冷底面，区别于长纵褶','实测下摆翻折',441,1450)
add('外裙白色正面','white_silk','skirt_outer_left,skirt_outer_right,skirt_outer_back','左外裙前摆','大面积白绸正面，纵向柔亮','实测前摆；背摆同材质推断',285,1100,'median',2)
add('外裙冷蓝折面','white_silk','skirt_outer_left,skirt_outer_right','左外裙卷边内面','荷叶翻卷的宽蓝灰面，横纵交替','实测左外裙翻折',320,1090)
add('外裙深层褶影','white_silk','skirt_outer_left,skirt_outer_right','左外裙层间','两层白裙相压的局部投影，单独绘制','实测层间阴影，非固有白布',278,930)
add('外裙底缘亮边','trim','skirt_outer_left,skirt_outer_right','左前摆下缘','沿波浪下摆的细窄白亮边','实测前摆边线',250,1450)
add('纱袖覆白合成','gauze_composite','gauze_sleeve_left,gauze_sleeve_right','左前臂外侧','透明纱盖白绣袖后的可见混合色','实测合成像素，不是纱料本色',225,720,'median',2)
add('纱袖覆蓝合成','gauze_composite','gauze_sleeve_left,gauze_sleeve_right','左袖宽垂面','透明纱叠裙/暗面后的可见混合色','实测合成像素；底层未知',155,1220,'median',2)
add('纱袖暗折合成','gauze_composite','gauze_sleeve_left,gauze_sleeve_right','右袖下段重叠','纱折叠层的深蓝可见合成色','实测多层合成，勿重复降低 alpha',650,1090,'median',2)
add('纱袖高亮合成','gauze_composite','gauze_sleeve_left,gauze_sleeve_right','左袖边近背景','白背景上薄纱亮带的合成对照','实测合成像素，不是本色',202,1070)
add('纱袖白色滚边','trim','gauze_sleeve_left,gauze_sleeve_right','左垂袖外卷边','独立不透明细白边，随曲线变化宽度','实测亮边，区别于纱面',164,959)
add('纱袖刺绣细线','trim','gauze_sleeve_left,gauze_sleeve_right','左垂袖卷纹','不透明白银细绣纹，局部可高亮','实测左垂袖卷纹',211,708)
add('胸饰蓝釉面','jewelry','chest_ornament','胸饰双翼蓝面','蓝釉/珐琅的宽中面，左右对称','实测胸饰上翼',462,388)
add('胸饰蓝釉暗面','jewelry','chest_ornament','胸饰中心下翼','金属边内冷蓝暗折','实测胸饰局部暗面',430,405)
add('胸饰银色亮边','jewelry','chest_ornament','胸饰左翼外缘','凸银轮廓极窄高光','实测胸饰银边',405,387)
add('胸饰中央宝石','jewelry','chest_ornament','胸饰中心菱石','亮青蓝透亮面，另配暗蓝边','实测宝石亮区',445,406)
add('长坠银链','jewelry','pendant_chain,pendant_anchor','裙前垂链','细窄灰银链，亮暗交替','实测前链',439,878)
add('长坠蓝珠暗面','jewelry','pendant_beads','中央串珠上珠','硬质蓝珠冷暗边，配小片亮反光','实测蓝珠暗面',438,921)
add('长坠蓝珠亮面','jewelry','pendant_beads','中央串珠中珠','珠面亮蓝点，非纱布透光','实测蓝珠亮面',434,965)
add('长坠蓝色结头','jewelry','pendant_tassel','坠穗上蓝结','蓝釉/织结过渡，位置在长穗之上','实测坠穗蓝结',433,1010)
add('坠穗冷白丝线','trim','pendant_tassel','中央长坠穗','细密纵向冷白丝线，紫蓝窄暗线','实测坠穗白线',431,1140)
add('足链银珠','jewelry','foot_chain_left,foot_chain_right','左足链脚背','小银珠灰蓝体积，沿脚背链分布','实测左足链；邻近肤色可见反射',400,1586)
add('足链蓝石','jewelry','foot_chain_left,foot_chain_right','右足链踝前','小蓝宝石亮点，银边与皮肤投影分开','实测右足链',480,1543)

payload = dict(title='剑麻衣装色盘｜参考图实测与透明纱推断',
               region='完整衣装正面',
               footer='透明纱区为可见合成色；推断本色与透明度见 JSON。',
               groups={
                   'white_silk':'白绸、内搭、披肩、外裙',
                   'blue_fabric':'腰带与蓝色中裙',
                   'gauze_composite':'透明垂袖：实测可见合成色',
                   'trim':'绣纹、包边与坠穗',
                   'jewelry':'胸饰、长坠与足链',
                   'cast_shadow':'外来投影',
               }, samples=items)
(root/'tmp'/'palette_definition.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(len(items))
