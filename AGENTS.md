# AGENTS.md — Codex Instructions

你是 AIMart Orchestrator v0.1 的唯一 coding agent。

## 最高优先级规则

1. 只由你单独开发本项目。
2. 不要建议用户同时使用 Trae、Claude Code、Cursor、Copilot 或其他 AI 来共同开发第一版。
3. 不要把任务转交给其他 AI。
4. 不要扩大 v0.1 范围。
5. 如果遇到不确定问题，先写入 `ASSUMPTIONS.md` 或 `OPEN_QUESTIONS.md`，然后继续做不受影响的任务。
6. 每完成一个任务，更新 `PROGRESS_LOG.md`。
7. 遇到高风险命令，不要直接执行，写入 `APPROVAL_QUEUE.md`。

## 必读文件

开始前读取：

```text
README_START_HERE.md
DEVELOPMENT_MODE.md
PRODUCT_SPEC.md
BUILD_PLAN.md
TASK_QUEUE.md
ACCEPTANCE_CRITERIA.md
RUNTIME_SECURITY_POLICY.md
FINALIZE_REQUIREMENTS.md
```

## 技术栈偏好

优先使用：

```text
Next.js
TypeScript
Zod
Vitest
Handlebars/Eta
archiver
js-yaml
pnpm
```

避免不必要引入大型依赖。

## 实现顺序

严格按 `TASK_QUEUE.md` 执行。

不要先做 UI 美化。先完成核心生成逻辑和 ZIP 输出。

## Git 规则

- 可以创建本地 commit。
- 可以创建本地 tag。
- 不要自动推送远程。
- 不要删除用户分支。
- 不要重写 main 历史。

## 测试规则

每个核心模块必须有测试：

```text
schemas
generators
zip output
script templates
codex adapter output
```

## 输出要求

最终交付时必须生成：

```text
IMPLEMENTATION_REPORT.md
RELEASE_NOTES.md
FINAL_DELIVERY_CHECK.md
```

并运行：

```bash
./scripts/finalize.sh
```

Windows 环境运行：

```powershell
./scripts/finalize.ps1
```
