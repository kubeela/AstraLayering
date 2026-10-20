export function parseKraLayers(xml, width, height) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const image = doc.querySelector("IMAGE");
  if (doc.querySelector("parsererror") || !image)
    throw Error("KRA 图层目录损坏");
  if (
    Number(image.getAttribute("width")) !== width ||
    Number(image.getAttribute("height")) !== height
  )
    throw Error("KRA 合成图尺寸与画布不一致，请重新保存");
  const result = [];
  function walk(parent, depth = 0, parentVisible = true) {
    for (const layer of parent?.children || []) {
      if (layer.localName !== "layer") continue;
      const visible = layer.getAttribute("visible") !== "0";
      result.push({
        name: layer.getAttribute("name") || "未命名",
        depth,
        visible,
        effectiveVisible: parentVisible && visible,
        type: layer.getAttribute("nodetype"),
        mask: (layer.getAttribute("nodetype") || "").endsWith("mask"),
        group: layer.getAttribute("nodetype") === "grouplayer",
        opacity: Number(layer.getAttribute("opacity") ?? 255) / 255,
      });
      walk(
        [...layer.children].find((n) => n.localName === "layers"),
        depth + 1,
        parentVisible && visible,
      );
    }
  }
  walk([...image.children].find((n) => n.localName === "layers"));
  return result;
}
export async function openDocument(file) {
  if (file.size > 512 * 1024 * 1024)
    throw Error("当前浏览器预览支持 512 MB 以内的文件");
  const bytes = await file.arrayBuffer();
  const worker = new Worker(new URL("./document-worker.js", import.meta.url));
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(Error("文件解析超时，请检查文件或在绘图软件中重新保存"));
    }, 120_000);
    const finish = (fn, value) => {
      clearTimeout(timer);
      worker.terminate();
      fn(value);
    };
    worker.onmessage = ({ data }) =>
      data.error ? finish(reject, Error(data.error)) : finish(resolve, data);
    worker.onerror = (e) => finish(reject, Error(e.message || "文件解析失败"));
    worker.postMessage({ bytes, name: file.name }, [bytes]);
  });
  return {
    ...result,
    name: file.name,
    file,
    layers: result.xml
      ? parseKraLayers(result.xml, result.width, result.height)
      : result.layers,
  };
}
