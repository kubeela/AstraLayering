// Rasterize temporary SVGs in one process; source documents are never changed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
let sharp;
for (const candidate of [process.env.REVIEW_SHARP, 'sharp',
  path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')].filter(Boolean)) {
  try { sharp = require(candidate); break; } catch {}
}
if (!sharp) { console.error('Install sharp or set REVIEW_SHARP to its module path.'); process.exit(1); }
async function main() {
  const jobs = process.argv[2] === '--batch'
    ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))
    : [{ input: process.argv[2], output: process.argv[3] }];
  if (!Array.isArray(jobs) || !jobs.length || jobs.some(job =>
    !job || typeof job.input !== 'string' || typeof job.output !== 'string')) {
    throw new Error('Expected input/output paths, or --batch with a JSON job list.');
  }
  // Sequential rendering bounds memory while reusing sharp and the font cache.
  for (const job of jobs) {
    await sharp(job.input, { density: 72, limitInputPixels: 100000000 })
      .png().toFile(job.output);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
