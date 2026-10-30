// Render authored vector guides; not a character image-generation step.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
for (const name of ['skirt', 'hair']) {
  await sharp(fileURLToPath(new URL(name + '.svg', import.meta.url))).png().toFile(fileURLToPath(new URL(name + '.png', import.meta.url)));
}
