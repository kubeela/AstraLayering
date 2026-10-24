import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';

// CLI 缓存测试也必须离线；缓存失效只能使测试失败，不能落入真实模型调用。
const forbidden = () => { throw new Error('CLI 测试禁止启动模型或其他外部进程'); };
for (const name of ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec', 'execSync']) {
  Object.defineProperty(childProcess, name, { value: forbidden });
}
// 新版入口先检查 CLI 版本。只模拟测试入口的这一次探测，不启动外部进程；
// app-server、模型调用及其他命令仍由上面的保护拒绝。
Object.defineProperty(childProcess, 'execFile', { value: Object.assign(() => forbidden(), {
  [promisify.custom]: async (file: string, args: string[]) => {
    if (file !== process.execPath || args.length !== 1 || args[0] !== '--version') return forbidden();
    return { stdout: 'fixture CLI 1.2.3', stderr: '' };
  },
}) });
syncBuiltinESMExports();
