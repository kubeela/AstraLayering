import { copyFile, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const signature = Buffer.from('89504e470d0a1a0a', 'hex');
export const isPng = (bytes: Buffer) => bytes.subarray(0, 8).equals(signature);
// PNG bytes kept as they are; other formats are re-encoded upright as PNG.
export const encodePng = async (bytes: Buffer): Promise<Buffer> => isPng(bytes) ? bytes : sharp(bytes).autoOrient().png().toBuffer();
export const pngBytes = async (source: string) => encodePng(await readFile(source));
// Every image the framework copies lands as a PNG, whatever the source format.
export async function copyAsPng(source: string, output: string): Promise<void> {
  const bytes = await readFile(source);
  if (isPng(bytes)) await copyFile(source, output);
  else await writeFile(output, await encodePng(bytes));
}
