import { readFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { atomicJSON, safePath } from "./files.ts";
import { validateSettings, rendererVersion } from "./studio/lighting-model.js";

export type StudioSample = {
  id: string;
  name: string;
  description: string;
  files: Record<string, string>;
  sha256: Record<string, string>;
  width: number;
  height: number;
  source: string;
};
export async function studioCatalog(root: string): Promise<StudioSample[]> {
  try {
    return JSON.parse(
      await readFile(join(root, "demos/lighting-lab/catalog.json"), "utf8"),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
export async function studioSample(root: string, id: string) {
  const sample = (await studioCatalog(root)).find((s) => s.id === id);
  if (!sample) throw new Error("未登记的预览素材");
  return sample;
}
export async function studioAsset(root: string, id: string, kind: string) {
  const sample = await studioSample(root, id);
  if (!["color", "normal", "depth"].includes(kind) || !sample.files[kind])
    throw new Error("不支持的贴图类型");
  return safePath(join(root, "demos/lighting-lab"), sample.files[kind]);
}
export async function saveStudioReview(
  root: string,
  storage: string,
  value: any,
) {
  const sample = await studioSample(root, value.sample);
  if (value.renderer !== rendererVersion)
    throw new Error("渲染器版本已改变，请重新预览");
  if (
    !value.inputs ||
    ["color", "normal", "depth"].some(
      (k) => value.inputs[k] !== sample.sha256[k],
    )
  )
    throw new Error("素材版本已改变，请重新载入并预览");
  if (!["accepted", "needs-work"].includes(value.verdict))
    throw new Error("请选择本次灯位的检查结论");
  if (typeof value.note !== "string" || value.note.length > 2000)
    throw new Error("检查记录最多 2000 字");
  for (const kind of ["color", "normal", "depth"]) {
    const file = await studioAsset(root, sample.id, kind);
    if (
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex") !== sample.sha256[kind]
    )
      throw new Error("贴图文件已改变，请重新准备素材目录并载入");
  }
  const settings = validateSettings(value.settings),
    createdAt = new Date().toISOString(),
    id = randomUUID();
  const record = {
    schema: 1,
    id,
    sample: sample.id,
    renderer: rendererVersion,
    inputs: sample.sha256,
    settings,
    verdict: value.verdict,
    note: value.note,
    createdAt,
  };
  const folder = join(storage, "studio", sample.id);
  await mkdir(folder, { recursive: true });
  await atomicJSON(join(folder, id + ".json"), record);
  return record;
}
export async function studioReviews(root: string, storage: string, id: string) {
  await studioSample(root, id);
  const folder = join(storage, "studio", id);
  let names: string[];
  try {
    names = await readdir(folder);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const records = await Promise.all(
    names
      .filter((n) => /^[\da-f-]+\.json$/.test(n))
      .map(async (n) => JSON.parse(await readFile(join(folder, n), "utf8"))),
  );
  return records
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);
}
