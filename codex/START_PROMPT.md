# Codex Start Prompt

你是本项目唯一 coding agent。不要把任务交给 Trae、Claude Code、Cursor、Copilot 或其他 AI。

请先读取以下文件：

```text
README_START_HERE.md
DEVELOPMENT_MODE.md
PRODUCT_SPEC.md
BUILD_PLAN.md
TASK_QUEUE.md
ACCEPTANCE_CRITERIA.md
AGENTS.md
RUNTIME_SECURITY_POLICY.md
FINALIZE_REQUIREMENTS.md
```

然后开始实现 AIMart Orchestrator v0.1。

## 目标

实现一个本地运行的 AI Coding Agent 执行包生成器。

v0.1 必须支持：

1. 输入深度讨论内容。
2. 生成 ProjectSpec。
3. 生成 TaskQueue。
4. 生成 Runtime Pack。
5. 生成 PowerShell/Bash 自动化脚本。
6. 生成 Codex target adapter。
7. 生成 docs。
8. 打包 ZIP。
9. 提供 Web UI 最小闭环。
10. 提供测试。

## 开发约束

- 你是唯一开发者。
- 不要调用 Trae/Claude 参与第一版。
- 不要扩大范围到完整 SaaS。
- 不要做云端 Runner。
- 不要自动执行生产部署。
- 遇到高风险命令写入 APPROVAL_QUEUE.md。
- 每完成一个任务更新 PROGRESS_LOG.md。

## 完成后执行

```bash
./scripts/finalize.sh
```

如果是在 Windows：

```powershell
./scripts/finalize.ps1
```
