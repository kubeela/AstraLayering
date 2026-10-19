# 维护工具

`check_workflow_dsl.py` 仅静态检查历史 YAML 技能的 `流程.yaml`、资源路径和执行入口，不参与当前 TypeScript 工作流。需要 `PyYAML>=6,<7`，显式传入历史技能目录：

```bash
python3 tools/check_workflow_dsl.py /仓库绝对路径/archive/skills/live2d-layering /仓库绝对路径/archive/skills/live2d-clothing
```

在 skill 根目录运行 `pnpm check` 和 `pnpm test` 检查当前四条管线。原生 Codex 可选补丁的构建与模拟验证见 [codex/README.md](codex/README.md)。
