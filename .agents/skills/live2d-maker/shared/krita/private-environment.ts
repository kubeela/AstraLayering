import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

// macOS Qt resolves native preferences through CF, but Python resource paths
// also depend on HOME. Both must point at the same private filesystem layout.
export async function preparePrivateKrita(root: string, module: string, source: string,
  inherited: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform) {
  if (!/^[a-z][a-z0-9_]*$/.test(module)) throw new Error('无效的 Krita 插件模块名');
  const prepared = await preparePrivateKritaEnvironment(root, inherited, platform);
  const { config, resource } = prepared;
  await mkdir(join(resource, 'pykrita', module), {recursive:true, mode:0o700});
  await copyFile(source, join(resource, 'pykrita', module, '__init__.py'));
  await writeFile(join(resource,'pykrita',module+'.desktop'), `[Desktop Entry]\nType=Service\nServiceTypes=Krita/PythonPlugin\nX-KDE-Library=${module}\nX-Python-2-Compatible=false\nName=Private Krita task\n`);
  await writeFile(join(config,'kritarc'), `[python]\nenable_${module}=true\n`);
  return prepared;
}

// CLI exports need the same private settings and Qt socket, without a plugin.
export async function preparePrivateKritaEnvironment(root: string, inherited: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform) {
  const config = platform === 'darwin' ? join(root, 'Library/Preferences') : join(root, 'config');
  const share = platform === 'darwin' ? join(root, 'Library/Application Support') : join(root, 'share');
  const resource = join(share, 'krita');
  for (const path of [config, resource, join(root,'runtime'), join(root,'tmp')])
    await mkdir(path, {recursive:true, mode:0o700});
  const env: NodeJS.ProcessEnv = {...inherited, XDG_CONFIG_HOME:config, XDG_DATA_HOME:share,
    XDG_RUNTIME_DIR:join(root,'runtime'), TMPDIR:join(root,'tmp'), TEMP:join(root,'tmp'), TMP:join(root,'tmp'),
    APPDATA:config, LOCALAPPDATA:join(root,'local'), PYTHONDONTWRITEBYTECODE:'1',
    ...(platform === 'darwin' ? {HOME:root, CFFIXED_USER_HOME:root} : {})};
  return {config, share, resource, env};
}
