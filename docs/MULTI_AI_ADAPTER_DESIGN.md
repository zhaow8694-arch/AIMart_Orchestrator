# 第二适配器设计：Claude Code CLI

状态：已实现，功能开关 `AIMART_ENABLE_CLAUDE_CODE_LAUNCHER` 默认关闭。默认运行路径继续是 Codex。

## 1. 选 Claude Code CLI

仓库的注册表 `src/lib/adapters/registry.ts` 已经列出四个 id：`codex`、`claude-code`、`trae`、`cursor`。`src/lib/schemas/core.ts` 的 `AgentAdapterIdSchema` 与此一致。`generateAgentAdapters`（`src/lib/adapters/multi-target.ts`）对四个 id 都会吐文件。真正能被 Autonomous Runner 拉起来的只有 Codex：`src/lib/adapters/codex.ts` 的 `generateCodexAdapter` 发出 `.ps1` / `.sh`，里面是 `codex exec`。另外三个在 `multi-target.ts` 里是说明文件。Claude 的启动说明是 `run-claude-supervised.md` 和 `run-claude-autonomous.md`，内容是「打开工作区，把提示贴进去」。Trae、Cursor 同样是手册，没有进程退出码，也没有日志契约。

第二适配器选 **Claude Code CLI（`claude -p`）**。它是这四个里唯一一个和 `codex exec` 同形的无头进程：读工作区、改文件、跑 shell、以退出码结束、能输出逐行 JSON。注册表 id、目录 `agent_adapters/claude-code/`、测试 `src/lib/adapters/multi-target.test.ts` 和 `scripts/verify-autonomous-completion.ps1` 里的路径检查都已经占好这个名字。

不选本地 Ollama 作为这一个适配器。`ollama run` 是补全接口，没有与 Codex 对等的工具循环、权限开关和会话退出码。要把它接上无人值守执行包，等于在适配器里再写一套代理运行时（读任务、决定调 shell、解析工具结果）。那是另一个产品，不是「同一个接口的第二个实现」。本仓库的完成定义包含 `pnpm test`、`pnpm lint`、`pnpm build` 和 Completion Gate；一个裸本地模型接不住这条链路。以后若要做本地模型，应单独立项，而不是占用这次的第二适配器。

不把 Trae 或 Cursor 升级成第二适配器。它们在本仓库里的定位是「人打开 IDE 后使用的独立选项」（`registry.ts` 的 `bestUseNotes`，以及 `multi-target.ts` 里「不要对同一工作区同时跑多个代理」）。IDE 会话没有 `run-autonomous-version.ps1` 能等待的退出码。

Claude Code 的无头形态以官方 CLI 为准（`--print` / `-p`、`--output-format text|json|stream-json`、`--permission-mode`、`--allowedTools` / `--disallowedTools`、`--max-turns`、`--resume`）。实现时以本机 `claude --help` 为准核对一遍开关名；本文下面的参数表是合同，不是把某一天的帮助文本粘进来。

## 2. Codex 今天实际满足的契约

`src/` 里没有一个叫 `AgentAdapter` 的类。契约是「注册表条目 + 生成函数 + 生成脚本的运行职责」。Claude 适配器实现同一组职责。下面按代码里已经存在的行为列出，不按希望中的接口倒推。

### 2.1 注册

`AgentAdapterRegistryEntry`（`registry.ts`）要求：`id`、`displayName`、`generatedAdapterDirectory`、`supportedRunModes`（`supervised` | `autonomous` | `end_to_end_autonomous`）、`requiredRunbookFiles`、`requiredPromptFiles`、`permissionModelSummary`、`bestUseNotes`、`completionGateRequirements`。

Codex 的目录是 `agent_adapters/codex`。三种模式都支持。完成条件是运行手册、提示、以及监督 / 自主 / 统一 / 端到端四种启动器的 ps1 和 sh 都存在。

### 2.2 生成文件

`generateCodexAdapter(projectSpec, taskQueue, runtimePack): AgentAdapter`。返回值过 `AgentAdapterSchema`：`adapterType` 为 `"codex"` 或 `"multi_target"`，外加 `selectedAdapterIds` 和 `files[]`（`path` + `content`）。Codex 这一支固定 18 个路径，`codex.test.ts` 锁着完整列表：

- 提示与规则：`AGENTS.md`、`CODEX_TASK_PROMPT.md`、`CODEX_AUTONOMOUS_PROMPT.md`、`CODEX_END_TO_END_AUTONOMOUS_PROMPT.md`
- 运行手册：`CODEX_RUNBOOK.md`、`CODEX_AUTONOMOUS_LOOP.md`、`CODEX_AUTONOMOUS_RUNBOOK.md`、`CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md`、`CODEX_COMPLETION_GATE_RUNBOOK.md`、`CODEX_END_TO_END_DELIVERY_RUNBOOK.md`
- 启动器：`run-codex-autonomous.ps1`、`run-codex-supervised.ps1`、`run-codex-unified-autonomous.ps1`、`run-codex-end-to-end-autonomous.ps1`，以及同名的 `.sh`

非 Codex 适配器不经过这个函数。它们由 `multi-target.ts` 里的私有函数生成，而且 `generateClaudeCodeAdapter` 目前不接收 `runtimePack`，所以写不出和权限策略对齐的真实设置。

### 2.3 组装提示

提示是生成期的 Markdown，不是运行期再拼的字符串。`CODEX_TASK_PROMPT.md` 嵌入任务 id、标题、阶段、风险、依赖、完成标准、测试命令，以及 `runtimePack.permissionPolicy.commandRules`。自主提示要求按 `runtime/SAFE_COMMANDS.md` 执行、把高风险命令写入 `runtime/APPROVAL_QUEUE.md`、结束前跑 Completion Gate。`AGENTS.md` 写入项目名、执行模式、MVP 范围、禁止项和安全边界。

### 2.4 启动

生成的 ps1 做这些事（`renderCodexPs1` 与统一 / 端到端变体）：

1. 工作区根 = 脚本路径向上三级（脚本位于 `agent_adapters/codex/`）。
2. 建日志目录。单次模式写 `.aimart/logs/codex-<mode>-<stamp>.log`。统一模式写 `codex_runs/codex-unified-autonomous-<stamp>.log` 和同名 `.exit`。
3. 提示文件经 stdin 送入 CLI，不把整份提示放进 argv。这是为了避开 Windows 命令行长度和 `CODEX_PROMPT_ARGUMENT_SPLIT`。
4. 自主模式参数：`codex exec --approve-for-me --skip-git-repo-check --cd <root>`。`--approve-for-me` 自带 workspace-write 语义，不能再加 `--sandbox`。
5. 监督模式参数：`codex exec --sandbox workspace-write --skip-git-repo-check --cd <root>`，审批保持 CLI 默认的交互式。
6. 调用周围把 `ErrorActionPreference` 降到 `Continue`，因为 Codex 把信息行写到 stderr，在 `Stop` 下 PowerShell 5.1 会把管道当成终止错误。
7. 统一模式在 CLI 退出后写 `runtime/AUTONOMOUS_RUN_STATUS.md`、`runtime/AUTONOMOUS_RUN_SUMMARY.md`、`runtime/AUTONOMOUS_HEALTH_CHECK.md`，并读取完成门结果。

仓库级入口 `scripts/run-autonomous-version.ps1` 的阶段名 `CODEX_EXECUTION` 不调用上述生成脚本。它跑的是本仓库自己的验证和打包。客户包入口是 `START_CODEX_AUTONOMOUS.ps1` 和 `scripts/run-customer-autonomous.*`（由 `src/lib/generators/script-pack.ts` 生成）。第二适配器要同时接上「生成包里的启动器」和「本仓库 Runner 在将来把 `activeAdapterId` 指到 claude-code 时的那一跳」。阶段名保持 `CODEX_EXECUTION`，避免阶段机和既有日志的名字变化；适配器身份写进状态文件，不写进阶段名。

### 2.5 事件

Codex 路径没有结构化事件。`Tee-Object` 把 stdout 和 stderr 合成一个文本日志。运行中的「状态」是脚本自己刷新的 Markdown（耗时、git 状态、门禁状态），不是 CLI 的事件协议。

### 2.6 产物

一次运行留下：文本日志、退出码、`runtime/AUTONOMOUS_RUN_SUMMARY.md` 里的表（Codex 退出码、最终退出码、发布物、样例包、Autonomous Completion Gate、失败门、验证报告路径、git 状态、日志路径、下一步）。代理按提示把 `runtime/COMPLETION_GATE_REPORT.md` 写成 PASS 或 FAIL。失败分类在 `scripts/classify-runner-failure.ps1`，已有 `CODEX_ARGUMENT_ORDER` 和 `CODEX_PROMPT_ARGUMENT_SPLIT`。

### 2.7 超时与重试

生成脚本和 `run-autonomous-version.ps1` 都没有超时，也没有重试。进程一直等到 CLI 自己退出。失败后由人按 `runtime/RUNNER_NEXT_ACTION.md` 重跑整条批准过的命令。

Claude 适配器遵守第 2.1–2.7 的职责。结构化事件是在这个契约上补齐的公共模型，Codex 一侧用「一行日志 → 一个 `log_line`」填上，不要求 Codex CLI 开始发 JSON。

## 3. 公共接口，以及 Claude 如何实现

新增 `src/lib/adapters/types.ts`，把上面的职责收成类型。`generateCodexAdapter` 保持原签名和原路径，避免挪动 `codex.test.ts`。Claude 用同一个类型。

```ts
type AdapterRunMode = "supervised" | "autonomous" | "end_to_end_autonomous";

type RunnerEvent =
  | { type: "run_started"; adapterId: string; mode: AdapterRunMode; cwd: string }
  | { type: "assistant_text"; text: string }
  | { type: "tool_use"; name: string; inputSummary: string }
  | { type: "tool_result"; name: string; ok: boolean; exitCode?: number }
  | { type: "approval_required"; command: string; risk: string }
  | { type: "log_line"; stream: "stdout" | "stderr"; text: string }
  | { type: "run_finished"; exitCode: number; durationMs?: number; sessionId?: string;
      isError?: boolean; numTurns?: number; costUsd?: number };

type AgentRuntimeAdapter = {
  id: AgentAdapterId;
  // 与 generateCodexAdapter 相同的入参，返回 files，由 generateAgentAdapters 包进 AgentAdapterSchema
  generateFiles(projectSpec: ProjectSpec, taskQueue: TaskQueue, runtimePack: RuntimePack): FileEntry[];
  // 生成期就定下的启动形状，写进 ps1/sh，不在运行期再选择另一套 CLI
  launchSpec(mode: AdapterRunMode): LaunchSpec;
  mapEvent(line: string): RunnerEvent | null;
  // 统一模式脚本在 CLI 退出后调用的那部分：读日志和退出码，写 runtime/AUTONOMOUS_*.md
  reportStatus(input: { exitCode: number; logPath: string; events: RunnerEvent[] }): RunSummary;
};

type LaunchSpec = {
  executable: "codex" | "claude";
  argv: string[];          // 不含提示正文
  promptPath: string;      // 经 stdin 送入
  stdin: "prompt-file";
  outputFormat: "text-log" | "stream-json";
  timeoutSec: number;
  retry: { maxAttempts: 1 | 2; retryOn: Array<"spawn-failure" | "rate-limit"> };
};
```

公共事件的 Zod schema 放在 `src/lib/adapters/events.ts`，和 `src/lib/schemas/core.ts` 的风格一致。Codex 映射函数 `mapCodexLogLine` 把非空行变成 `log_line`，进程结束补一条 `run_finished`。Claude 映射函数 `mapClaudeStreamJson` 解析 `--output-format stream-json` 的一行一个 JSON。

Claude 实现放在新文件 `src/lib/adapters/claude-code.ts`，导出 `generateClaudeCodeAdapter`。`multi-target.ts` 里的私有 `generateClaudeCodeAdapter` 改为调用它。`id === "codex"` 的分支继续只调用 `generateCodexAdapter`。

`launchSpec` 的具体值：

| 项 | Codex（保持现状） | Claude Code |
|---|---|---|
| 可执行文件 | `codex` | `claude` |
| 自主 argv | `exec --approve-for-me --skip-git-repo-check --cd <root>` | `-p --output-format stream-json --input-format text --verbose --permission-mode dontAsk --max-turns 80 --settings <settings.json> --append-system-prompt "<一行指针>"` |
| 监督 argv | `exec --sandbox workspace-write --skip-git-repo-check --cd <root>` | `-p --output-format stream-json --input-format text --verbose --permission-mode acceptEdits --settings <settings.json> --append-system-prompt "<一行指针>"` |
| stdin | 提示文件全文 | 同左。禁止把提示正文放进 argv |
| 输出 | 文本日志 | `stream-json` 落盘，同时由映射写成 `events.jsonl` |
| 超时 | 见沙箱方案：自主 90 分钟，端到端 6 小时 | 同左，数字来自 `runtime/SANDBOX_PROFILE.json`，两边不要各写一套 |
| 重试 | 不重试超时和门禁 FAIL | 最多 2 次尝试，仅当进程没创建成功，或事件里出现 429/529。认证失败、达到 `--max-turns`、门禁 FAIL 不重试 |

`--append-system-prompt` 的那一行固定为：遵循 `agent_adapters/claude-code/CLAUDE.md`、`common/TASK_QUEUE.md`、`runtime/SAFE_COMMANDS.md`、`runtime/DENIED_COMMANDS.md`，并且本工作区只有这一个代理。长规则留在文件里，不塞进命令行。

不使用 `--dangerously-skip-permissions`，不使用 `--permission-mode bypassPermissions`。这和 `codex.test.ts` 禁止 `dangerously-bypass-approvals-and-sandbox` 是同一条线。也不使用 `--bare`：那个开关会跳过项目设置和 CLAUDE 规则，而本适配器依赖 `--settings` 指向的文件。

`dontAsk` 在无头运行里对未允许的工具直接拒绝，进程不会停下来等一个不存在的人。这和 `RUNTIME_SECURITY_POLICY.md` 里「非阻塞审批项先去做别的」一致：被拒绝的 shell 记成 `approval_required` 事件，脚本把该命令追加到 `runtime/APPROVAL_QUEUE.md`，代理按提示继续队列里其余任务。监督模式用 `acceptEdits`（文件写入不再逐次询问，shell 仍走 settings 里的允许规则），给人留交互。监督模式不接入 `run-autonomous-version.ps1`。

## 4. 必须单独处理的差异

### 4.1 进程形态

Codex 的子命令是 `exec`，提示在 stdin，工作目录用 `--cd`。Claude 的无头开关是 `-p`，工作目录是进程的 cwd，因此 ps1 在启动前 `Set-Location` 到包根，同时仍传一份明确的 cwd 给包装器。两边都要在调用周围放宽 `ErrorActionPreference`，Claude 同样会往 stderr 写进度。

登录态不同。Codex 用本机 `codex` 已经完成的登录。Claude 用本机 `claude` 的登录或 `ANTHROPIC_API_KEY`。密钥的放置方式跟沙箱方案同一条：不从开发者环境继承，预检时执行 `claude -p "ping" --max-turns 1` 的短调用，失败且输出含认证错误则分类为 `CLAUDE_NOT_AUTHENTICATED`，不重试，不把密钥写进执行包。

会话。Claude 的 `stream-json` 最终结果里有 `session_id`。脚本把它写到 `runtime/sandbox/<runId>/claude-session.txt`。续跑使用 `--resume <session_id>`，并且只在上一次退出码属于「进程被包装器以外的原因打断、且已有 session 文件」时使用。新的一次交付默认新会话。Codex 侧没有这个文件，`reportStatus` 对缺失的 session 写 `none`。

### 4.2 权限开关

Codex 自主模式的「批准」是 CLI 的 `--approve-for-me`，写范围是 workspace-write。Claude 的等价物拆成两处：

1. `--permission-mode dontAsk`。
2. `agent_adapters/claude-code/settings.json`，由 `runtimePack.permissionPolicy.commandRules` 生成。`allow` 收 `action: allow` 的命令，映射成 Claude 的 `Bash(<前缀> *)` 以及固定的 `Read`、`Edit`。`deny` 收 `action: deny` 和 `queue_for_approval` 的命令，映射成 `Bash(<前缀> *)`。读密钥的规则额外写成 `Read(~/.ssh/**)`、`Read(~/.aws/**)` 这类拒绝项。

`settings.example.json` 今天已经存在，测试只检查路径。保留它作为说明性样例。真正被 `--settings` 指向的是旁边的 `settings.json`。settings 的字段名以本机 Claude Code 的项目设置为准；`claude-code.test.ts` 用一份夹具锁住「从一组 commandRules 生成的 allow/deny 键」，实现时若帮助文本里的键名不同，改夹具并在本文件顶部的「核对」一句里留版本号，不另造一套权限语义。

高风险命令仍以 `runtime/APPROVAL_QUEUE.md` 为队列。settings 的拒绝让 CLI 不会真的去跑；队列文件让 Completion Gate 和人能看见模型想跑什么。两处都要有。

### 4.3 事件映射

`stream-json` 一行一个 JSON。映射规则：

| Claude 行 | RunnerEvent |
|---|---|
| `type` 为系统且子类型为 init | `run_started`，带上 `session_id` |
| assistant 消息里的文本块 | `assistant_text` |
| assistant 消息里的 `tool_use` 块 | `tool_use`。`inputSummary` 只保留工具名和截断到 200 字的输入，不回写可能含密钥的完整参数 |
| 随后的工具结果 | `tool_result`。shell 工具从结果里取退出码 |
| 权限被拒绝的工具 | `approval_required` |
| 无法识别但非空的行 | `log_line`，保证日志不丢 |
| `type` 为 `result` | `run_finished`。`is_error`、`duration_ms`、`num_turns`、`total_cost_usd`、`session_id` 对应该文档公开的结果字段 |

Codex 文本日志不产生 `tool_use`。Completion Gate 不得要求 Codex 运行存在 `tool_use` 事件。

`reportStatus` 两边都写现在统一脚本已经在写的那些 Markdown，表头保持稳定，增加一行 `Adapter`。Claude 的 `is_error: true` 或非零退出码使最终退出码非零。`numTurns` 达到 `launchSpec` 里的 `--max-turns` 时分类为 `CLAUDE_MAX_TURNS`。流在没有 `result` 行的情况下结束，分类为 `CLAUDE_STREAM_TRUNCATED`。

费用字段只记入摘要，不作为 PASS/FAIL 条件。阈值会让同一次交付因为模型定价波动而失败。

### 4.4 超时和重试

超时由沙箱包装器 `scripts/invoke-sandboxed.ps1` 统一执行（见 `docs/SANDBOX_ISOLATION_PLAN.md`）。适配器只声明 `timeoutSec`，不自己 `taskkill`。超时退出码 `1460`，分类 `SANDBOX_TIMEOUT`，不重试。

重试发生在包装器之内、第二次启动之前，间隔 30 秒，次数见 `LaunchSpec.retry`。第二次仍失败则把最后一次的日志路径写进摘要。禁止对同一次失败启动第三个进程。

## 5. 执行包如何保持一份

执行包的中立部分今天已经按适配器拆开，不要再拆一份。

| 文件 | 今天在哪 | 第二适配器怎么对待 |
|---|---|---|
| `common/TASK_QUEUE.md` | `src/lib/zip/packager.ts` 从 `TaskQueue` 生成 | 两个适配器都读这一份。不生成 `TASK_QUEUE.codex.md` |
| `common/PROJECT_SPEC.md` | 内嵌 `ProjectSpec` JSON，其中已有 `targetAdapterType` 和 `selectedAdapterIds` | 不复制 |
| `common/EXECUTION_RULES.md` | 已写明多个适配器是多个独立选项 | 保持 |
| `common/ASSUMPTIONS.md` | 由 `inferredAssumptions` 生成 | 两个提示都要求不确定的内容追加到这一份 |
| `runtime/APPROVAL_QUEUE.md` | `runtime-pack.ts` | 唯一队列。Claude 的拒绝事件也追加到这里 |
| `runtime/PERMISSION_POLICY.yaml`、`SAFE_COMMANDS.md`、`DENIED_COMMANDS.md` | `runtime-pack.ts` | Claude 的 `settings.json` 从同一份 `commandRules` 投影出来，不手写第二份策略 |
| `agent_adapters/codex/AGENTS.md` | Codex 专有 | 保留。Claude 不读这个路径 |
| `agent_adapters/claude-code/CLAUDE.md` | 已有短规则 | 扩成与 Codex `AGENTS.md` 相同的项目事实和禁止项，外加 Claude 专有的权限说明 |

`OPEN_QUESTIONS.md` 在仓库根有一份，供本仓库开发用。生成包里没有这个路径。`ProjectSpec.openQuestions` 只出现在 `common/PROJECT_SPEC.md` 的 JSON 里。第二适配器不按适配器各写一份问答文件。生成包补一份中立的 `common/OPEN_QUESTIONS.md`，内容来自 `openQuestions`，两个提示都指向它。补文件会改变 ZIP 条目列表，因此只在实现该适配器的同一次改动里加入，并更新 `src/lib/zip/packager.test.ts` 里已经断言的 `common/ASSUMPTIONS.md` 邻居列表。Codex 提示增一句「读 `common/OPEN_QUESTIONS.md`」属于文档句，不改变 Codex 启动参数。

允许按适配器变化的只有 `agent_adapters/<id>/` 下面的文件。包根不写 `CLAUDE.md`，也不写 `.claude/settings.json`。Claude 自动发现的是包根；若在多适配器包的根上放一份 Claude 规则，会让「选了多个适配器 = 多个独立选项」变成「打开目录就进入 Claude」。启动器改用 `--settings agent_adapters/claude-code/settings.json` 显式指向，规则文件保持在适配器目录内。

`selectedAdapterIds` 含多个 id 时的现有语义保持不变：`generateAgentAdapters` 把各目录的文件拼进同一个包，不同时启动多个 CLI。人用哪一个，由根上的启动脚本决定。Codex 根脚本 `START_CODEX_AUTONOMOUS.ps1` 保持原样。Claude 增加并列的 `START_CLAUDE_AUTONOMOUS.ps1` 和 `.cmd`，仅当该包的 `selectedAdapterIds` 包含 `claude-code` 且功能开关打开时生成。

## 6. Completion Gate

现有门禁（`scripts/verify-autonomous-completion.ps1` 和生成包里的验证脚本）继续检查：样例包里四个适配器目录都在、完成报告存在、失败分类器能识别现有类别。这些检查对 Codex 和 Claude 相同。

Claude 专有的检查加在同一支脚本里，用适配器 id 分支，不改 Codex 分支的通过条件：

1. `agent_adapters/claude-code/` 下除现有 8 个路径外，还存在 `settings.json`、`run-claude-autonomous.ps1`、`run-claude-supervised.ps1`、`run-claude-unified-autonomous.ps1`、`run-claude-end-to-end-autonomous.ps1` 以及对应的 `.sh`。开关关闭时这些路径不要求存在，现有 8 个路径仍然要求存在。
2. 上述启动器的文本里不出现 `dangerously-skip-permissions` 和 `bypassPermissions`。
3. 自主启动器含 `--permission-mode dontAsk`、`--output-format stream-json`，且提示经由 stdin（脚本里能看到 `Get-Content` 管道或 bash 的 `cat ... | claude`）。
4. 若本次 `activeAdapterId` 是 `claude-code`：`events.jsonl` 里存在一条 `run_finished`，其 `isError` 不是 true；`runtime/AUTONOMOUS_RUN_SUMMARY.md` 的 Adapter 行是 `claude-code`；退出码为 0 且 `runtime/COMPLETION_GATE_REPORT.md` 含 PASS。两者不一致则 FAIL。
5. `CLAUDE_NOT_AUTHENTICATED`、`CLAUDE_MAX_TURNS`、`CLAUDE_STREAM_TRUNCATED`、`CLAUDE_PERMISSION_DENIED` 写进 `scripts/classify-runner-failure.ps1`。匹配顺序放在 `CODEX_*` 规则之后，模式串使用 `claude` 前缀，避免一条 Codex 日志被收成 Claude 类别。
6. 费用和轮次只出现在摘要里。Gate 不因为 `costUsd` 失败。

Codex 专有检查保持 `codex.test.ts` 已有的那些：自主脚本含 `sandbox=workspace-write` 和 `--approve-for-me`，不含 `--sandbox workspace-write`；监督脚本含 `--sandbox workspace-write`；不含危险绕过开关。

## 7. 迁移、开关、验收

### 7.1 怎样加进去还不碰坏 Codex

默认值已经是 Codex，而且有测试锁着：`src/lib/core/project-spec.test.ts` 期望 `selectedAdapterIds` 为 `["codex"]`。`end_to_end_delivery` 在调用方没有显式选择时会生成全部已注册适配器的文件（`PROGRESS_LOG.md` 对 v0.3.1 的记录，以及 `multi-target.test.ts` 的全量路径断言）。因此「注册表里有 claude-code」不等于「可以开始发真实启动器」。

开关：

- 生成期：环境变量 `AIMART_ENABLE_CLAUDE_CODE_LAUNCHER`，未设置视为关闭。关闭时 `claude-code.ts` 发出的文件集合与今天 `multi-target.ts` 的 8 个路径相同（内容可以补全规则，但路径集合不变）。打开时才追加 `settings.json` 和 ps1/sh。
- 运行期：`scripts/run-autonomous-version.ps1` 增加可选参数 `-AdapterId`，默认 `codex`。值为 `claude-code` 且开关关闭时，预检失败并写 `CLAUDE_LAUNCHER_DISABLED`，不回退成偷偷调用 `claude`。
- 包内状态：`runtime/RUNNER_STATE.json` 增加 `activeAdapterId`，默认 `codex`。阶段名 `CODEX_EXECUTION` 不改。

`AgentAdapterSchema.adapterType` 仍只允许 `"codex"` 和 `"multi_target"`。不要为 Claude 新增一个 `adapterType` 枚举值，否则所有「多适配器包」的解析都会被带进一次无必要的 schema 迁移。Claude 的身份看 `selectedAdapterIds` 和目录。

实现时改动的现有文件，仅限于接线，不改 Codex 生成文本：

- `src/lib/adapters/multi-target.ts`：Claude 分支改为调用新模块。
- `src/lib/adapters/registry.ts`：开关打开后的 `completionGateRequirements` 增加启动器路径。关闭时维持现有三条。
- `src/lib/generators/script-pack.ts`：开关打开且选中了 claude-code 时发出 `START_CLAUDE_AUTONOMOUS.ps1`。
- `scripts/classify-runner-failure.ps1` 与 `.sh`：追加四条 Claude 类别。
- `scripts/verify-autonomous-completion.ps1`：第 6 节的分支。
- `src/lib/zip/packager.ts`：补 `common/OPEN_QUESTIONS.md`。

明确不动：`generateCodexAdapter` 的 18 个路径和参数文本、`codex.test.ts` 的断言、`releases/` 下已冻结的历史包。

### 7.2 将新增的文件

```text
src/lib/adapters/types.ts
src/lib/adapters/events.ts
src/lib/adapters/events.test.ts
src/lib/adapters/claude-code.ts
src/lib/adapters/claude-code.test.ts
src/lib/adapters/codex-events.ts          # mapCodexLogLine，给 Codex 补 log_line，不改启动器
src/lib/adapters/codex-events.test.ts
```

生成包里，开关打开后多出来的路径：

```text
agent_adapters/claude-code/settings.json
agent_adapters/claude-code/run-claude-autonomous.ps1
agent_adapters/claude-code/run-claude-supervised.ps1
agent_adapters/claude-code/run-claude-unified-autonomous.ps1
agent_adapters/claude-code/run-claude-end-to-end-autonomous.ps1
agent_adapters/claude-code/run-claude-autonomous.sh
agent_adapters/claude-code/run-claude-supervised.sh
agent_adapters/claude-code/run-claude-unified-autonomous.sh
agent_adapters/claude-code/run-claude-end-to-end-autonomous.sh
START_CLAUDE_AUTONOMOUS.ps1
START_CLAUDE_AUTONOMOUS.cmd
common/OPEN_QUESTIONS.md
```

现有 8 个 Claude 路径保留，`multi-target.test.ts` 的 `arrayContaining` 不需要删条目。

### 7.3 最小验收

全部用 Vitest，和现有 `codex.test.ts`、`multi-target.test.ts` 放在一起。不依赖本机真的装了 `claude` 的那些测试放前面；真进程测试单独一条，没有 CLI 时跳过并打印原因。

1. **默认仍是 Codex。** 不设置开关，`createProjectSpec` 的 `selectedAdapterIds` 仍是 `["codex"]`。`generateAgentAdapters` 在只选 Codex 时的文件列表与现在的 18 个路径一致。
2. **开关关闭时 Claude 路径集合不变。** `selectedAdapterIds` 含 `claude-code`，生成结果仍包含今天测试点名的 8 个路径，且不包含 `run-claude-autonomous.ps1`。
3. **开关打开时契约对齐。** 生成的自主 ps1 含 `claude`、`-p`、`--permission-mode dontAsk`、`--output-format stream-json`、`--settings`，含 stdin 管道，不含 `dangerously-skip-permissions` 和 `bypassPermissions`。监督 ps1 含 `acceptEdits`。sh 与 ps1 成对出现。
4. **权限投影。** 构造一条 `allow` 的 `pnpm test` 和一条 `deny` 的 `git push`，`settings.json` 的 allow 含对应 Bash 规则，deny 含 `git push`。`runtime/PERMISSION_POLICY.yaml` 仍是这组规则的来源，测试比较两者而不是把策略写死在适配器里。
5. **事件映射。** 用一段固定的 `stream-json` 夹具（init、一次 `tool_use`、一次结果、最终 `result`），`mapClaudeStreamJson` 得到 `run_started`、`tool_use`、`tool_result`、`run_finished`。`is_error: true` 的结果使 `reportStatus` 的最终退出码非零。另一段 Codex 文本日志只得到 `log_line` 和 `run_finished`。
6. **分类器。** `classify-runner-failure.ps1` 对含 `CLAUDE_MAX_TURNS` 的消息返回该类别，对现有的 `CODEX_ARGUMENT_ORDER` 样例字符串仍返回 Codex 类别。
7. **包仍然是一份。** 同时选中两个 id 时，ZIP 条目里 `common/TASK_QUEUE.md` 只有一条，`common/OPEN_QUESTIONS.md` 只有一条，两个适配器目录都在，包根没有 `CLAUDE.md`。
8. **真进程冒烟（可选）。** 本机有 `claude` 时，对一个临时目录运行监督脚本的 `--max-turns 1` 短提示，期望退出码 0 或 `CLAUDE_NOT_AUTHENTICATED`，并且 `.aimart/logs/` 出现日志。这条不进默认 `pnpm test`，挂到已有的人工 dogfood 说明里。

验收通过的定义：第 1–7 条在 `pnpm test` 里是绿的，且 `codex.test.ts` 不改断言也是绿的。第 8 条的跳过不算失败。
