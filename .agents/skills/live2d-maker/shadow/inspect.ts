import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { inspectMask } from './inspection.ts';
if (import.meta.main) {
  const {values} = parseArgs({options:{output:{type:'string'},bridge:{type:'string'}}});
  if (!values.output || !values.bridge) throw new Error('使用 --output <step01> --bridge <krita 工具 status 返回的 bridge>；先用 krita 工具 start 启动本 section 的 Krita');
  const controller = new AbortController();
  const stop = () => controller.abort(new Error('检查已取消'));
  process.once('SIGINT',stop); process.once('SIGTERM',stop);
  try { console.log(JSON.stringify(await inspectMask(resolve(values.output),resolve(values.bridge),controller.signal),null,2)); }
  finally { process.removeListener('SIGINT',stop); process.removeListener('SIGTERM',stop); }
}
