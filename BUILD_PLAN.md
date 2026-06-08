# AIMart Orchestrator v0.1 Build Plan

## 总原则

只用 Codex 单独开发。不要调用、等待或转交给 Trae / Claude / Cursor / Copilot。

## 阶段 1：初始化项目

目标：建立 Next.js + TypeScript 项目骨架。

任务：

1. 初始化 pnpm workspace 或单体 Next.js 项目。
2. 添加 TypeScript、Vitest、ESLint。
3. 创建目录：

```text
src/app
src/components
src/lib/core
src/lib/generators
src/lib/templates
src/lib/adapters
src/lib/zip
src/lib/schemas
```

验收：

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

## 阶段 2：Schema 层

目标：定义核心数据结构。

必须实现：

```text
ProjectSpecSchema
TaskQueueSchema
RuntimePolicySchema
ToolchainManifestSchema
PermissionPolicySchema
AgentAdapterSchema
GeneratedPackSchema
```

验收：

- schema 有单元测试。
- 无效输入能返回清晰错误。

## 阶段 3：讨论解析器

目标：将用户输入转成 ProjectSpec。

v0.1 可以先使用半结构化解析：

1. 用户填写表单字段。
2. rawDiscussion 作为 ProjectSpec 的重要来源。
3. 未能识别的信息写入 `assumptions` 或 `openQuestions`。

验收：

- 输入最小讨论文本，也能生成有效 ProjectSpec。
- 明确区分 explicitRequirements / inferredAssumptions / openQuestions。

## 阶段 4：任务队列生成器

目标：根据 ProjectSpec 生成 TaskQueue。

任务字段：

```text
id
title
description
phase
dependencies
riskLevel
allowedCommands
doneCriteria
testCommand
rollbackNote
status
```

验收：

- 至少生成初始化、核心功能、测试、文档、收尾五类任务。
- 每个任务有完成标准。

## 阶段 5：Runtime Pack 生成器

目标：生成运行时准备文件。

必须生成：

```text
TOOLCHAIN_MANIFEST.yaml
INSTALL_PLAN.md
PERMISSION_POLICY.yaml
HIGH_RISK_COMMANDS.md
APPROVAL_QUEUE.md
RUNTIME_STATUS.md
ROLLBACK_PLAN.md
```

验收：

- 权限分级 L0-L5。
- 高风险命令默认不自动执行。
- 遇到审批项时进入 APPROVAL_QUEUE，而不是阻塞整个任务队列。

## 阶段 6：脚本生成器

目标：生成 PowerShell 和 Bash 自动化脚本。

必须生成：

```text
preflight
bootstrap
backup
test
git-cleanup
tag-release
package
finalize
```

验收：

- Windows 和 macOS/Linux 均有脚本。
- finalize 调用完整收尾流程。
- push tag、删除远程资源等高风险操作默认受审批控制。

## 阶段 7：Codex Target Adapter

目标：生成给目标项目 Codex 使用的执行包。

必须生成：

```text
AGENTS.md
CODEX_RUNBOOK.md
CODEX_TASK_PROMPT.md
CODEX_AUTONOMOUS_LOOP.md
```

验收：

- Codex 能理解项目事实、任务队列、权限策略和收尾脚本。
- 明确禁止目标 AI 扩大 MVP 范围。

## 阶段 8：文档生成器

目标：生成最终说明文档。

必须生成：

```text
README.md
RUN_APP.md
ENV_SETUP.md
SECURITY_AND_PERMISSIONS.md
IMPLEMENTATION_REPORT.md
RELEASE_NOTES.md
NEXT_STEPS.md
```

验收：

- 用户可以按 RUN_APP.md 启动目标应用。
- 用户可以按 SECURITY_AND_PERMISSIONS.md 理解哪些操作被允许/禁止。

## 阶段 9：Web UI

目标：可视化生成执行包。

页面：

```text
/
/projects/new
/projects/[id]
/projects/[id]/spec
/projects/[id]/generate
/projects/[id]/result
```

第一版可简化为单页：输入表单 + 生成按钮 + 下载 ZIP。

## 阶段 10：ZIP 打包

目标：把所有生成文件打包。

验收：

- ZIP 目录结构正确。
- 文件内容不是空模板。
- 下载可用。

## 阶段 11：最终收尾

目标：运行项目自身的 finalize 脚本。

必须完成：

```text
备份
测试
构建
Git 状态检查
本地 release tag
ZIP/package artifact
IMPLEMENTATION_REPORT
RELEASE_NOTES
```
