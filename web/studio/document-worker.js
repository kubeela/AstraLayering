// Decoding stays off the UI thread. Original document bytes are retained by the
// caller; only its saved composite and layer metadata enter the lighting stage.
importScripts("../vendor/fflate.js", "../vendor/ag-psd.js");
agPsd.initializeCanvas(
  () => {
    throw Error("此 PSD 需要兼容模式合成图");
  },
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  }),
);
const text = new TextDecoder();
function dimensions(width, height) {
  if (!width || !height || width * height > 64_000_000)
    throw Error("画布超过 6400 万像素，未缩小原图");
}
function iccProfile(bytes) {
  // PSD image resource 1039. Preserve it in PNG iCCP so the browser performs
  // profile conversion rather than treating Adobe RGB channel values as sRGB.
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 26;
  p += 4 + v.getUint32(p);
  const end = p + 4 + v.getUint32(p);
  p += 4;
  while (p + 12 <= end) {
    const id = v.getUint16(p + 4),
      n = bytes[p + 6];
    p += 6 + Math.ceil((n + 1) / 2) * 2;
    const length = v.getUint32(p);
    p += 4;
    if (p + length > end) throw Error("PSD 色彩资源损坏");
    if (id === 1039) return bytes.slice(p, p + length);
    p += length + (length % 2);
  }
}
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const b = new Uint8Array(data.length + 12),
    v = new DataView(b.buffer);
  v.setUint32(0, data.length);
  b.set(new TextEncoder().encode(type), 4);
  b.set(data, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < b.length - 4; i++)
    crc = crcTable[(crc ^ b[i]) & 255] ^ (crc >>> 8);
  v.setUint32(b.length - 4, (crc ^ 0xffffffff) >>> 0);
  return b;
}
function png(image, profile) {
  const { width, height, data } = image,
    head = new Uint8Array(13),
    v = new DataView(head.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  head[8] = 8;
  head[9] = 6;
  const rows = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    rows.set(
      data.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    );
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", head),
  ];
  if (profile) {
    const compressed = fflate.zlibSync(profile),
      b = new Uint8Array(compressed.length + 5);
    b.set([73, 67, 67, 0, 0]);
    b.set(compressed, 5);
    parts.push(chunk("iCCP", b));
  } else parts.push(chunk("sRGB", new Uint8Array([0])));
  parts.push(
    chunk("IDAT", fflate.zlibSync(rows)),
    chunk("IEND", new Uint8Array()),
  );
  return new Blob(parts, { type: "image/png" });
}
self.onmessage = ({ data: { bytes: buffer, name } }) => {
  try {
    const bytes = new Uint8Array(buffer),
      v = new DataView(buffer);
    if (/\.kra$/i.test(name)) {
      const files = fflate.unzipSync(bytes, {
        filter: (f) => {
          const selected =
            f.name === "mergedimage.png" || f.name === "maindoc.xml";
          if (
            selected &&
            f.originalSize > (f.name.endsWith(".xml") ? 4_000_000 : 280_000_000)
          )
            throw Error("KRA 合成图或目录过大");
          return selected;
        },
      });
      if (!files["mergedimage.png"] || !files["maindoc.xml"])
        throw Error("KRA 缺少已保存的合成图或图层目录");
      const merged = files["mergedimage.png"],
        m = new DataView(merged.buffer, merged.byteOffset, merged.byteLength);
      dimensions(m.getUint32(16), m.getUint32(20));
      self.postMessage({
        color: new Blob([merged], { type: "image/png" }),
        xml: text.decode(files["maindoc.xml"]),
        width: m.getUint32(16),
        height: m.getUint32(20),
      });
    } else if (/\.psd$/i.test(name)) {
      if (text.decode(bytes.subarray(0, 4)) !== "8BPS" || v.getUint16(4) !== 1)
        throw Error("请选择有效的 PSD 文件");
      dimensions(v.getUint32(18), v.getUint32(14));
      if (v.getUint16(22) !== 8 || ![1, 3].includes(v.getUint16(24)))
        throw Error("当前支持 8 位 RGB／灰度 PSD；请先在绘图软件中转换后另存");
      const doc = agPsd.readPsd(bytes, {
        skipLayerImageData: true,
        skipThumbnail: true,
        skipLinkedFilesData: true,
        useImageData: true,
      });
      if (!doc.imageData)
        throw Error("PSD 缺少合成图，请开启“最大兼容性”后保存");
      const layers = [];
      function walk(items, depth = 0, parentVisible = true) {
        for (const item of [...(items || [])].reverse()) {
          const visible = parentVisible && !item.hidden;
          layers.push({
            name: item.name || "未命名",
            depth,
            visible,
            group: !!item.children,
            opacity: item.opacity ?? 1,
          });
          walk(item.children, depth + 1, visible);
        }
      }
      walk(doc.children);
      self.postMessage({
        color: png(doc.imageData, iccProfile(bytes)),
        layers,
        width: doc.width,
        height: doc.height,
      });
    } else throw Error("请选择 KRA 或 PSD");
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
