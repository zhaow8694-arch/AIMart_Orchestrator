# AIMart Orchestrator v0.1 Task Queue

## v0.2.2 Autonomous Completion Gate Task Queue

TASK-041 through TASK-047 are the scoped v0.2.2 tasks. They add the Autonomous Completion Gate and self-verification system while preserving the v0.1.0, v0.1.1, and v0.2.1 release folders.

## TASK-041 Create v0.2.2 Completion Gate Plan

```yaml
status: done
phase: plan
dependencies: [TASK-040]
done_criteria:
  - v0.2.2 scope is limited to Autonomous Completion Gate and self-verification
  - TASK_QUEUE.md records TASK-041 through TASK-047
  - Historical release folders remain untouched
```

## TASK-042 Add v0.2.2 Tests

```yaml
status: done
phase: qa
dependencies: [TASK-041]
done_criteria:
  - Tests expect completion-gate verification scripts
  - Tests expect generated runtime completion-gate docs
  - Tests expect generated Codex completion-gate runbook
  - Tests expect generated sample execution-pack ZIP entries
```

## TASK-043 Implement Completion Gate Scripts

```yaml
status: done
phase: scripts
dependencies: [TASK-042]
done_criteria:
  - verify-release scripts check release artifacts and SHA256 values
  - verify-source-zip scripts reject forbidden source ZIP entries
  - verify-sample-pack scripts extract and verify required sample pack files
  - verify-history-releases scripts protect v0.1.0, v0.1.1, and v0.2.1
  - verify-autonomous-completion scripts run all completion gates
```

## TASK-044 Implement Generated Completion Gate Pack Files

```yaml
status: done
phase: generator
dependencies: [TASK-043]
done_criteria:
  - runtime/AUTONOMOUS_COMPLETION_GATE.md is generated
  - runtime/AUTONOMOUS_VERIFICATION_REPORT.md is generated
  - agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md is generated
  - generated docs reference v0.2.2 completion-gate behavior
```

## TASK-045 Update Unified Autonomous Runner Gate Behavior

```yaml
status: done
phase: adapter
dependencies: [TASK-044]
done_criteria:
  - Unified runner displays target version, branch, clean startup state, existing Codex process detection, release artifact status, log activity, and stalled-log status
  - Unified runner runs the Autonomous Completion Gate at the end
  - Unified runner prints PASS or FAIL and points to the verification report on failure
```

## TASK-046 Update Version And v0.2.2 Delivery Docs

```yaml
status: done
phase: release
dependencies: [TASK-045]
done_criteria:
  - package.json and UI metadata are updated to 0.2.2
  - V0.2.2_IMPLEMENTATION_REPORT.md is generated
  - V0.2.2_RELEASE_NOTES.md is generated
  - V0.2.2_FINAL_DELIVERY_CHECK.md is generated
  - V0.2.2_KNOWN_ISSUES.md is generated
```

## TASK-047 Verify And Package v0.2.2

```yaml
status: done
phase: finalize
dependencies: [TASK-046]
done_criteria:
  - pnpm test passes
  - pnpm lint passes
  - pnpm build passes
  - releases/v0.2.2 source ZIP exists
  - releases/v0.2.2/samples/todo-api-generated-execution-pack.zip exists
  - SHA256.txt and RELEASE_MANIFEST.txt exist
  - Autonomous Completion Gate passes
  - local tag v0.2.2 exists and points to the final commit
```

## v0.2.1 Unified Autonomous Visual Runner Task Queue

TASK-034 through TASK-040 are the scoped v0.2.1 tasks. They add a single-window Codex unified autonomous runner to generated execution packs while preserving the v0.1.0, v0.1.1, and v0.2.0 release folders.

## TASK-034 Create v0.2.1 Execution Plan

```yaml
status: done
phase: plan
dependencies: [TASK-033]
done_criteria:
  - v0.2.1 scope is limited to Unified Autonomous Visual Runner integration
  - TASK_QUEUE.md records TASK-034 through TASK-040
  - Historical release folders remain untouched
```

## TASK-035 Add v0.2.1 Tests

```yaml
status: done
phase: qa
dependencies: [TASK-034]
done_criteria:
  - Tests expect generated Codex unified autonomous runner files
  - Tests expect runtime AUTONOMOUS_RUN_STATUS, AUTONOMOUS_RUN_SUMMARY, and AUTONOMOUS_HEALTH_CHECK files
  - Tests expect unified autonomous mode schema/API/UI coverage when generation model changes
  - Tests expect generated ZIP entries for the new files
```

## TASK-036 Implement Unified Autonomous Execution Mode

```yaml
status: done
phase: core
dependencies: [TASK-035]
done_criteria:
  - ProjectSpec accepts supervised, autonomous, and unified_autonomous execution modes
  - Legacy codex_only/manual inputs remain non-breaking
  - UI copy makes one-window status display clear
```

## TASK-037 Implement Runtime Run Status Files

```yaml
status: done
phase: runtime
dependencies: [TASK-036]
done_criteria:
  - runtime/AUTONOMOUS_RUN_STATUS.md is generated
  - runtime/AUTONOMOUS_RUN_SUMMARY.md is generated
  - runtime/AUTONOMOUS_HEALTH_CHECK.md is generated
```

## TASK-038 Implement Codex Unified Autonomous Adapter Files

```yaml
status: done
phase: adapter
dependencies: [TASK-037]
done_criteria:
  - CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md is generated
  - run-codex-unified-autonomous.ps1 is generated
  - run-codex-unified-autonomous.sh is generated
  - unified runners use workspace-write with approval never and do not perform forbidden actions
```

## TASK-039 Update v0.2.1 Version And Delivery Docs

```yaml
status: done
phase: release
dependencies: [TASK-038]
done_criteria:
  - package.json and UI metadata are updated to 0.2.1
  - V0.2.1_IMPLEMENTATION_REPORT.md is generated
  - V0.2.1_RELEASE_NOTES.md is generated
  - V0.2.1_FINAL_DELIVERY_CHECK.md is generated
  - V0.2.1_KNOWN_ISSUES.md is generated
```

## TASK-040 Verify And Package v0.2.1

```yaml
status: done
phase: finalize
dependencies: [TASK-039]
done_criteria:
  - pnpm lint passes
  - pnpm test passes
  - pnpm build passes
  - releases/v0.2.1 source ZIP exists
  - releases/v0.2.1/samples/todo-api-generated-execution-pack.zip exists
  - SHA256.txt and RELEASE_MANIFEST.txt exist
  - local tag v0.2.1 exists
```

## v0.2.0 Sandbox Autonomous Mode Task Queue

TASK-025 through TASK-033 are the scoped v0.2.0 tasks. They extend generated Codex execution packs with a sandboxed autonomous run profile while preserving the v0.1.0 and v0.1.1 release folders.

## TASK-025 Create v0.2.0 Execution Plan

```yaml
status: done
phase: plan
dependencies: [TASK-024]
done_criteria:
  - v0.2.0 scope is limited to Sandbox Autonomous Mode
  - TASK_QUEUE.md records TASK-025 through TASK-033
  - Historical release folders remain untouched
```

## TASK-026 Add v0.2.0 Tests

```yaml
status: done
phase: qa
dependencies: [TASK-025]
done_criteria:
  - Tests expect explicit supervised/autonomous execution modes
  - Tests expect new Codex autonomous files in generated execution packs
  - Tests expect runtime SAFE_COMMANDS, DENIED_COMMANDS, and AUTONOMOUS_EXECUTION_POLICY files
  - Tests expect UI mode selector and v0.2.0 version metadata
```

## TASK-027 Implement Execution Mode Schema And API Flow

```yaml
status: done
phase: core
dependencies: [TASK-026]
done_criteria:
  - ProjectSpec accepts supervised and autonomous execution modes
  - Legacy codex_only/manual inputs remain non-breaking
  - API and generated ProjectSpec summaries expose execution mode
```

## TASK-028 Implement Runtime Command Policy Files

```yaml
status: done
phase: runtime
dependencies: [TASK-027]
done_criteria:
  - runtime/SAFE_COMMANDS.md is generated with allowed automated commands
  - runtime/DENIED_COMMANDS.md is generated with forbidden automation commands
  - runtime/AUTONOMOUS_EXECUTION_POLICY.md is generated with sandbox boundaries
  - runtime/APPROVAL_QUEUE.md explains autonomous queue handling
```

## TASK-029 Implement Codex Autonomous Adapter Files

```yaml
status: done
phase: adapter
dependencies: [TASK-028]
done_criteria:
  - CODEX_AUTONOMOUS_PROMPT.md is generated
  - CODEX_AUTONOMOUS_RUNBOOK.md is generated
  - supervised and autonomous PowerShell launch scripts are generated
  - supervised and autonomous Bash launch scripts are generated
  - scripts use workspace-write with approval never or on-request and avoid dangerous bypass/full-access mode
```

## TASK-030 Update Generated Documentation

```yaml
status: done
phase: docs
dependencies: [TASK-029]
done_criteria:
  - docs/README.md explains generated execution-pack ZIPs versus source release ZIPs
  - docs/RUN_APP.md explains supervised and autonomous Codex starts
  - docs/SECURITY_AND_PERMISSIONS.md explains logs and APPROVAL_QUEUE handling
```

## TASK-031 Update Web UI Execution Mode Configuration

```yaml
status: done
phase: ui
dependencies: [TASK-030]
done_criteria:
  - UI includes Supervised Mode and Autonomous Mode selector
  - Supervised Mode remains the default
  - UI copy distinguishes source release ZIP from generated execution-pack ZIP
```

## TASK-032 Update Version And Delivery Docs

```yaml
status: done
phase: release
dependencies: [TASK-031]
done_criteria:
  - package.json and UI metadata are updated to 0.2.0
  - V0.2.0_IMPLEMENTATION_REPORT.md is generated
  - V0.2.0_RELEASE_NOTES.md is generated
  - V0.2.0_FINAL_DELIVERY_CHECK.md is generated
  - V0.2.0_KNOWN_ISSUES.md is generated
```

## TASK-033 Verify And Package v0.2.0

```yaml
status: blocked
phase: finalize
dependencies: [TASK-032]
done_criteria:
  - pnpm lint passes
  - pnpm test passes
  - pnpm build passes (blocked in current sandbox)
  - releases/v0.2.0 source ZIP exists (blocked in current sandbox)
  - releases/v0.2.0/samples/todo-api-generated-execution-pack.zip exists (blocked in current sandbox)
  - SHA256.txt and RELEASE_MANIFEST.txt exist (blocked in current sandbox)
  - local tag v0.2.0 exists (blocked in current sandbox)
```

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
