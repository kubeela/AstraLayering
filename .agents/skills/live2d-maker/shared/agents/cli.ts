import { access, mkdir, readFile, writeFile, copyFile, rename, chmod, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, delimiter, relative, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { genaiGateway } from './agv-gateway.ts';
import { AgvTurn } from './agv-turn.ts';
import { createMcpBridge } from './mcp.ts';
import type { WorkflowEnvironment } from '../codex/environment.ts';
import type { AgentModel, Harness } from './models.ts';
import type { AgentTask, AgentResult, AgentOptions } from '../codex/agents.ts';
import { AgentCallError } from '../codex/agent-runtime.ts';
import { AgentLog } from '../codex/agent-log.ts';

export async function cliExecutable(settings: WorkflowEnvironment, harness: Harness): Promise<string> {
  const explicit = settings.cliPaths[harness];
  const names = harness === 'claude' ? ['claude'] : harness === 'agv' ? ['agy', 'agv', 'antigravity'] : ['codex'];
  const candidates = explicit ? [explicit] : (settings.codex.env?.PATH ?? process.env.PATH ?? '').split(delimiter)
    .flatMap(directory => names.flatMap(name => process.platform === 'win32' ? [join(directory, `${name}.exe`), join(directory, `${name}.cmd`)] : [join(directory, name)]));
  for (const path of candidates) try { await access(path, constants.X_OK); if ((await stat(path)).isFile()) return await realpath(path); } catch {}
  throw new Error(`所选步骤需要 ${harness} CLI，但没有可用的全局入口${explicit ? `：${explicit}` : ''}。工作流不会自动安装；请安装并登录，或设置 layering_${harness}_path / 改用已有模型。`);
}
export function unavailableSession(error: unknown): boolean {
  return /(?:thread|session|conversation).{0,80}(?:not found|does not exist|unavailable|invalid|不存在|不可用)|no (?:conversation|session|rollout) found|rollout path.{0,40}not found/i.test(String(error instanceof Error ? error.message : error));
}
type StoredSession = { harness: Harness; data: string; workspace: string };
async function readSessions(root: string): Promise<Record<string, StoredSession>> {
  try { return JSON.parse(await readFile(join(root, 'sessions.json'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
}
// Serialize only the registry writes; CLI calls themselves keep the shared concurrency budget.
const registryWrites = new Map<string, Promise<void>>();
async function remember(root: string, id: string, session: StoredSession): Promise<void> {
  const next = (registryWrites.get(root) || Promise.resolve()).catch(() => {}).then(async () => {
    const records = await readSessions(root); records[id] = session;
    const file = join(root, 'sessions.json'), temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(records, null, 2), { mode: 0o600 }); await rename(temporary, file);
  });
  registryWrites.set(root, next); await next;
}
async function copyCredential(source: string, target: string) {
  try { await copyFile(source, target); await chmod(target, 0o600); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

export async function runCliTask(task: AgentTask, model: AgentModel, settings: WorkflowEnvironment, options: AgentOptions,
  signal: AbortSignal, resumed?: string): Promise<AgentResult> {
  const executable = await cliExecutable(settings, model.harness);
  const root = resolve(options.logDirectory || join(task.cwd || options.cwd!, 'agents'));
  const log = await AgentLog.create(root, task.name, { task: { ...task, tools: task.tools?.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) },
    prompt: task.prompt, sessionThreadId: resumed || null, threadOptions: { model: model.model, modelReasoningEffort: model.effort, harness: model.harness } });
  let mcpServer: Awaited<ReturnType<typeof createMcpBridge>> | undefined;
  const requestedSession = resumed;
  let bridge: Awaited<ReturnType<typeof genaiGateway>>;
  let threadId = resumed, text = '', final: any, stderr = '';
  let processExitCode: number | null | undefined;
  const agvTurn = model.harness === 'agv' ? new AgvTurn() : undefined;
  try {
    const records = await readSessions(root);
    let previous = resumed ? records[resumed] : undefined;
    if (resumed && previous?.harness !== model.harness) {
      await options.onThreadReplacement?.(resumed, 'CLI 已改变或原会话记录不可用'); resumed = undefined;
      threadId = undefined;
      previous = undefined;
    }
    if (previous) try {
      for (const path of [previous.data, previous.workspace]) {
        const lexical = relative(root, resolve(path));
        if (!lexical || lexical === '..' || lexical.startsWith('../') || isAbsolute(lexical)) throw new Error('CLI 会话目录不在当前任务记录目录内');
        const rel = relative(await realpath(root), await realpath(path));
        if (!rel || rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('CLI 会话目录不在当前任务记录目录内');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await options.onThreadReplacement?.(resumed!, '原 CLI 会话目录已不存在');
      resumed = undefined; threadId = undefined; previous = undefined;
    }
    const workspace = join(log.directory, 'workspace'); await mkdir(workspace, { recursive: true });
    const data = previous?.harness === model.harness ? previous.data : join(log.directory, 'cli-data');
    await mkdir(data, { recursive: true, mode: 0o700 });
    // Some CLI releases ignore their config-directory overrides for native history.
    // Give only the child a private home; the host environment and user config stay untouched.
    const env = { ...settings.codex.env, HOME: join(data, 'home'), USERPROFILE: join(data, 'home'), TMPDIR: join(log.directory, 'tmp'),
      XDG_CONFIG_HOME: join(data, 'config'), XDG_DATA_HOME: join(data, 'data'), XDG_STATE_HOME: join(data, 'state'), XDG_CACHE_HOME: join(data, 'cache'),
      CLAUDE_CONFIG_DIR: join(data, 'claude'), CLAUDE_CODE_TMPDIR: join(log.directory, 'tmp'),
      ANTIGRAVITY_APP_DATA_DIR: join(data, 'home/.gemini/antigravity-cli'), JETSKI_APP_DATA_DIR: join(data, 'home/.gemini/antigravity-cli'),
      ANTIGRAVITY_GEMINI_DIR: join(data, 'home/.gemini'), GEMINI_DIR: join(data, 'home/.gemini'), AGY_CLI_DISABLE_AUTO_UPDATE: '1',
    };
    for (const path of [env.TMPDIR, env.CLAUDE_CONFIG_DIR, env.ANTIGRAVITY_APP_DATA_DIR, env.ANTIGRAVITY_GEMINI_DIR]) await mkdir(path, { recursive: true, mode: 0o700 });
    if (!previous && model.harness === 'claude') {
      await copyCredential(join(settings.codex.env?.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), '.credentials.json'), join(env.CLAUDE_CONFIG_DIR, '.credentials.json'));
    }
    if (!previous && model.harness === 'agv') {
      const sourceGemini = settings.codex.env?.ANTIGRAVITY_GEMINI_DIR || settings.codex.env?.GEMINI_DIR || join(homedir(), '.gemini');
      await copyCredential(join(sourceGemini, 'oauth_creds.json'), join(env.ANTIGRAVITY_GEMINI_DIR, 'oauth_creds.json'));
      await copyCredential(join(sourceGemini, 'google_accounts.json'), join(env.ANTIGRAVITY_GEMINI_DIR, 'google_accounts.json'));
      await copyCredential(join(settings.codex.env?.ANTIGRAVITY_APP_DATA_DIR || join(sourceGemini, 'antigravity-cli'), 'jetski_state.pbtxt'), join(env.ANTIGRAVITY_APP_DATA_DIR, 'jetski_state.pbtxt'));
    }
    const authSettings = join(log.directory, 'auth-settings.json');
    let userSettings: any = {};
    try { if (model.harness === 'claude') userSettings = JSON.parse(await readFile(join(settings.codex.env?.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'settings.json'), 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const inherited = { ...(userSettings.apiKeyHelper ? { apiKeyHelper: userSettings.apiKeyHelper } : {}),
      env: Object.fromEntries(Object.entries(userSettings.env || {}).filter(([key]) => /^(ANTHROPIC_|CLAUDE_CODE_USE_|AWS_|AZURE_|GOOGLE_|VERTEX_)/.test(key))
        .map(([key, value]) => [key, settings.codex.env?.[key] ?? value])) };
    await writeFile(authSettings, JSON.stringify(inherited), { mode: 0o600 });
    mcpServer = await createMcpBridge(task.tools || [], signal, event => log.recordProtocol(event));
    const mcp = { mcpServers: { layering: mcpServer.config } };
    bridge = model.harness === 'agv' ? await genaiGateway(env, task.tools || [], root, signal, task.images, workspace,
      event => log.recordProtocol(event).then(() => {})) : undefined;
    Object.assign(env, mcp.mcpServers.layering.env, { LAYERING_BRIDGE_RESULTS: join(log.directory, 'bridge-results') }, bridge ? { AGY_LLM_GATEWAY_URL: bridge.url } : {});
    const configPath = join(log.directory, 'mcp.json'); await writeFile(configPath, JSON.stringify(mcp), { mode: 0o600 });
    await mkdir(join(env.GEMINI_DIR, 'config'), { recursive: true, mode: 0o700 });
    await writeFile(join(env.GEMINI_DIR, 'config/mcp_config.json'), JSON.stringify(mcp), { mode: 0o600 });
    const args = model.harness === 'claude'
      ? ['--print', '--verbose', '--input-format', 'stream-json', '--output-format', 'stream-json', '--model', model.model, '--effort', model.effort,
        '--strict-mcp-config', '--mcp-config', configPath, '--settings', authSettings, '--setting-sources', '', '--disable-slash-commands', '--dangerously-skip-permissions', '--add-dir', task.cwd || options.cwd!]
      : ['--input-format', 'stream-json', '--output-format', 'stream-json', '--model', model.model, '--effort', model.effort,
        '--disable-slash-commands', '--dangerously-skip-permissions', '--log-file', join(log.directory, 'native.log'), '--add-dir', task.cwd || options.cwd!];
    if (resumed) args.push(model.harness === 'claude' ? '--resume' : '--conversation', resumed);
    for (const directory of new Set((task.images || []).map(image => resolve(image.path, '..')))) args.push('--add-dir', directory);
    if (task.outputSchema) args.push('--json-schema', JSON.stringify(task.outputSchema));
    // agy requires an explicit empty --print value when prompts come from stdin.
    if (model.harness === 'agv') args.push('--print=');
    const reportId = async (id: string) => {
      if (!id || id === threadId) return;
      if (threadId) throw new Error('CLI 返回了不同的原会话 ID');
      threadId = id; await remember(root, id, { harness: model.harness, data, workspace });
      await options.onEvent?.({ type: 'thread.started', thread_id: id });
    };
    options.progress?.(`开始：${task.name}；${model.harness} / ${model.model} / ${model.effort}；记录：${log.directory}`);
    signal.throwIfAborted();
    const child = spawn(executable, args, { cwd: workspace, env, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let spawnError: Error | undefined;
    child.on('error', error => { spawnError = error; });
    let childClosed = false;
    const close = new Promise<number | null>(done => child.once('close', code => { childClosed = true; done(code); }));
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      if (childClosed) return;
      try { if (process.platform === 'win32') child.kill('SIGTERM'); else if (child.pid) process.kill(-child.pid, 'SIGTERM'); } catch {}
      if (!killTimer) { killTimer = setTimeout(() => {
        try { if (process.platform === 'win32') child.kill('SIGKILL'); else if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch {}
      }, 5000); killTimer.unref(); }
    };
    signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
    try {
      child.stderr!.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-16000); });
      child.stdin!.on('error', error => { spawnError ||= error; });
      const prompt = !resumed && requestedSession && task.recoveryPrompt ? task.recoveryPrompt : task.prompt;
      const input: any[] = [{ type: 'text', text: prompt + `\n\n【CLI 运行信息】\n本请求临时工作区：${workspace}。正文中的相对文件路径均以 ${task.cwd || options.cwd} 为基准，请用对应绝对路径访问和写入。临时脚本放在本请求工作区。` }];
      for (const image of task.images || []) {
        if (model.harness === 'agv') { input.push({ type: 'text', text: `${image.description}\n参考图绝对路径：${resolve(image.path)}` }); continue; }
        const bytes = await readFile(image.path);
        input.push({ type: 'text', text: image.description }, { type: 'image', source: {
          type: 'base64', media_type: bytes[0] === 0xff ? 'image/jpeg' : 'image/png', data: bytes.toString('base64') } });
      }
      child.stdin!.end(JSON.stringify(model.harness === 'agv' ? { event: 'user', message: { role: 'user', content: input } } : { type: 'user', message: { role: 'user', content: input } }) + '\n');
      for await (const line of createInterface({ input: child.stdout!, crlfDelay: Infinity })) {
        if (!line.trim()) continue;
        let event: any; try { event = JSON.parse(line); } catch { await log.recordProtocol({ text: line }); continue; }
        await log.recordProtocol(event);
        const completedText = agvTurn?.record(event);
        const id = event.session_id || event.conversation_id || event.step_update?.conversation_id;
        if (id) await reportId(id);
        if (event.type === 'assistant') {
          for (const item of event.message?.content || []) if (item.type === 'text') {
            text = item.text; options.progress?.(`[${task.name}] 消息：${text}`);
            await options.onEvent?.({ type: 'item.completed', item: { type: 'agent_message', id: event.uuid || randomUUID(), text } });
          }
        }
        if (event.event === 'result' || event.type === 'result') { final = event.result && typeof event.result === 'object' ? event.result : event;
          await reportId(final.conversation_id || final.session_id || '');
          text = final.structured_output ? JSON.stringify(final.structured_output) : final.response || final.result || text;
        }
        if (completedText !== undefined) {
          text = completedText;
          options.progress?.(`[${task.name}] ${text}`);
          await options.onEvent?.({ type: 'item.completed', item: { type: 'agent_message', id: String(event.step_update.step_index), text } });
        }
      }
      const code = await close;
      processExitCode = code;
      if (spawnError) throw spawnError;
      signal.throwIfAborted();
      const recoveredError = code === 0 && final && agvTurn?.recoveredError(final, threadId);
      const successfulStatus = model.harness === 'agv' ? final?.status === 'SUCCESS' || recoveredError : final?.status !== 'ERROR';
      if (code !== 0 || !final || final.is_error || !successfulStatus) throw new AgentCallError(final?.error || final?.errors?.join('\n') || stderr || 'CLI 未返回成功终态');
      if (recoveredError) {
        await log.recordProtocol({ type: 'agv.turn.completed', outcomeSource: 'current_turn_steps',
          conversationStatus: final.status, earlierError: final.error, userStepIndex: agvTurn!.userStepIndex,
          recoveredErrorStepIndices: agvTurn!.recoveredErrorStepIndices, processExitCode: code });
        options.progress?.(`[${task.name}] 本轮最终已完成；此前错误与恢复过程已保留在记录中。`);
      }
      await options.onEvent?.({ type: 'item.completed', item: { type: 'agent_message', id: randomUUID(), text } });
      await log.finish({ status: 'completed', threadId: threadId || null, usage: final.usage || null, finalResponse: text, images: [], processExitCode, cliStatus: final.status });
      return { text, images: [], threadId, logDirectory: log.directory };
    } finally { signal.removeEventListener('abort', abort); abort(); await close; if (killTimer) clearTimeout(killTimer); }
  } catch (error) {
    await log.finish({ status: 'failed', threadId: threadId || null, finalResponse: text, error: String(error), stderr, processExitCode, cliStatus: final?.status });
    const reported = error instanceof AgentCallError ? error : new AgentCallError(String(error));
    reported.threadId = threadId; reported.finalResponse = text; reported.logDirectory = log.directory; throw reported;
  } finally { await bridge?.close(); await mcpServer?.close(); }
}
