import { LightingStage, loadImage } from './renderer.js';
import { validateSettings } from './lighting-model.js';

// The agent adapter uses the exact studio renderer and original-size export.
window.astraRenderLighting = async (input) => {
  const canvas = document.querySelector('canvas'), stage = new LightingStage(canvas);
  try {
    const images = Object.fromEntries(await Promise.all(Object.entries(input.images).map(async ([key, url]) => [key, await loadImage(url)])));
    const geometry = await stage.load(images);
    stage.apply(validateSettings(input.settings));
    stage.setMode('lit');
    const png = await stage.exportPNG();
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(png);
    });
    return { data, geometry };
  } finally { stage.dispose(); }
};
