import { defaults, rendererVersion, validateSettings } from './lighting-model.js';

export function validateLight(value) {
  if (!value || value.version !== 1 || value.renderer !== rendererVersion) throw Error('light.json 渲染版本不匹配');
  for (const key of ['color', 'normal', 'depth'])
    if (!/^[a-f0-9]{64}$/.test(value.inputs?.[key])) throw Error('light.json 缺少贴图指纹');
  if (!/^[a-f0-9]{64}$/.test(value.previewHash) || !/^[a-f0-9]{64}$/.test(value.rendererFingerprint)
    || !/^renders\/[a-f0-9-]+\.json$/.test(value.renderRecord)) throw Error('light.json 缺少渲染记录');
  if (Object.keys(defaults).some(key => !Object.hasOwn(value.settings || {}, key))) throw Error('light.json 必须包含全部光照参数');
  return { ...value, settings: validateSettings(value.settings) };
}
