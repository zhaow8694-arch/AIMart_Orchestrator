# AIMart Orchestrator v0.1 Codex-Only Build Pack

这个包只用于一件事：**让 Codex 单独搭建 AIMart Orchestrator v0.1**。

请不要把 Codex、Trae、Claude Code 混合起来开发第一版。这里的规则是：

```text
开发本系统的 AI：Codex 一个
备选开发 AI：Trae Agent 一个，但不能和 Codex 同时使用
第一版禁止：Codex + Trae + Claude 混合开发
```

## 为什么这里没有 Trae / Claude 开发文件

因为“开发 AI”和“未来导出的目标 AI 执行包”不是一回事。

```text
开发 AI：现在谁来写 AIMart Orchestrator 的代码
目标 AI：AIMart Orchestrator 将来可以给哪些 AI 生成执行包
```

v0.1 的开发路线采用 **Codex-only**。Codex 负责完整实现系统。系统内部可以预留 Adapter Registry 架构，但第一阶段不要真的让 Trae 或 Claude 参与开发。

## v0.1 最小目标

Codex 需要实现一个本地 Web/CLI 工具，能够：

1. 输入一次深度讨论内容。
2. 生成结构化 `ProjectSpec`。
3. 生成 `TaskQueue`、执行规则、权限策略、运行时准备文件。
4. 生成 PowerShell/Bash 自动化收尾脚本模板。
5. 生成 Codex 目标执行包。
6. 打包 ZIP 下载。
7. 输出完整说明文档，包括如何启动应用、如何测试、如何交付。

## v0.1 不做什么

```text
不接入真实 Codex Runner
不让 Trae/Claude 参与开发
不自动执行生产部署
不自动推送 Git tag 到远程
不读取用户密钥
不操作生产数据库
不做多租户 SaaS
```

## 推荐启动方式

把本包解压到一个新仓库根目录，然后用 Codex 执行 `codex/START_PROMPT.md`。

```bash
mkdir aimart-orchestrator
cd aimart-orchestrator
git init
# 把本包所有文件复制进来
```

然后打开 Codex，输入：

```text
请读取 codex/START_PROMPT.md，并严格按照其中规则执行。你是本项目唯一 coding agent。
```

## 人工检查点

Codex 每完成一个阶段后应该更新：

```text
PROGRESS_LOG.md
APPROVAL_QUEUE.md
IMPLEMENTATION_NOTES.md
```

最后必须运行：

```bash
./scripts/finalize.sh
```

Windows：

```powershell
./scripts/finalize.ps1
```
