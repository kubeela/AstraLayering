from PIL import Image, ImageOps

im = ImageOps.exif_transpose(Image.open(r'D:\Resources\workspace\AstraLayering\outputs\jianma_v4\references\base-subject.png')).convert('RGB')
points = {
 'halo': [(442,12),(442,15),(442,18),(408,17),(477,18)],
 'branchR': [(336,103),(343,112),(352,109),(375,59),(377,77),(383,102)],
 'branchL': [(550,103),(543,111),(536,108),(510,59),(507,77),(500,101)],
 'crown': [(443,69),(443,75),(443,83),(429,85),(457,85),(420,81),(468,81)],
 'forehead': [(443,143),(443,150),(443,158),(443,171)],
 'streamerR': [(330,130),(329,145),(326,184),(321,235),(310,310),(294,430),(254,600)],
 'streamerL': [(556,131),(556,145),(558,184),(564,235),(580,310),(612,430),(660,600)],
 'earR': [(394,228),(395,239),(395,248),(395,261)],
 'earL': [(492,228),(493,239),(493,248),(494,280),(495,307)],
 'footR': [(410,1518),(410,1525),(410,1550),(411,1574),(392,1474)],
 'footL': [(478,1518),(478,1525),(478,1550),(478,1574),(497,1474)],
}
for group, coords in points.items():
 print(group, ' '.join(f'{x},{y}:#{im.getpixel((x,y))[0]:02X}{im.getpixel((x,y))[1]:02X}{im.getpixel((x,y))[2]:02X}' for x,y in coords))
for label, x, ys in [('halo',442,range(10,19)),('footR',410,range(1498,1522,2)),('footL',478,range(1498,1522,2)),('ribbonR',326,range(165,211,5)),('ribbonL',558,range(165,211,5))]:
 print(label, ' '.join(f'{y}:#{im.getpixel((x,y))[0]:02X}{im.getpixel((x,y))[1]:02X}{im.getpixel((x,y))[2]:02X}' for y in ys))
