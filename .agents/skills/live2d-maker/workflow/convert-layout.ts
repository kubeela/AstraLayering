import { parseArgs } from 'node:util';
import { convertLayout } from './layout.ts';
import { directoryFor } from './state.ts';

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { name: { type: 'string' }, dir: { type: 'string' }, help: { type: 'boolean', short: 'h' } }, strict: true });
  if (values.help) { console.log('pnpm convert-layout --name <任务名> [--dir <运行根目录>]\n把旧版目录布局的任务整体转换为当前布局；转换前先把原目录完整复制到运行根目录的 .backups/。'); return; }
  if (!values.name) throw new Error('请提供 --name <任务名>。');
  const result = await convertLayout(directoryFor({ name: values.name, dir: values.dir }), message => console.log(message));
  console.log(`已转换：${result.directory}\n原目录备份：${result.backup}${result.notes.map(note => '\n- ' + note).join('')}`);
}
if (import.meta.main) main().catch(error => { console.error((error as Error).message); process.exitCode = 1; });
