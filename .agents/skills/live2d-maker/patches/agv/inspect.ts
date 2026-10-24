// Resolve Go function boundaries from the executable itself, rather than guess
// a byte offset when a new AGV release moves its transport implementation.
type Section = { address: number; offset: number; size: number; type: number };
export type AgvLayout = { headerOffset: number; autoUpdateDisabledByTrue: boolean };
const original = Buffer.from('48ba005847f80d00000048899000010000', 'hex');
const patched = Buffer.from(original); patched.fill(0, 2, 10);
const headerName = 'google3/third_party/jetski/gateway/gateway.NewHTTPTransportWithOptions';
const updaterName = 'google3/third_party/jetski/cli/updater/updater.triggerUpdateShared';

export function inspectAgv(bytes: Buffer): AgvLayout {
  const fail = () => { throw new Error('无法确认此 AGV 构建的响应头设置或自动更新开关；未修改、未启动。'); };
  const integer = (offset: number) => {
    if (offset < 0 || offset + 8 > bytes.length) return fail();
    const value = Number(bytes.readBigUInt64LE(offset));
    if (!Number.isSafeInteger(value)) return fail();
    return value;
  };
  if (bytes.length < 64 || bytes.subarray(0, 6).toString('hex') !== '7f454c460201' || bytes.readUInt16LE(18) !== 62) return fail();
  const table = integer(40), size = bytes.readUInt16LE(58), count = bytes.readUInt16LE(60);
  if (size < 64 || !count || table + size * count > bytes.length) return fail();
  const sections: Section[] = Array.from({ length: count }, (_, i) => {
    const p = table + size * i;
    return { type: bytes.readUInt32LE(p + 4), address: integer(p + 16), offset: integer(p + 24), size: integer(p + 32) };
  });
  const fileOffset = (address: number) => {
    const section = sections.find(s => s.type !== 8 && address >= s.address && address < s.address + s.size);
    return section ? section.offset + address - section.address : fail();
  };
  const relocation = (locate: (address: number, value: number) => boolean) => {
    for (const section of sections.filter(s => s.type === 4)) {
      if (section.offset + section.size > bytes.length || section.size % 24) return fail();
      for (let p = section.offset; p < section.offset + section.size; p += 24) {
        if (bytes.readUInt32LE(p + 8) === 8 && locate(integer(p), integer(p + 16))) return;
      }
    }
  };
  const magic = Buffer.from('f1ffffff00000108', 'hex');
  for (let base = bytes.indexOf(magic); base >= 0; base = bytes.indexOf(magic, base + 8)) {
    const section = sections.find(s => s.type !== 8 && base >= s.offset && base < s.offset + s.size);
    if (!section) continue;
    const nfunc = integer(base + 8), names = base + integer(base + 32), functions = base + integer(base + 64);
    if (nfunc > 1_000_000 || functions + (nfunc + 1) * 8 > bytes.length) continue;
    let text = integer(base + 24);
    if (!text) {
      let module = 0;
      const address = section.address + base - section.offset;
      relocation((p, value) => { if (value !== address) return false; module = p; return true; });
      if (module) relocation((p, value) => { if (p !== module + 176) return false; text = value; return true; });
    }
    if (!text) continue;
    const wanted = new Map<string, Buffer>();
    const starts = new Map<string, number>();
    for (let i = 0; i < nfunc; i++) {
      const info = functions + bytes.readUInt32LE(functions + i * 8 + 4);
      if (info + 8 > bytes.length) return fail();
      const nameStart = names + bytes.readInt32LE(info + 4), nameEnd = bytes.indexOf(0, nameStart);
      if (nameStart < names || nameEnd < nameStart || nameEnd - nameStart > 1024) continue;
      const name = bytes.toString('utf8', nameStart, nameEnd);
      if (name !== headerName && name !== updaterName) continue;
      const start = fileOffset(text + bytes.readUInt32LE(functions + i * 8));
      const end = fileOffset(text + bytes.readUInt32LE(functions + (i + 1) * 8) - 1) + 1;
      if (end <= start || end - start > 64 * 1024 || wanted.has(name)) return fail();
      wanted.set(name, bytes.subarray(start, end)); starts.set(name, start);
    }
    const transport = wanted.get(headerName), updater = wanted.get(updaterName);
    if (!transport || !updater) continue;
    const matches = [original, patched].flatMap(pattern => {
      const offsets: number[] = [];
      for (let p = transport.indexOf(pattern); p >= 0; p = transport.indexOf(pattern, p + 1)) offsets.push(p);
      return offsets;
    });
    // The updater reads exactly this environment variable and compares its
    // value with the four-byte string "true", rather than a truthy "1".
    const key = Buffer.from('AGY_CLI_DISABLE_AUTO_UPDATE');
    const comparison = Buffer.from('4883fb04750b813874727565', 'hex');
    let readsKey = false;
    const start = starts.get(updaterName)!;
    for (let i = 0; i + 12 <= Math.min(updater.length, 512); i++) {
      if (updater.subarray(i, i + 3).toString('hex') !== '488d05' || updater[i + 7] !== 0xbb || updater.readUInt32LE(i + 8) !== key.length) continue;
      const source = sections.find(s => start >= s.offset && start < s.offset + s.size)!;
      const target = source.address + start - source.offset + i + 7 + updater.readInt32LE(i + 3);
      const p = fileOffset(target);
      if (bytes.subarray(p, p + key.length).equals(key)) readsKey = true;
    }
    if (matches.length !== 1 || !readsKey || updater.indexOf(comparison) < 0) return fail();
    return { headerOffset: starts.get(headerName)! + matches[0], autoUpdateDisabledByTrue: true };
  }
  return fail();
}
