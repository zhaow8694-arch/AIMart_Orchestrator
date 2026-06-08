# AIMart Orchestrator v0.1 Task Queue

> 本任务队列只给 Codex 使用。不要交给 Trae / Claude 混合执行。

## 状态说明

```text
pending：未开始
doing：进行中
done：完成
blocked：阻塞
waiting_approval：需要人工批准，但不阻塞其他任务
```

## TASK-001 初始化项目骨架

```yaml
status: done
phase: setup
risk: L1
dependencies: []
done_criteria:
  - Next.js + TypeScript 项目可以启动
  - pnpm install 成功
  - pnpm lint / test / build 可运行
```

## TASK-002 定义核心 Schema

```yaml
status: done
phase: core
dependencies: [TASK-001]
done_criteria:
  - ProjectSpecSchema 完成
  - TaskQueueSchema 完成
  - RuntimePolicySchema 完成
  - AdapterSchema 完成
  - schema 测试完成
```

## TASK-003 实现讨论到 ProjectSpec 的转换

```yaml
status: done
phase: core
dependencies: [TASK-002]
done_criteria:
  - 用户输入可以生成 ProjectSpec JSON
  - 明确需求、推断假设、待确认问题分开记录
```

## TASK-004 实现 TaskQueue 生成器

```yaml
status: done
phase: core
dependencies: [TASK-003]
done_criteria:
  - 根据 ProjectSpec 生成结构化任务队列
  - 每个任务有依赖、风险、完成标准、测试命令
```

## TASK-005 实现 Runtime Pack 生成器

```yaml
status: done
phase: runtime
dependencies: [TASK-003]
done_criteria:
  - 生成 TOOLCHAIN_MANIFEST.yaml
  - 生成 PERMISSION_POLICY.yaml
  - 生成 INSTALL_PLAN.md
  - 生成 HIGH_RISK_COMMANDS.md
  - 生成 APPROVAL_QUEUE.md
```

## TASK-006 实现 PowerShell/Bash 脚本生成器

```yaml
status: done
phase: runtime
dependencies: [TASK-005]
done_criteria:
  - 生成 preflight/bootstrap/backup/test/git-cleanup/tag-release/package/finalize 双平台脚本
  - finalize 能串联备份、测试、构建、Git 清理、打标签和打包
```

## TASK-007 实现 Codex Target Adapter

```yaml
status: done
phase: adapter
dependencies: [TASK-004,TASK-005]
done_criteria:
  - 生成目标项目 AGENTS.md
  - 生成 CODEX_RUNBOOK.md
  - 生成 CODEX_TASK_PROMPT.md
  - 生成 CODEX_AUTONOMOUS_LOOP.md
```

## TASK-008 实现文档生成器

```yaml
status: done
phase: docs
dependencies: [TASK-003,TASK-005,TASK-006]
done_criteria:
  - README.md 完成
  - RUN_APP.md 完成
  - ENV_SETUP.md 完成
  - SECURITY_AND_PERMISSIONS.md 完成
  - RELEASE_NOTES.md 完成
```

## TASK-009 实现 ZIP 打包器

```yaml
status: done
phase: output
dependencies: [TASK-005,TASK-006,TASK-007,TASK-008]
done_criteria:
  - 能把 common/runtime/scripts/agent_adapters/docs 打成 ZIP
  - ZIP 下载可用
```

## TASK-010 实现 Web UI 最小闭环

```yaml
status: done
phase: ui
dependencies: [TASK-003,TASK-009]
done_criteria:
  - 单页表单可输入深度讨论
  - 点击生成后可下载 ZIP
  - 页面显示 ProjectSpec 摘要
```

## TASK-011 测试和修复

```yaml
status: done
phase: qa
dependencies: [TASK-010]
done_criteria:
  - 单元测试通过
  - build 通过
  - 生成 ZIP 的快照测试通过
```

## TASK-012 最终收尾

```yaml
status: done
phase: finalize
dependencies: [TASK-011]
done_criteria:
  - 运行 scripts/finalize.sh 或 scripts/finalize.ps1
  - 生成 IMPLEMENTATION_REPORT.md
  - 生成 RELEASE_NOTES.md
  - 创建本地 Git tag
  - 输出最终 artifact
```
