# Third-party renderer and document readers

The preview imports the following packages directly from locally installed npm dependencies. It does not fetch runtime JavaScript from a CDN.

- **Three.js 0.180.0** — MIT, © three.js authors. [Source and license](https://github.com/mrdoob/three.js/tree/r180).
- **@pixiv/three-vrm-materials-mtoon 3.5.5** — MIT, © pixiv Inc. [Source and license](https://github.com/pixiv/three-vrm/tree/v3.5.5).

- **ag-psd 30.1.0** — MIT, © Agamnentzar. [Source and license](https://github.com/Agamnentzar/ag-psd). PSD saved-composite decoding in a worker and server-side clipping/visibility metadata decoding.
- **fflate 0.8.2** — MIT, © Arjun Barrett. [Source and license](https://github.com/101arrowz/fflate/tree/v0.8.2). Selective KRA ZIP reading and lossless PNG compression.

MToon supplies the toon material implementation; Three.js supplies renderer, lighting, shadow-map generation and PCF sampling. AstraLayering supplies the image/depth surface adapter and workbench controls. The shadow receiver adapter does not replace the MToon lighting model. Dependency versions and integrity hashes are pinned in `pnpm-lock.yaml`.

The generated test characters are original test inputs. Jianma is imported from this project's earlier user-authorized character workbench assets. Image prompts and provenance are adjacent to each sample. Bilibili screenshots, third-party character models, Unity shaders and lilToon source were not copied into the workbench.

The optional native compositor invokes an independently installed **Krita** (tested 5.3.4.1), distributed under GPL-3.0-or-later; no Krita binary or source is bundled here. [Krita source/license](https://invent.kde.org/graphics/krita), [Python Node API](https://api.kde.org/krita/html/classNode.html), [group passthrough API](https://api.kde.org/krita/html/classGroupLayer.html). The small `web/krita/` plugin is project-authored fixed-operation glue. Linux headless operation uses the host's Xvfb. Native rendering owns masks, color management and blends; PSD clipping metadata is translated into native isolated groups because the tested importer omits that flag.

The part surface coverage and sample-attribution adapter is transferred from the user's original [ai-weapon-spirit character studio at `6e0e89a9c`](https://github.com/ForgeaXGame/ai-weapon-spirit/tree/6e0e89a9c/docs/workbench/src/character-studio). `surface-coverage.js` and `part-maps.js` preserve that algorithm with browser JavaScript types stripped; `harmonic-fill.js` is copied byte for byte. This is project-authored source-UV attribution and sparse harmonic completion, independent of MToon's material code. Tests use known sloping receivers, real Jianma layers, and the existing opposite hand; no third-party character art or physics implementation is imported.
