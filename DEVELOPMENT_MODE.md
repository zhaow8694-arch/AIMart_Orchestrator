# Development Mode

## 当前选择

```yaml
development_agent: codex
mode: single_agent_only
mixed_agent_development: forbidden
backup_agent: trae_agent_only_if_restart_from_scratch
```

## 关键规则

1. 本系统 v0.1 只能由 Codex 单独开发。
2. Trae Agent 只作为备选路线；如果切换到 Trae，需要从一个明确的交接包重新开始，不能和 Codex 混合。
3. Claude Code 不参与第一版开发。
4. Cursor、Copilot、Windsurf、Gemini、Jules 等也不参与第一版开发。
5. 未来系统导出的目标执行包，可以逐步支持多个 AI，但这不是“多个 AI 一起开发本系统”。

## 概念区分

| 概念 | 含义 | v0.1 决策 |
|---|---|---|
| Builder Agent | 负责搭建 AIMart Orchestrator 的 AI | Codex only |
| Target Agent Adapter | AIMart 将来生成给某个 AI 用的执行包格式 | v0.1 先实现 Codex adapter，保留扩展点 |
| Runner | 直接启动 AI 去执行任务的运行器 | v0.1 不做 |
| Runtime Pack | 给 AI 无人值守执行用的工具、权限、脚本和文档包 | v0.1 做模板生成 |

## 切换到 Trae Agent 的条件

只有在完全放弃 Codex 当前工作区时才允许切换：

1. 先运行 `scripts/finalize.*` 生成归档。
2. 生成 `HANDOFF_TO_TRAE.md`。
3. 新建干净分支或新仓库。
4. Trae Agent 独立执行，不能与 Codex 交替修改。
