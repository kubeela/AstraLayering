import { lstat } from "node:fs/promises";
import { studioArtifacts } from "../.agents/skills/live2d-maker/shared/studio-artifacts.ts";
import { safePath } from "./files.ts";

export async function studioProject(
  directory: string,
  name: string,
  dir: string,
) {
  const files = Object.fromEntries(
    await Promise.all(
      Object.entries(studioArtifacts).map(async ([kind, path]) => {
        try {
          const info = await lstat(await safePath(directory, path));
          if (!info.isFile()) throw Error("项目产物不是文件：" + path);
          return [
            kind,
            {
              path,
              available: info.size > 0,
              version: `${info.mtimeMs}:${info.size}`,
            },
          ];
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          return [kind, { path, available: false, version: null }];
        }
      }),
    ),
  );
  return { name, dir, files };
}
