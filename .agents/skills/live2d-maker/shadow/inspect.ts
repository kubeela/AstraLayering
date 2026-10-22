import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { inspectMask } from './inspection.ts';
if (import.meta.main) {
  const {values} = parseArgs({options:{output:{type:'string'},krita:{type:'string'}}});
  if (!values.output || !values.krita) throw new Error('使用 --output <step01> --krita <可执行文件>');
  const controller = new AbortController();
  const stop = () => controller.abort(new Error('检查已取消'));
  process.once('SIGINT',stop); process.once('SIGTERM',stop);
  try { console.log(JSON.stringify(await inspectMask(resolve(values.output),resolve(values.krita),process.env,controller.signal),null,2)); }
  finally { process.removeListener('SIGINT',stop); process.removeListener('SIGTERM',stop); }
}
