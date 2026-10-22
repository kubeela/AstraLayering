const key = directory => 'astra-layering:last-task:' + directory;
function browserStorage() { try { return globalThis.localStorage; } catch { return undefined; } }

export function selectedTask(directory, tasks, requested, storage = browserStorage()) {
 const exists = name => tasks.some(task => task.name === name);
 if (requested && exists(requested)) return requested;
 try {
  const saved = storage?.getItem(key(directory));
  if (saved && exists(saved)) return saved;
 } catch {}
 return tasks[0]?.name || '';
}

export function rememberTask(directory, name, storage = browserStorage()) {
 try {
  if (name) storage?.setItem(key(directory), name);
  else storage?.removeItem(key(directory));
 } catch {} // Browsers which disable storage can still browse and run tasks.
}
