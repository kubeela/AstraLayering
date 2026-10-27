import { lstat, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { shadowMode, shadowModes } from '../.agents/skills/live2d-maker/shared/shadow.ts';
import { stepsFor } from '../.agents/skills/live2d-maker/shadow/steps.ts';
import { pipelineIds } from '../.agents/skills/live2d-maker/shared/paths.ts';
import { listSteps } from '../.agents/skills/live2d-maker/workflow/step-actions.ts';
import { currentSession } from '../.agents/skills/live2d-maker/shared/agents/step-session.ts';
import { readRun, taskStatus, type TaskRun } from '../.agents/skills/live2d-maker/workflow/state.ts';
import { steps as personSteps } from '../.agents/skills/live2d-maker/raster-layering/steps.ts';
import { steps as clothingSteps } from '../.agents/skills/live2d-maker/clothing-raster-layering/steps.ts';
import { steps as assemblySteps } from '../.agents/skills/live2d-maker/character-assembly/steps.ts';
import { nextReviewTask } from '../.agents/skills/live2d-maker/shared/raster/review.ts';
import { agentRecord, inventory, jsonFile, safePath } from './files.ts';
import { partProgress, phases } from './part-progress.ts';
import { readTaskLog } from '../.agents/skills/live2d-maker/workflow/log.ts';
import { projectDisplayName } from './project-metadata.ts';
import { reportPreview, type ReportPreview } from './report.ts';
import { legacyWorkspaces } from './workspaces.ts';
import { taskStopMethod } from '../.agents/skills/live2d-maker/workflow/control.ts';
import { completeRun } from '../.agents/skills/live2d-maker/workflow/export.ts';
import { copiedInput, inputKras } from './kra-inputs.ts';
import { kritaRecordFile, readKritaRecord } from '../.agents/skills/live2d-maker/shared/krita/section-krita.ts';

export { phases } from './part-progress.ts';
export const rasterDefinitions = { 'raster-layering': personSteps, 'clothing-raster-layering': clothingSteps, 'character-assembly': assemblySteps };
export type Status = 'done' | 'running' | 'pending' | 'failed' | 'interrupted' | 'available' | 'skipped' | 'unconfirmed';
export const statusOf = (value?: string): Status => value === 'completed' ? 'done' : value === 'ready' ? 'pending' : ['running', 'failed', 'interrupted'].includes(value ?? '') ? value as Status : 'pending';
const flatten = (nodes: any[]): any[] => nodes.flatMap(node => [node, ...flatten(node.groups ?? [])]);
function validateGroups(nodes: any[], depth = 0) {
  if (depth > 40 || !Array.isArray(nodes)) throw new Error('groups 层级无效');
  for (const node of nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || node.id.startsWith('/') || /[\\\0]/.test(node.id)
      || node.id.split('/').some((segment: string) => !segment || segment === '.' || segment === '..')) throw new Error('group id 无效');
    if (node.groups !== undefined) validateGroups(node.groups, depth + 1);
  }
}
export async function summary(directory: string, name: string, dir: string) {
  const displayName = await projectDisplayName(directory, name);
  const run = await readRun(directory, name);
  if (!run) return { name, displayName, status: 'untracked', directory, run: undefined, runnerAlive: false, lockHeld: false };
  const live = await taskStatus({ name, dir });
  return { name, displayName, status: live.status, directory, run, runnerAlive: live.runnerAlive, lockHeld: live.lockHeld };
}
export async function snapshot(directory: string, name: string, dir: string) {
  const errors: string[] = [];
  const record = await summary(directory, name, dir).catch(error => {
    errors.push(String(error)); return { name, status: 'failed', directory, run: undefined as TaskRun | undefined, runnerAlive: false, lockHeld: false };
  });
  const fileVersions: Record<string, string> = {};
  const files = await inventory(directory, fileVersions), fileSet = new Set(files);
  const processWorkspaces = await legacyWorkspaces(directory, files);
  const optional = async (path: string) => jsonFile(directory, path).catch(error => { errors.push(String(error)); return undefined; });
  const exists = async (path: string) => {
    try { return (await lstat(await safePath(directory, path))).isFile(); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push(String(error)); return false; }
  };
  const pipelines = [];
  for (const id of pipelineIds) {
    if (record.run?.archive && !record.run.pipelines[id]) continue;
    // The character and clothing lanes run side by side: several pipelines can be active at once.
    const current = !!record.run?.activePipelines?.includes(id);
    const active = record.runnerAlive && record.lockHeld && current;
    const saved = record.run?.pipelines[id];
    const mode = shadowMode(record.run?.shadowMode);
    const branch = id === 'shadow' ? id + '/' + mode : id;
    const config = await optional(branch + '/run.json');
    const states: Record<string, Status> = {};
    const messages: Record<string, string> = {};
    const previews: Record<string, { path: string; savedAt: string }> = {};
    const feedback: Record<string, string> = {};
    const reports: Record<string, ReportPreview> = {};
    const loadReport = async (key: string, path: string) => {
      const source = fileSet.has(path) ? path : fileSet.has(path + '.tmp') ? path + '.tmp' : undefined;
      if (!source) return;
      try {
        const text = await readFile(await safePath(directory, source), 'utf8');
        reports[key] = await reportPreview(directory, source, text, fileSet);
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push(source + ': ' + String(error)); }
    };
    const observed = (value?: string): Status => value === 'running' ? (active ? 'running' : record.status === 'failed' ? 'failed' : 'unconfirmed') : statusOf(value);
    let groups: any[] = [];
    if (id === 'part-layering' || id === 'clothing-part-layering') {
      const document = await optional(id + '/groups.json');
      try { validateGroups(document?.groups ?? []); groups = document?.groups ?? []; }
      catch (error) { errors.push(id + ': ' + String(error)); }
      const all = flatten(groups);
      const failedSince = !active && record.status === 'failed' && current ? record.run?.runner?.startedAt : undefined;
      const progress = await partProgress(directory, id, groups, fileSet, optional, errors, active ? record.run?.runner?.startedAt : undefined, failedSince);
      Object.assign(states, progress.states); Object.assign(messages, progress.messages);
      for (const phase of phases) {
        const values = all.map(node => node.webPhases[phase]);
        states[phase] = values.includes('failed') ? 'failed' : values.includes('running') ? 'running'
          : values.includes('unconfirmed') ? 'unconfirmed' : values.length && values.every(v => v === 'done') ? 'done'
            : values.some(v => v === 'available' || v === 'done') ? 'available' : 'pending';
      }
      const values = phases.map(phase => states[phase]);
      states.layers = values.includes('failed') ? 'failed' : values.includes('running') ? 'running' : values.includes('unconfirmed') ? 'unconfirmed'
        : values.every(v => v === 'done') ? 'done' : all.length ? 'available' : 'pending';
      // Legacy completed pipelines can lack individual reference fingerprints.
      if (saved?.status === 'completed') {
        for (const key of ['initial', 'preparation', 'standard', 'simplified', 'base', 'clothing']) {
          if (states[key] === 'available') states[key] = 'done';
        }
        if (record.run?.archive) for (const key of ['merge', 'occlusion']) {
          if (states[key] === 'available') states[key] = 'done';
        }
      }
    } else {
      for (const step of id === 'shadow' ? stepsFor(mode) : rasterDefinitions[id]) {
        const prefix = branch + '/' + step.id;
        await loadReport(step.id, prefix + '/report.md');
        const legacy = processWorkspaces[prefix] || [];
        const previewInputs = [...inputKras(config?.sourceInput, directory), ...files
          .filter(path => path.startsWith(prefix + '/') && !path.includes('/workspace/') && /\.kra$/i.test(path))
          .map(path => resolve(directory, path))];
        const candidates = await Promise.all(files.filter(path => /\.kra$/i.test(path) &&
          (path.startsWith(prefix + '/') || legacy.some(root => path.startsWith(root + '/')))
          && !path.split('/').some(segment => segment.startsWith('.') || ['recovery', 'archive'].includes(segment)))
          .map(async path => ({ path, info: await lstat(await safePath(directory, path)),
            inputCopy: await copiedInput(await safePath(directory, path), previewInputs) })));
        for (let index = candidates.length - 1; index >= 0; index--) if (candidates[index].inputCopy) candidates.splice(index, 1);
        candidates.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs || a.path.localeCompare(b.path));
        if (candidates[0]) previews[step.id] = { path: candidates[0].path, savedAt: candidates[0].info.mtime.toISOString() };
        let completed = await exists(prefix + '/.completed');
        const running = await exists(prefix + '/.running');
        const missing = [];
        for (const path of step.requiredFiles) {
          if (!await exists(prefix + '/' + path)) missing.push(path);
        }
        // A portable archive records historical completion, not a resumable
        // scheduler. Earlier exports omitted receipts; require intact deliveries
        // before displaying their archived pipeline completion at each step.
        if (record.run?.archive && saved?.status === 'completed' && !missing.length) completed = true;
        states[step.id] = completed ? (missing.length ? 'failed' : 'done') : running ? observed('running')
          : files.some(path => path.startsWith(prefix + '/')) ? 'available' : 'pending';
        if (completed && missing.length) messages[step.id] = '.completed 存在但缺少交付：' + missing.join('、');
        if ('review' in step && step.review) {
          if (reports[step.id]) reports.draw = reports[step.id];
          states.draw = fileSet.has(prefix + '/report.md') ? 'done' : states[step.id];
          const sequence = ['review-01', 'repair-01', 'review-02', 'repair-02'];
          let next: Awaited<ReturnType<typeof nextReviewTask>>;
          try { next = await nextReviewTask(await safePath(directory, prefix)); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              messages[step.id] = String(error); states[step.id] = 'failed';
            }
          }
          for (const phase of sequence) {
            const report = prefix + '/' + phase + '.md';
            await loadReport(phase, report);
            const draft = !fileSet.has(report) && fileSet.has(report + '.tmp');
            if (fileSet.has(report) || draft) {
              feedback[phase] = (draft ? '草稿（尚未完成）\n' : '')
                + (await readFile(await safePath(directory, report + (draft ? '.tmp' : '')), 'utf8')).trim().slice(0, 600);
            }
            states[phase] = fileSet.has(prefix + '/' + phase + '.md') ? 'done'
              : next?.filename === phase + '.md' && states.draw === 'done' && running ? observed('running')
              : ((!next && fileSet.has(prefix + '/review-01.md')) || (record.run?.archive && completed)) && states[step.id] !== 'failed' ? 'skipped' : 'pending';
          }
          if (completed && next && !record.run?.archive) {
            states[step.id] = 'failed'; messages[step.id] = '.completed 存在但 review / repair 尚未结束：' + next.filename;
          }
        }
      }
    }
    if (id === 'shadow') {
      for (const variant of shadowModes) {
        const branchStates: Status[] = [];
        for (const step of stepsFor(variant)) {
          const prefix = id + '/' + variant + '/' + step.id;
          let complete = await exists(prefix + '/.completed');
          const delivered = await Promise.all(step.requiredFiles.map(path => exists(prefix + '/' + path)));
          if (record.run?.archive && saved?.status === 'completed' && variant === mode && delivered.every(Boolean)) complete = true;
          const state: Status = complete ? delivered.every(Boolean) ? 'done' : 'failed'
            : await exists(prefix + '/.running') ? variant === mode ? observed('running') : 'unconfirmed'
              : files.some(path => path.startsWith(prefix + '/')) ? 'available' : 'pending';
          branchStates.push(state);
          if (variant === 'normal-depth') states['normal-depth-maps'] = state;
        }
        states[variant] = branchStates.includes('failed') ? 'failed' : branchStates.includes('running') ? 'running'
          : branchStates.includes('unconfirmed') ? 'unconfirmed' : branchStates.every(v => v === 'done') ? 'done'
            : branchStates.some(v => v === 'available' || v === 'done') ? 'available' : 'pending';
      }
      states.step01 = states[mode];
    }
    let status: Status = active ? 'running' : observed(saved?.status);
    if (!saved) status = Object.values(states).includes('failed') ? 'failed' : Object.values(states).includes('unconfirmed') ? 'unconfirmed'
      : files.some(path => path.startsWith(id + '/')) ? 'available' : 'pending';
    if ((id === 'shadow' ? states.step01 === 'failed' : Object.values(states).includes('failed')) && !active) status = 'failed';
    if ((id in rasterDefinitions || id === 'shadow') && status === 'done' && Object.entries(states).some(([key, value]) => key.startsWith('step') && value !== 'done')) {
      status = 'interrupted'; // Root coordinator history must not hide a removed step marker.
    }
    // A clothing lane skipped for lack of a dress-up is complete with nothing to make.
    if (saved?.skipped && !active) {
      status = 'skipped';
      for (const key of Object.keys(states)) if (states[key] === 'pending' || states[key] === 'available') states[key] = 'skipped';
    }
    // Every marked step, for the continue / resume / retry actions.
    const steps = await listSteps(join(directory, branch), id).catch(error => { errors.push(id + ': ' + String(error)); return []; });
    // The thread of the running step, else of the last step that kept one.
    const threadId = (await currentSession(join(directory, branch), steps).catch(() => undefined))?.threadId ?? null;
    // The section's own Krita while its process is alive.
    const kritaRecord = await readKritaRecord(join(directory, branch, kritaRecordFile));
    const krita = kritaRecord ? { pid: kritaRecord.pid, version: kritaRecord.version, startedAt: kritaRecord.startedAt } : null;
    pipelines.push({ id, ...(id === 'shadow' ? { mode } : {}), status, states, messages, previews, feedback, reports, groups, steps,
      threadId, krita, summary: saved?.summary, ...(saved?.skipped ? { skipped: true } : {}) });
  }
  const log = await readTaskLog(directory);
  const worker = await optional('.web-worker.json');
  // Server-side readers above may use agent records; the page only gets readable artifacts.
  const servedFiles = files.filter(path => !agentRecord(path));
  const servedVersions = Object.fromEntries(servedFiles.flatMap(path => fileVersions[path] ? [[path, fileVersions[path]]] : []));
  return { ...record, files: servedFiles, fileVersions: servedVersions, processWorkspaces, pipelines, errors, logs: log.text,
    archived: !!record.run?.archive,
    canExport: completeRun(record.run) && !record.runnerAlive && !record.lockHeld,
    logPath: log.path, logUpdatedAt: log.updatedAt, lastLogMessage: log.message,
    canStop: !!taskStopMethod(record.run?.runner, record.runnerAlive, record.lockHeld, worker),
    original: files.find(path => /^input\/original\.(png|jpe?g|webp)$/i.test(path)),
    reference: files.find(path => /^part-layering\/references\/simplified-subject\.(png|jpe?g|webp)$/i.test(path)),
  };
}
