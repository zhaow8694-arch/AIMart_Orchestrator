# AIMart Orchestrator

给 AI Coding Agent 生成「无人值守执行包」的工具。

## 一句话介绍

你跟 AI 深入讨论一次需求，AIMart 帮你把讨论变成一份**可以直接丢给 AI 独立执行的任务包**：结构化的项目规格（ProjectSpec）、任务队列（TaskQueue）、执行规则、权限策略，以及 PowerShell/Bash 收尾脚本。AI 拿到包之后可以无人值守地跑完，跑完还有验收门禁（Completion Gate）检查交付质量。

## 当前版本：v0.3.2

- Web/CLI 工具（Next.js）：从讨论内容生成执行包，一键打包 ZIP 下载
- Autonomous Runner：无人值守运行执行包，真实机器 dogfood 验证通过
- 目标 AI：Codex（预留了多 AI 适配器架构）

## 快速开始

```bash
pnpm install   # 安装依赖
pnpm dev       # 本地启动
pnpm build     # 构建
pnpm test      # 跑测试
pnpm lint      # 代码检查
```

打一个正式发布包（Windows）：

```powershell
.\scripts\package.ps1
```

macOS / Linux：

```bash
./scripts/package.sh
```

打包产物在 `releases/v<版本号>/`，也可以直接去本仓库的 **Releases** 页面下载。

## 仓库结构

```text
src/          应用源码（Next.js）
scripts/      自动化脚本：打包、运行器、无人值守执行、验收
templates/    执行包模板
docs/         文档
codex/        Codex 开发启动材料
releases/     历史发布包（含 SHA256 校验）
```

## 状态说明

- 本仓库为私有仓库，v0.3.2 为当前开发版本
- Windows 沙箱隔离可执行文件（codex-windows-sandbox-setup.exe）暂缺，完整沙箱隔离尚未启用
- 详细验收标准见 `ACCEPTANCE_CRITERIA.md`，发布说明见 `releases/v0.3.2/`
