# AIMart Orchestrator v0.1 Task Queue

## v0.1.1 Patch Task Queue

TASK-013 through TASK-024 are the scoped v0.1.1 patch tasks. They must be executed in numeric order after TASK-012.

## TASK-013 Create v0.1.1 Fix Plan

```yaml
status: done
phase: patch-plan
dependencies: [TASK-012]
done_criteria:
  - V0.1.1_FIX_PLAN.md defines the patch scope
  - TASK_QUEUE.md records TASK-013 through TASK-024
```

## TASK-014 Fix Web UI Loading State

```yaml
status: done
phase: ui
dependencies: [TASK-013]
done_criteria:
  - New generation clears stale summary and download state
  - Submit button exposes an accessible busy state while generating
  - Regression test covers the loading state
```

## TASK-015 Standardize Forbidden Items Wording

```yaml
status: done
phase: docs
dependencies: [TASK-014]
done_criteria:
  - UI label and generated docs use "Forbidden items"
  - Codex adapter output uses the same wording
  - Tests cover the wording
```

## TASK-016 Distinguish Source Release ZIP From Generated Execution Pack ZIP

```yaml
status: done
phase: release
dependencies: [TASK-015]
done_criteria:
  - Release notes distinguish source release artifacts from generated execution packs
  - Final delivery docs point to the generated sample pack separately
```

## TASK-017 Correct FINAL_DELIVERY_CHECK Wording

```yaml
status: done
phase: docs
dependencies: [TASK-016]
done_criteria:
  - FINAL_DELIVERY_CHECK.md says generated execution pack includes docs/README.md and docs/RUN_APP.md
  - finalize scripts generate the corrected wording
```

## TASK-018 Fix RELEASE_MANIFEST / Packaging Exclusion Mismatch

```yaml
status: done
phase: release
dependencies: [TASK-017]
done_criteria:
  - v0.1.1 manifest describes actual exclusions
  - Internal artifact directories are excluded from source release ZIP contents
```

## TASK-019 Handle package.sh zip Dependency

```yaml
status: done
phase: scripts
dependencies: [TASK-018]
done_criteria:
  - Unix preflight requires zip for release ZIP creation
  - package.sh no longer silently emits tar.gz fallback
  - Generated execution-pack preflight documents the zip requirement
```

## TASK-020 Update Version To 0.1.1

```yaml
status: done
phase: release
dependencies: [TASK-019]
done_criteria:
  - package.json version is 0.1.1
  - application version metadata is 0.1.1
  - tests expect 0.1.1
```

## TASK-021 Update Tests

```yaml
status: done
phase: qa
dependencies: [TASK-020]
done_criteria:
  - Tests cover all v0.1.1 fixes
```

## TASK-022 Run lint/test/build

```yaml
status: done
phase: qa
dependencies: [TASK-021]
done_criteria:
  - pnpm.cmd run lint passes
  - pnpm.cmd run test passes
  - pnpm.cmd run build passes
```

## TASK-023 Generate v0.1.1 Delivery Documents

```yaml
status: done
phase: finalize
dependencies: [TASK-022]
done_criteria:
  - IMPLEMENTATION_REPORT.md updated for v0.1.1
  - RELEASE_NOTES.md updated for v0.1.1
  - FINAL_DELIVERY_CHECK.md updated for v0.1.1
```

## TASK-024 Generate v0.1.1 Release Artifact

```yaml
status: done
phase: release
dependencies: [TASK-023]
done_criteria:
  - v0.1.1 local tag exists
  - v0.1.1 source release ZIP exists
  - v0.1.1 sample generated execution-pack ZIP exists
```

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
