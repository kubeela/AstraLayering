import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

// CLI 缓存测试也必须离线；缓存失效只能使测试失败，不能落入真实模型调用。
const forbidden = () => { throw new Error('CLI 测试禁止启动模型或其他外部进程'); };
for (const name of ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec', 'execSync']) {
  Object.defineProperty(childProcess, name, { value: forbidden });
}
syncBuiltinESMExports();
