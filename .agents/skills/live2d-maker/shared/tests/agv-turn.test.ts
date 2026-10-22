import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AgvTurn } from '../agents/agv-turn.ts';
import { runCliTask } from '../agents/cli.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';
import { parseAgentModel } from '../agents/models.ts';

const step = (step_index: number, step_type: string, state = 'DONE', text_delta = '') => ({
  event: 'step_update', step_update: { step_index, step_type, state, text_delta },
});
const oldError = { conversation_id: 'same-session', status: 'ERROR', error: 'previous header timeout', response: 'current response' };

test('AGV current turn accumulates text deltas and ignores steps before its user input', () => {
  const turn = new AgvTurn();
  turn.record(step(1, 'error_message'));
  turn.record(step(20, 'user_input'));
  turn.record(step(19, 'error_message'));
  turn.record(step(21, 'system_message'));
  turn.record(step(22, 'tool', 'ACTIVE'));
  turn.record(step(22, 'tool'));
  turn.record(step(23, 'agent_response', 'ACTIVE', 'current '));
  assert.equal(turn.record(step(23, 'agent_response', 'DONE', 'response')), 'current response');
  assert.equal(turn.historicalError(oldError, 'same-session'), true);
  assert.equal(turn.userStepIndex, 20);
});

test('AGV history normalization requires an explicit completed current response and never hides current errors', () => {
  for (const scenario of ['fresh', 'no-boundary', 'current-error', 'active-tool', 'last-tool', 'partial', 'mismatch', 'wrong-session', 'protocol-error', 'second-input', 'cancelled', 'is-error']) {
    const turn = new AgvTurn();
    if (scenario !== 'no-boundary') turn.record(step(2, 'user_input'));
    if (scenario === 'current-error') turn.record(step(3, 'error_message'));
    if (scenario === 'active-tool') turn.record(step(3, 'tool', 'ACTIVE'));
    turn.record(step(4, 'agent_response', scenario === 'partial' ? 'ACTIVE' : 'DONE', 'current response'));
    if (scenario === 'last-tool') turn.record(step(5, 'tool'));
    if (scenario === 'protocol-error') turn.record({ event: 'error', error: 'current protocol failure' });
    if (scenario === 'second-input') turn.record(step(5, 'user_input'));
    const result = { ...oldError, ...(scenario === 'mismatch' ? { response: 'old response' } : {}),
      ...(scenario === 'cancelled' ? { status: 'CANCELLED' } : {}), ...(scenario === 'is-error' ? { is_error: true } : {}) };
    assert.equal(turn.historicalError(result, scenario === 'fresh' ? undefined : scenario === 'wrong-session' ? 'another-session' : 'same-session'), false, scenario);
  }
});

const cli = `#!${process.execPath}
import { randomUUID } from 'node:crypto';
let input='';for await(const chunk of process.stdin)input+=chunk;
const mode=JSON.parse(input).message.content[0].text.split('\\n')[0];
const args=process.argv.slice(2), id=args.includes('--conversation')?args[args.indexOf('--conversation')+1]:randomUUID();
const emit=event=>console.log(JSON.stringify(event));
const step=(index,type,state='DONE',text='')=>emit({event:'step_update',step_update:{conversation_id:id,step_index:index,step_type:type,state,text_delta:text}});
emit({event:'init',conversation_id:id});
if(mode!=='no-boundary')step(2,'user_input');
if(mode==='initial-error'){step(3,'error_message');emit({event:'result',result:{conversation_id:id,status:'ERROR',error:'previous header timeout',response:''}});process.exit(3);}
step(4,'agent_response','ACTIVE','current ');step(4,'agent_response','DONE','response');
if(mode==='current-error')step(5,'error_message');
if(mode==='abort'){await new Promise(()=>{});}
if(mode!=='missing-result')emit({event:'result',result:{conversation_id:id,status:mode==='cancelled'?'CANCELLED':'ERROR',error:mode==='current-error'?'new timeout':'previous header timeout',response:'current response'}});
process.exit(mode==='nonzero'||mode==='current-error'?3:0);
`;

test('CLI adapter resumes after historical failure, preserves records, and still rejects actual failure, cancellation and incomplete output', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agv-turn-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, 'agy.mjs'); await writeFile(executable, cli, { mode: 0o700 });
  const cwd = join(root, 'case'); await mkdir(cwd);
  await writeFile(join(cwd, 'keep.svg'), 'existing draft');
  const settings = loadWorkflowEnvironment({ layering_agv_path: executable }, root);
  const model = parseAgentModel('gemini-4-argon-high', 'test');
  const options = { cwd, logDirectory: join(cwd, 'agents') };
  let id: string | undefined;
  await assert.rejects(runCliTask({ name: 'initial', cwd, prompt: 'initial-error' }, model, settings, options, new AbortController().signal), error => {
    id = (error as { threadId?: string }).threadId; return /previous header timeout/.test(String(error));
  });
  assert.ok(id);
  const before = await readFile(join(options.logDirectory, 'sessions.json'), 'utf8');
  const result = await runCliTask({ name: 'resume', cwd, prompt: 'history' }, model, settings, options, new AbortController().signal, id);
  assert.equal(result.threadId, id); assert.equal(result.text, 'current response');
  assert.equal(await readFile(join(options.logDirectory, 'sessions.json'), 'utf8'), before);
  assert.equal(await readFile(join(cwd, 'keep.svg'), 'utf8'), 'existing draft');
  const events = await readFile(join(result.logDirectory!, 'events.jsonl'), 'utf8');
  assert.match(events, /"status":"ERROR"/); assert.match(events, /"outcomeSource":"current_turn_steps"/);
  for (const mode of ['current-error', 'nonzero', 'missing-result', 'no-boundary', 'cancelled']) {
    const failing = runCliTask({ name: mode, cwd, prompt: mode }, model, settings, options, new AbortController().signal, id);
    if (mode === 'current-error') await assert.rejects(failing, /new timeout/);
    else await assert.rejects(failing);
  }
  const controller = new AbortController();
  const aborting = runCliTask({ name: 'abort', cwd, prompt: 'abort' }, model, settings,
    { ...options, onEvent: async () => { controller.abort(new Error('user cancelled')); } }, controller.signal, id);
  // An existing session does not emit thread.started; cancel after its completed message.
  await assert.rejects(aborting, /user cancelled/);
});
