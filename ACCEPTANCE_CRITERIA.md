# Acceptance Criteria

## 产品验收

v0.1 只有在满足以下条件时才算完成。

### 基础运行

- `pnpm install` 成功。
- `pnpm dev` 可以启动 Web UI。
- `pnpm build` 成功。
- `pnpm test` 成功。

### 输入体验

- 用户可以输入项目名称、讨论内容、MVP、禁止项、技术栈、交付要求。
- 即使信息不完整，系统也能生成 `assumptions` 和 `openQuestions`，而不是假装已确认。

### 输出体验

- 可以生成 ZIP。
- ZIP 内至少包含：

```text
common/PROJECT_SPEC.md
common/TASK_QUEUE.md
common/EXECUTION_RULES.md
runtime/PERMISSION_POLICY.yaml
runtime/TOOLCHAIN_MANIFEST.yaml
scripts/finalize.ps1
scripts/finalize.sh
agent_adapters/codex/AGENTS.md
docs/RUN_APP.md
docs/README.md
```

### Codex-only 开发约束

- 本项目开发过程中没有要求 Trae / Claude 混合参与。
- 代码和文档中清楚区分 Builder Agent 与 Target Adapter。
- v0.1 中 Trae/Claude 只能作为 roadmap，不作为开发参与者。

### 安全边界

- 高风险命令分级 L0-L5。
- `git push`、远程 tag push、生产部署、云资源修改默认进入审批队列。
- 本地 tag 可以自动创建，但远程推送需要明确参数或批准。
- 脚本不能读取 `.env`、SSH key、AWS credentials。

### 自动化收尾

`finalize` 必须至少执行：

1. preflight
2. backup
3. test
4. build
5. git status check
6. local release tag
7. package artifact
8. report generation

### 文档

必须有：

- 如何启动 AIMart Orchestrator。
- 如何使用生成器。
- 生成的执行包如何启动。
- 权限策略说明。
- 自动化收尾脚本说明。
- 已知限制和下一步。
