// The server-side path picker. The workbench may run on a remote host, so paths are
// browsed through /api/fs instead of the browser's own file chooser, which sees only
// the viewer's machine. Resolves the chosen absolute path, or undefined when cancelled.
export function pickServerPath({ get, esc, icon, kind, path, title, note }) {
 const dialog = document.querySelector('#picker-dialog');
 return new Promise(resolve => {
  let listing = null, selected = '', chosen;
  const go = async target => {
   try {
    listing = await get('./api/fs?' + new URLSearchParams({ kind, path: target ?? '' }));
    selected = listing.selected ?? '';
    draw();
   } catch (error) { dialog.querySelector('.form-error').textContent = error.message; }
  };
  const join = name => listing.path.replace(/[\\/]$/, '') + listing.separator + name;
  const draw = () => {
   dialog.innerHTML = `<div class="modal-heading"><div><h2>${esc(title)}</h2><p>${esc(note ?? `浏览运行工作台的服务器上的${kind === 'dir' ? '目录' : '文件'}。`)}</p></div><button class="icon-button" data-close>${icon('close')}</button></div>
   <div class="picker-bar">${listing.roots.map(root => `<button type="button" class="button" data-go="${esc(root)}">${esc(root)}</button>`).join('')}<button type="button" class="button" data-go="${esc(listing.home)}">主目录</button><button type="button" class="button" data-go="${esc(listing.parent ?? '')}" ${listing.parent ? '' : 'disabled'}>上一级</button></div>
   <form class="picker-path"><input name="path" value="${esc(listing.path)}" aria-label="当前路径"><button class="button">前往</button></form>
   <div class="picker-list">${listing.entries.length ? listing.entries.map(entry => `<button type="button" data-entry="${esc(entry.name)}" data-dir="${entry.dir}" class="${entry.name === selected ? 'active' : ''}">${icon(entry.dir ? 'folder' : 'file')}<span>${esc(entry.name)}</span></button>`).join('') : '<p class="dialog-note">空目录</p>'}</div>
   <p class="form-error"></p><div class="modal-footer"><span>${esc(kind === 'dir' ? listing.path : selected ? join(selected) : '请选择一个文件')}</span><button type="button" class="button" data-close>取消</button><button type="button" class="primary" data-choose ${kind === 'file' && !selected ? 'disabled' : ''}>${kind === 'dir' ? '选择此目录' : '选择'}</button></div>`;
   dialog.querySelectorAll('[data-close]').forEach(button => button.onclick = () => dialog.close());
   dialog.querySelectorAll('[data-go]').forEach(button => button.onclick = () => go(button.dataset.go));
   dialog.querySelector('.picker-path').onsubmit = event => { event.preventDefault(); go(new FormData(event.target).get('path').trim()); };
   dialog.querySelectorAll('[data-entry]').forEach(button => {
    const path = join(button.dataset.entry);
    if (button.dataset.dir === 'true') button.onclick = () => go(path);
    else {
     button.onclick = () => { selected = button.dataset.entry; draw(); };
     button.ondblclick = () => { chosen = path; dialog.close(); };
    }
   });
   dialog.querySelector('[data-choose]').onclick = () => { chosen = kind === 'dir' ? listing.path : join(selected); dialog.close(); };
  };
  dialog.innerHTML = '<p class="dialog-note">正在读取…</p><p class="form-error"></p>';
  dialog.addEventListener('close', () => resolve(chosen), { once: true });
  dialog.showModal();
  // A recorded path opens where it is; a missing one falls back to the home directory.
  go(path).then(() => { if (!listing) go(''); });
 });
}
