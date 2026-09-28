# Expression Preview

离线控制台入口：[expression-preview.html](expression-preview.html)。它直接嵌入 [svg-preview.html](svg-preview.html) 的画布，复用缩放、平移、图层查看和图像 B 的左右/叠加/滑动对比。

## 使用

1. 用现代浏览器直接打开 HTML，无需安装 Python、启动服务或联网；保留 `loading` 文件夹中的配套 HTML 和 JS 文件。
2. 选择已制作好的角色 **SVG** 和对应的 **rig 控制 JSON**，顺序不限，也可将两个文件一起拖入控制台；浏览器不能根据 JSON 内的本地路径自动读取相邻文件，所以文件需要主动选择。
3. 在右侧启用表情、调整强度和独立参数；手动参数会覆盖表情配方，点击「清除手动覆盖」恢复配方控制。
4. 动画可单独播放，也可随表情启动；运行中的实例提供暂停、继续、停止、速度与单周期定位，顶部「暂停时间」冻结全部动画和淡入淡出。
5. 「恢复默认」清除表情、动画和手动值，同时恢复图层查看状态；从普通 SVG 预览器点击「表情」可带入当前 SVG。

「体验样例」无需另选文件，演示眼开合、一维/二维形变、眼珠变体、星星循环、流泪和叹号；它是几何协议样例，不是人物完成效果。已有静态角色可以单独打开，但只有制作了控制 JSON 引用的部件和关键形后才有可调表情。

## 输入与导出

控制定义遵循 [expression.schema.json](../expressions/expression.schema.json) 的 `0.1.0` 版本；加载时检查 schema、真实 SVG id、形变拓扑/网格、默认轮廓、动画轨道和附着关系。浏览器使用该 schema 的本地生成副本，没有在线依赖。

- **当前控制**：导出 `document_type: command` 的可重放指令，恢复当前启用的表情、独立动画和手动值；动画从头开始，不是保存视频或时间轴历史。
- **能力目录**：供 LLM 读取公开参数、表情、动画及约束，再生成控制指令。
- **当前帧 SVG**：保存当前姿态的静态 SVG；默认轮廓可能已变化，不能拿该帧直接替换原角色再沿用要求原始默认形的 JSON。
- 「程序控制与导出」可粘贴并执行标准 command JSON；错误会显示原因，整批指令不会部分应用。

图像 B、缩放和图层隐藏是查看工具，不写入控制 JSON；导出的当前帧包含当前图层查看状态。输入文件不会被覆盖。

## 本地程序接口

控制台页面提供异步接口；宿主无需操作 DOM 滑杆：

```javascript
await expressionPreview.load({ svg: svgText, name: 'character.svg', rig: controlsObject });
const capabilities = await expressionPreview.getCapabilities();
await expressionPreview.command({
  schema_version: '0.1.0', document_type: 'command', character_id: 'contract_demo',
  actions: [{ op: 'apply_expression', expression: 'surprised', instance_id: 'reaction', weight: 0.8 }]
});
const state = await expressionPreview.getState();
```

API 只接受数据，不执行 JSON 中的代码。控制台与内嵌预览器使用 `postMessage` 通信，即使 `file://` 下文件彼此不能读取 DOM 也能联动；消息核对实际父窗口或已打开子窗口。SVG 继续放在禁用脚本、限制网络资源的沙盒中。

## 运行含义与边界

- 参数从默认值重新求解，支持稀疏表情混合、手动覆盖和动画叠加；一维路径线性插值、二维完整网格双线性插值，曲线支持 linear/smoothstep/step。
- 路径必须提前归一化为显式绝对 `M/L/C/Q/Z`；变换和附着控制使用独立、初始无 transform 的 `g` 包装层，同层变换必须使用同一中心。
- 变体冲突、多个 replace 轨道争用同一参数或不满足兼容约束会拒绝；播放中组合变成不合法时保留上一有效画面并暂停，提示具体原因。
- 相位的权重控制透明度，不缩短泪滴运动距离；连续锚点在形变后采样，出生锚点每周期采样一次并保存在附着层父空间。一个出生层不能同时共享多个相同动画时钟实例，多滴需要实际独立素材/绑定。
- `finish_cycle` 撤销保留所属表情必要的显现参数，待当前周期和退出完成再释放；再次调用同一实例更新权重/速度，不重启动画。单次动画到达结尾后移除贡献，其末段渐隐应写进轨道。
- 定位在当前周期内进行，使用该周期保存的出生锚点；不重建未记录的历史头部运动。标签页进入后台暂停计时，返回后从原处继续。
- 主画布逐帧使用矢量，运行时禁用拖动的静态缓存，避免动画拖动时显示旧帧；导航缩略图是最近一次控制操作的快照。

这是本项目 SVG 协议的预览运行时，不是 Cubism 文件导入器，也不会自动为静态 SVG 推断或制作表情素材；材质随形变是否连续、替换眼型是否适配泪液、隐藏重置是否真的无跳变，仍需用实际角色验收。

## 维护与测试

`expression-runtime.js` 负责校验、参数合成和绘制，`expression-preview.js` 负责控制台；`svg-preview.html` 只接入运行时及消息入口。

在仓库根目录，修改协议或样例后运行 `python agent-tools/expressions/build_preview_assets.py`，更新 `expression-schema.js` 和 `expression-demo.js`；这两个文件是离线所需的生成资源，不手工修改。浏览器内的 schema 解释器覆盖本协议使用的关键字，不作为通用 JSON Schema 库。

安装 Playwright 后可运行以下浏览器测试（不需要启动 HTTP 服务）：

```text
node agent-tools/tests/test_expression_preview.cjs /path/to/chrome
```

2026-09-27 已在 Windows Chrome 的离线 `file://` 环境跑通 11 组运行行为测试，以及真实文件选择、滑杆、表情、暂停/复位、非法定义保留旧状态、图像对比/图层、从 SVG 预览器带入、完整 Jianma 静态 SVG 加载和窄屏布局；测试截图写入系统临时目录 `astra-expression-preview-tests`。

这验证控制台与协议样例的运行行为，不代表 Jianma 已完成表情制作，也不替代具体人物的动态视觉验收。
