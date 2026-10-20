# Third-party renderer

The preview imports the following packages directly from locally installed npm dependencies. It does not fetch runtime JavaScript from a CDN.

- **Three.js 0.180.0** — MIT, © three.js authors. [Source and license](https://github.com/mrdoob/three.js/tree/r180).
- **@pixiv/three-vrm-materials-mtoon 3.5.5** — MIT, © pixiv Inc. [Source and license](https://github.com/pixiv/three-vrm/tree/v3.5.5).

MToon supplies the toon material implementation; Three.js supplies renderer, lighting, shadow-map generation and PCF sampling. AstraLayering supplies the image/depth surface adapter and workbench controls. The shadow receiver adapter does not replace the MToon lighting model. Dependency versions and integrity hashes are pinned in `pnpm-lock.yaml`.

The generated test characters are original test inputs. Jianma is imported from this project's earlier user-authorized character workbench assets. Image prompts and provenance are adjacent to each sample. Bilibili screenshots, third-party character models, Unity shaders and lilToon source were not copied into the workbench.
