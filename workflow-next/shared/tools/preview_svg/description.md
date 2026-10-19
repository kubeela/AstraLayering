渲染本次运行内的独立 SVG 并返回图片。mode=svg 为白底独显，blend 为与绑定参考图半透明混合，edge 为红色边缘叠加；crop=[x,y,width,height] 使用原图像素坐标，scale=1..8。子组同时返回与绑定父 SVG 的范围检查结果，检查固定使用四倍采样，越界坐标和面积折算到原图。输入不修改。

先以 blend 查看整图，再用 crop 与 scale 分区放大，以 blend 和 edge 对照参考。crop 的四个数依次为 x、y、width、height；scale 是缩放倍数。mode=svg 可检查独显。子组可先查看已提供的父组完成稿。补全检查需要 sourceSvg 和 outputDraft；修改后重新查看当前草稿。
