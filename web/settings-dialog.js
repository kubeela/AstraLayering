import { pickServerPath } from './server-picker.js';

// Global settings: the Krita used by every start, the run directory, and the knowledge
// directory new tasks record. Paths are chosen with the server-side picker.
export function createSettings({ get, post, esc, icon, onSaved }) {
 let settings = null;
 const load = async () => (settings = await get('./api/settings'));

 const pick = options => pickServerPath({ get, esc, icon, ...options });

 // Resolves true once saved. `focus` names the field to fill, `error` says why it is asked.
 function show({ focus, error } = {}) {
  const dialog = document.querySelector('#settings-dialog');
  return new Promise(async resolve => {
   let saved = false, polling;
   try { await load(); } catch (failure) { error = failure.message; }
   const defaults = settings?.defaults ?? {};
   dialog.innerHTML = `<div class="modal-heading"><div><span class="eyebrow">SETTINGS</span><h2>全局设置</h2><p>保存在服务器上，所有任务的启动都使用这里的设置。</p></div><button class="icon-button" data-close>${icon('close')}</button></div>
   <form class="settings-form">${error ? `<p class="form-error settings-reason">${esc(error)}</p>` : ''}
    <label class="field-label" for="settings-krita">Krita 可执行文件 <span>绘制、组装与阴影需要</span></label>
    <div class="path-field"><input id="settings-krita" name="krita" value="${esc(settings?.krita ?? '')}" placeholder="例如 /usr/bin/krita"><button type="button" class="button" data-pick="krita">浏览</button><button type="button" class="button" data-scan>${icon('search')}自动扫描</button></div>
    <div class="scan-status" aria-live="polite"></div>
    <label class="field-label" for="settings-directory">默认运行目录 <span>新任务创建在这里，并追踪其中的任务</span></label>
    <div class="path-field"><input id="settings-directory" name="directory" value="${esc(settings?.directory ?? '')}" required><button type="button" class="button" data-pick="directory">浏览</button></div>
    <label class="field-label" for="settings-knowledge">默认先验知识目录 <span>新任务记录它；已有任务沿用创建时的目录</span></label>
    <div class="path-field"><input id="settings-knowledge" name="knowledge" value="${esc(settings?.knowledge ?? '')}" placeholder="${esc(defaults.knowledge ?? '')}"><button type="button" class="button" data-pick="knowledge">浏览</button></div>
    <p class="dialog-note">先验知识目录留空时使用 skill 自带的 knowledge/。切换运行目录不会停止已运行的任务。</p>
    <p class="form-error" role="alert"></p>
    <div class="modal-footer"><span></span><button type="button" class="button" data-close>取消</button><button class="primary">保存设置</button></div></form>`;
   const form = dialog.querySelector('form'), status = dialog.querySelector('.scan-status'), scanButton = dialog.querySelector('[data-scan]');
   const drawScan = scan => {
    scanButton.innerHTML = scan.running ? icon('stop') + '停止扫描' : icon('search') + '自动扫描';
    const progress = scan.running ? `正在扫描 ${esc(scan.current || '…')} · 已检查 ${scan.scanned} 项` : scan.finishedAt ? `扫描结束 · 共检查 ${scan.scanned} 项` : '';
    status.innerHTML = (progress ? `<small>${progress}</small>` : '') + (scan.error ? `<small class="status-error">${esc(scan.error)}</small>` : '')
     + scan.found.map(path => `<button type="button" class="found-krita" data-found="${esc(path)}">${icon('check')}${esc(path)}</button>`).join('')
     + (!scan.running && scan.finishedAt && !scan.found.length ? '<small>没有找到 Krita，请手动选择。</small>' : '');
    status.querySelectorAll('[data-found]').forEach(button => button.onclick = () => { form.elements.krita.value = button.dataset.found; });
    clearTimeout(polling);
    if (scan.running && dialog.open) polling = setTimeout(() => get('./api/krita-scan').then(drawScan, () => {}), 700);
   };
   scanButton.onclick = async () => {
    try { drawScan(await post('krita-scan', { action: scanButton.textContent.includes('停止') ? 'stop' : 'start' })); }
    catch (failure) { form.querySelector('.form-error').textContent = failure.message; }
   };
   const titles = { krita: '选择 Krita 可执行文件', directory: '选择默认运行目录', knowledge: '选择先验知识目录' };
   dialog.querySelectorAll('[data-pick]').forEach(button => button.onclick = async () => {
    const field = form.elements[button.dataset.pick];
    const path = await pick({ kind: field.name === 'krita' ? 'file' : 'dir', path: field.value.trim() || (field.name === 'knowledge' ? defaults.knowledge : ''), title: titles[field.name] });
    if (path) field.value = path;
   });
   form.onsubmit = async event => {
    event.preventDefault();
    const fields = new FormData(form), button = form.querySelector('.primary');
    button.disabled = true; form.querySelector('.form-error').textContent = '';
    try {
     settings = await post('settings', { directory: fields.get('directory').trim(), krita: fields.get('krita').trim(), knowledge: fields.get('knowledge').trim() });
     saved = true; await onSaved(settings); dialog.close();
    } catch (failure) { form.querySelector('.form-error').textContent = failure.message; }
    finally { button.disabled = false; }
   };
   dialog.querySelectorAll('[data-close]').forEach(button => button.onclick = () => dialog.close());
   dialog.addEventListener('close', () => { clearTimeout(polling); resolve(saved); }, { once: true });
   dialog.showModal();
   if (focus) form.elements[focus]?.focus();
   get('./api/krita-scan').then(drawScan, () => {});
  });
 }

 // Runs a start; a refused Krita opens the settings, and the start is tried again once saved.
 async function withKrita(run) {
  for (;;) {
   try { return await run(); }
   catch (error) {
    if (!error.krita || !await show({ focus: 'krita', error: error.message })) throw error;
   }
  }
 }
 return { load, show, withKrita, current: () => settings };
}
