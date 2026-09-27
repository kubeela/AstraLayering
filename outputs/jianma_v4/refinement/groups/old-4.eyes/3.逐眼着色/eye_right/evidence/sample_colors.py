from PIL import Image
im=Image.open('references/base-subject.png').convert('RGB')
pts={'sclera_outer':(410,200),'sclera_inner':(427,200),'sclera_inner_lower':(427,202),'iris_left_mid':(413,199),'iris_middle_lower':(418,201),'iris_lower':(418,202),'iris_lower_edge':(418,203),'iris_right':(424,199),'iris_outer_left':(412,198),'pupil':(418,199),'iris_above_pupil':(419,195),'upper_liner':(414,194),'upper_liner_right':(425,197),'lower_outer_liner':(408,202),'lower_lid':(416,204),'lid_fold':(418,192),'above_lid_skin':(418,191),'inner_skin':(432,199),'highlight':(419,197)}
for n,(x,y) in pts.items():
 c=im.getpixel((x,y));print(n,(x,y),'#%02X%02X%02X'%c)
