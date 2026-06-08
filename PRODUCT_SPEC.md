# AIMart Orchestrator v0.1 Product Spec

## 一句话定位

AIMart Orchestrator 是一个 **AI Coding Agent 无人值守执行包生成器**：通过一次深度讨论，生成项目规范、任务队列、运行时准备文件、权限策略、自动化脚本、交付文档和目标 AI 执行包。

## v0.1 产品目标

v0.1 先做本地可运行的最小闭环：

```text
深度讨论输入
  ↓
ProjectSpec 结构化
  ↓
TaskQueue 生成
  ↓
Runtime Pack 生成
  ↓
Scripts 生成
  ↓
Codex Target Adapter 生成
  ↓
ZIP 打包下载
```

## v0.1 目标用户

- 想用 AI Coding Agent 自动完成项目开发的人。
- 想减少重复解释、重复让 AI 测试、自查、修复和打包的人。
- 希望通过一套规范，让 AI 在自己休息时继续工作的开发者或产品负责人。

## 核心输入

用户需要填写：

```text
项目名称
项目背景
深度讨论内容
MVP 范围
禁止事项
技术栈偏好
目标 AI 执行包类型
执行模式
测试要求
交付要求
安全边界
```

## 核心输出

生成 ZIP 执行包，包含：

```text
/common
  PROJECT_SPEC.md
  TASK_QUEUE.md
  EXECUTION_RULES.md
  SELF_REVIEW.md
  FINAL_DELIVERY_CHECK.md
  ASSUMPTIONS.md
  BLOCKERS.md
  PROGRESS_LOG.md
  HANDOFF.md

/runtime
  TOOLCHAIN_MANIFEST.yaml
  INSTALL_PLAN.md
  PERMISSION_POLICY.yaml
  HIGH_RISK_COMMANDS.md
  APPROVAL_QUEUE.md
  RUNTIME_STATUS.md
  ROLLBACK_PLAN.md

/scripts
  preflight.ps1 / preflight.sh
  bootstrap.ps1 / bootstrap.sh
  backup.ps1 / backup.sh
  test.ps1 / test.sh
  git-cleanup.ps1 / git-cleanup.sh
  tag-release.ps1 / tag-release.sh
  package.ps1 / package.sh
  finalize.ps1 / finalize.sh

/agent_adapters/codex
  AGENTS.md
  CODEX_RUNBOOK.md
  CODEX_TASK_PROMPT.md

/docs
  README.md
  RUN_APP.md
  ENV_SETUP.md
  SECURITY_AND_PERMISSIONS.md
  IMPLEMENTATION_REPORT.md
  RELEASE_NOTES.md
  NEXT_STEPS.md
```

## v0.1 范围

### 必须实现

1. 本地 Web UI。
2. 项目创建页面。
3. 深度讨论输入页面。
4. ProjectSpec JSON 生成逻辑。
5. TaskQueue 生成逻辑。
6. Runtime Pack 生成逻辑。
7. Codex Target Adapter 生成逻辑。
8. PowerShell/Bash 脚本模板生成逻辑。
9. ZIP 打包下载。
10. 基础测试。
11. README/RUN_APP/ENV_SETUP/RELEASE_NOTES 文档生成。

### 可以简化

1. ProjectSpec 解析可先使用规则 + 模板，不强依赖外部 LLM API。
2. UI 可以朴素，不追求设计复杂度。
3. 数据库可先用 SQLite。
4. 用户认证暂不做。

### 明确不做

1. 不开发多用户 SaaS。
2. 不内置云端 Runner。
3. 不自动调用 Codex/Trae/Claude 执行目标项目。
4. 不自动连接生产数据库。
5. 不自动部署生产环境。
6. 不默认推送 Git tag 到远程。
7. 不让多个 AI 混合开发 AIMart Orchestrator v0.1。

## 推荐技术栈

```yaml
language: TypeScript
runtime: Node.js 20+
web: Next.js App Router
ui: basic React components, minimal CSS
schema: Zod
template: Handlebars or Eta
zip: archiver
yaml: js-yaml
test: Vitest
package_manager: pnpm
database: SQLite + Prisma optional
```

如果 Prisma 引入导致第一版复杂，可以先用本地 JSON 文件存储项目。

## 成功标准

v0.1 完成后，用户可以：

1. 启动 AIMart Orchestrator。
2. 粘贴一次深度讨论。
3. 点击生成。
4. 下载一个 ZIP。
5. 解压 ZIP 后看到完整 common/runtime/scripts/docs/codex adapter。
6. 按 `docs/RUN_APP.md` 启动目标项目。
7. 按 `scripts/finalize.*` 完成备份、测试、Git 清理、打标签和打包。
