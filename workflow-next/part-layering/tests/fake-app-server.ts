import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type FakeToolCall = { tool: string; arguments: unknown; threadId?: string; namespace?: string | null };

export async function fakeAppServer(directory: string, calls: FakeToolCall[], mode = 'completed', completedItems: unknown[] = [],
  behavior: { failedTurns?: number; errorInfo?: unknown; nativeReconnect?: boolean; skipCallsAfterFailure?: boolean } = {}) {
  const executable = join(directory, 'fake-app-server.mjs');
  const capture = join(directory, 'protocol.jsonl');
  await writeFile(executable, `#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { appendFile } from 'node:fs/promises';
const calls = ${JSON.stringify(calls)};
const mode = ${JSON.stringify(mode)};
const completedItems = ${JSON.stringify(completedItems)};
const capture = ${JSON.stringify(capture)};
const behavior = ${JSON.stringify(behavior)};
const write = value => process.stdout.write(JSON.stringify(value) + '\\n');
if (process.argv[2] === 'exec') {
  for await (const chunk of process.stdin) {}
  write({type:'thread.started',thread_id:'sdk-thread'});
  write({type:'turn.completed',usage:{input_tokens:1,cached_input_tokens:0,output_tokens:1}});
  process.exit(0);
}
let index = 0, turns = 0;
async function advance() {
  if (mode === 'hang') return;
  if (index < calls.length) {
    const call = calls[index++];
    write({ method: 'item/tool/call', id: 'call-' + index,
      params: { threadId: 'native-thread', turnId: 'native-turn', callId: 'item-' + index, namespace: null, ...call } });
  } else if (mode === 'eof') process.exit(0);
  else {
    if (!(behavior.skipCallsAfterFailure && turns > 1)) {
      for (const item of completedItems) write({ method: 'item/completed', params: { threadId: 'native-thread', item } });
    }
    write({ method: 'item/completed', params: { threadId: 'native-thread', item: { type: 'reasoning', summary: ['测试工具选择摘要'] } } });
    write({ method: 'item/completed', params: { threadId: 'native-thread', item: { type: 'agentMessage', text: '文件已保存，不返回 JSON。' } } });
    write({ method: 'thread/tokenUsage/updated', params: { threadId: 'native-thread', tokenUsage: { total: { inputTokens: 12, outputTokens: 3 } } } });
    const failed = mode === 'failed' || turns <= (behavior.failedTurns ?? 0);
    const error = mode === 'failed' ? {message:'测试回合失败'} : {message:'Selected model is at capacity. Please try a different model.',codexErrorInfo:behavior.errorInfo ?? 'serverOverloaded'};
    if (failed) write({method:'error',params:{threadId:'native-thread',error,willRetry:false}});
    write({ method: 'turn/completed', params: { threadId: 'native-thread', turn: {
      id: 'native-turn', status: failed ? 'failed' : 'completed', error: failed ? error : null } } });
  }
}
for await (const line of createInterface({ input: process.stdin })) {
  const msg = JSON.parse(line);
  await appendFile(capture, JSON.stringify(msg) + '\\n');
  if (msg.method === 'initialize') write({ id: msg.id, result: {} });
  else if (msg.method === 'thread/start' || msg.method === 'thread/resume') write({ id: msg.id, result: { thread: { id: 'native-thread' } } });
  else if (msg.method === 'turn/start') {
    turns++;
    index = behavior.skipCallsAfterFailure && turns > 1 ? calls.length : 0;
    write({ id: msg.id, result: { turn: { id: 'native-turn', status: 'inProgress' } } });
    if (behavior.nativeReconnect) write({method:'error',params:{threadId:'native-thread',willRetry:true,error:{message:'Reconnecting... 2/5',codexErrorInfo:{responseStreamDisconnected:{httpStatusCode:503}}}}});
    await advance();
  } else if (typeof msg.id === 'string') await advance();
}
`, 'utf8');
  await chmod(executable, 0o755);
  return { executable, capture };
}
