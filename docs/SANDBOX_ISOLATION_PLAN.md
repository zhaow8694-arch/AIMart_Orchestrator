# Windows 沙箱隔离方案

状态：设计稿，未实现。读者是后续改 Autonomous Runner 的人。本文只规定 Windows 上怎么把无人值守命令关进一个可审计的边界。不改 `src/`，不新增二进制，不提交。

本文对着本仓库的真实入口写，而不是对着一个抽象的「沙箱产品」：

- 仓库级 dogfood 入口：`scripts/run-autonomous-version.ps1`。阶段顺序写死为 `PREFLIGHT`、`CODEX_EXECUTION`、`VALIDATION_TEST_LINT_BUILD`、`SOURCE_ZIP`、`SAMPLE_PACK`、`SAMPLE_PACK_NORMALIZATION`、`ADAPTER_COMPLETENESS`、`SHA256_MANIFEST`、`DOGFOOD`、`COMMIT_TAG`、`COMPLETION_GATE`、`FREEZE`。阶段机在 `scripts/runner-stage-machine.ps1`，失败分类在 `scripts/classify-runner-failure.ps1`。
- 生成包里的客户入口：`START_CODEX_AUTONOMOUS.ps1`、`scripts/run-customer-autonomous.ps1`，以及 `src/lib/adapters/codex.ts` 生成的 `agent_adapters/codex/run-codex-*.ps1`。这些脚本今天把提示从 stdin 送进 `codex exec`，日志落到 `.aimart/logs/` 或 `codex_runs/`。
- 权限语义今天在 `RUNTIME_SECURITY_POLICY.md` 和生成的 `runtime/PERMISSION_POLICY.yaml`、`runtime/SAFE_COMMANDS.md`、`runtime/DENIED_COMMANDS.md`、`runtime/APPROVAL_QUEUE.md`。风险等级 L0–L5。这是策略文本，不是操作系统强制。
- `README.md` 已写明：`codex-windows-sandbox-setup.exe` 缺失，完整沙箱隔离未启用。`BLOCKERS.md` 与 `PROGRESS_LOG.md` 记录过 Windows 沙箱在进程建立阶段失败，表面错误是 `spawn setup refresh`，后果是 `pnpm test` 根本起不来。

Codex 自己的 `workspace-write` / `--approve-for-me` 只约束 Codex CLI 愿意遵守的写范围。`--approve-for-me` 不能和 `--sandbox` 同时传（`src/lib/adapters/codex.ts` 里的注释和 `src/lib/adapters/codex.test.ts` 锁着这个行为）。操作系统级隔离要包在 CLI 外面。

## 1. 威胁模型

### 1.1 要保护的对象

一次无人值守运行发生在开发者的 Windows 登录会话里，工作区是本仓库或客户执行包解压目录。需要保护的对象：

| 资产 | 典型位置 | 失控命令能做什么 |
|---|---|---|
| 工作区外的用户文件 | 文档、桌面、其他 git 仓库 | 覆盖、删除、加密 |
| 凭据 | `%USERPROFILE%\.ssh`、`.aws`、`.azure`、`.config\gh`、`.codex`、`.claude`、仓库 `.env` | 读出后经网络送走 |
| 本仓库的发布冻结区 | `releases/v0.1.0` 到 `releases/v0.3.1` | 改历史发布物。Completion Gate 已把这类改动标成 `HISTORICAL_RELEASE_MODIFIED` |
| 注册表与启动项 | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`、服务、计划任务 | 留下下次登录仍在的程序 |
| 网络上的其他机器 | 同网段 SMB、WinRM、RDP | 用当前用户令牌横向移动 |
| 本机可用性 | CPU、内存、句柄 | `pnpm build`、测试进程或模型循环把机器打满。Runner 今天没有超时 |

攻击者模型按能力分三档，方案必须对每一档说出自己挡住没有：

1. **失误的代理**。模型执行了策略里禁止的命令，或路径写错。L0–L5 文本和 Completion Gate 主要针对这一档。
2. **被任务文本带偏的代理**。执行包来自一段需求讨论，讨论里可以含「顺便把密钥打出来」「再调一个外部 URL」。代理没有独立恶意程序，但它会忠实地跑 shell。
3. **能自行决定系统调用的进程**。代理不走策略文件，直接 `CreateProcess`、原始套接字、写注册表。只有操作系统约束数得上。Codex 的 `--sandbox workspace-write` 对这一档无效，因为那个开关在 CLI 里面，而且 Windows 辅助程序目前缺失。

第 3 档是本文的设计目标。第 1、2 档继续由现有 `SAFE_COMMANDS` / `DENIED_COMMANDS` / `APPROVAL_QUEUE.md` 处理，沙箱不取代它们。

### 1.2 四类损害

**文件系统。** 工作区外的写，以及工作区内对凭据文件的读。生成脚本和 `scripts/package.ps1` 会写 `releases/`、`runtime/`、`codex_runs/`。这些路径必须在允许写的根里面。`releases/` 里已冻结的旧版本目录必须在允许写的根之外，或单独拒绝写。Agent 读 `%USERPROFILE%\.ssh` 今天没有任何 NTFS 拒绝。

**注册表。** 非管理员写不了 `HKLM`，但写得了 `HKCU`。`HKCU\...\Run`、`HKCU\Environment`、`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders` 都足以在登录后留后门，或把「我的文档」指到别处。方案要求沙箱账户的 HKCU 是专用配置单元，开发者自己的 HKCU 不挂给这个进程。

**网络外带。** 模型 API、`pnpm` 注册表、`git` 拉取都是合法出站。同一条出站能力可以把源码、`.env`、令牌送到任意 HTTPS 主机。Windows 防火墙的默认出站动作是允许。只加几条「允许 443」不会关闭其余主机。第 3 节给出真正能「其余全部拒绝」的叠放方式。

**横向移动。** 开发者账户经常在管理员组里。代理继承这个令牌后，可以访问该用户能访问的 SMB 共享、WinRM、远程注册表。即使用户不在管理员组，SMB（445）、RPC（135）、RDP（3389）、WinRM（5985/5986）仍然是默认暴露面。

### 1.3 现有控制留下的洞

- `RUNTIME_SECURITY_POLICY.md` 把 `git push`、`gh pr create`、`terraform apply` 放进审批队列，把 `rm -rf /`、读 `~/.ssh`、`printenv` 列为禁止。执行点是「模型被提示要遵守」，外加 Completion Gate 事后看产物。
- `scripts/run-autonomous-version.ps1` 在 `VALIDATION_TEST_LINT_BUILD` 里直接调用 `pnpm test`、`pnpm lint`、`pnpm build`，在打包阶段直接调用 `scripts/package.ps1`。这些子进程和调用者同一个令牌，没有 Job、没有超时、没有环境变量剥离。
- Codex 启动脚本在自主模式下使用 `--approve-for-me --skip-git-repo-check`，监督模式使用 `--sandbox workspace-write`。`src/lib/adapters/codex.test.ts` 禁止生成 `dangerously-bypass-approvals-and-sandbox`。这是对的，它只证明生成文本里没有那个开关，不证明 Windows 上存在隔离进程。
- 缺失的 `codex-windows-sandbox-setup.exe` 被 Codex 在建立沙箱时拉起。仓库里的失败记录是 `spawn setup refresh`。这个失败发生在验证命令之前，Runner 会停。外层方案必须在这个 exe 不存在时仍然给出一个边界，并且不能把一次 helper 失败当成整次交付失败。

不在威胁模型里的东西：针对内核漏洞的提权、已经拿到管理员的人、物理接触机器。那些要靠补丁和磁盘加密，不靠本 Runner。

## 2. 文件系统隔离

### 2.1 四个选项

| 选项 | 工作区外的写 | 读开发者凭据 | 注册表 | 跑 pnpm / vitest / Next 构建 | 和本 Runner 的契合 |
|---|---|---|---|---|---|
| Windows Sandbox（`.wsb` 轻量虚拟机） | 强。主机只通过 MappedFolder 可见 | 强。客户机有自己的用户 | 强。客户机注册表丢弃 | 差。每次启动要复制依赖，写回主机要额外拷贝；多阶段 Runner 要在客户机里连续写 `runtime/*.md` | 适合「不可信压缩包，跑完即弃」。不适合 `run-autonomous-version.ps1` 这条要在同一工作区里过 12 个阶段的链路。还要求 Windows 专业版/企业版和虚拟化 |
| AppContainer + 低完整性级别 | 中。默认不能写中等完整性对象 | 弱到中。低完整性仍可读许多用户文件，除非再加 ACL。AppContainer 能力集一放开，Node 原生模块和 git 就需要一大串 capability | 中 | 差。工具链不是为 AppContainer 写的，缺 capability 时失败方式难诊断 | 不作为主方案 |
| 专用低权限本地账户 + NTFS ACL | 强，只要工作区外没有授予修改权限 | 强，对开发者配置文件显式拒绝 | 强。进程用自己的配置单元，碰不到开发者 HKCU | 好。Node、pnpm、git、Codex、Claude 都是普通用户态程序 | **主方案**。Phase 1 就能用 PowerShell 5.1 做一部分，Phase 2 把账户和 ACL 做成可重复的安装 |
| VHDX 差分磁盘 | 只保护「这个卷上的文件能整卷丢弃」 | 不保护。进程仍是主机用户，主机路径照旧可读 | 不保护 | 中。挂载需要管理员，盘符一变，现有脚本里的 `$RootDir` 和相对路径全部要改 | 作 Phase 3 的回滚层，不作隔离边界 |

### 2.2 主方案

主边界是本地账户 `aimart-runner` 加上 NTFS ACL，进程以这个账户的令牌运行，工作区是少数可写根之一。

选择它的原因：

- Autonomous Runner 是一段长时间、多阶段、要往工作区写状态文件的 PowerShell。它需要稳定的路径和保留下来的 `node_modules`。Windows Sandbox 的丢弃语义和这条链路相反。
- 仓库已经被 `spawn setup refresh` 堵住过。再把每一条命令放进一台虚拟机，失败面更大。
- 账户和 ACL 不需要新的可执行文件。Phase 1 在还没有这个账户时也有一个明确的降级行为（第 5 节），不会假装隔离已经生效。
- AppContainer 挡不住「把 capability 开到工具链能跑」，那个状态和普通用户差别不大，诊断成本却高得多。
- VHDX 解决的是回滚，不是保密。git 工作区本身已经能回滚被跟踪的文件。差分磁盘留到需要丢弃未跟踪垃圾（损坏的 `node_modules`、沙箱里写出的大文件）时再用。

### 2.3 可写根与拒绝清单

可写根只此四类，全部在审计记录里列出来：

1. 本次工作区。dogfood 时是仓库根；客户包时是执行包解压根。包含 `runtime/`、`codex_runs/`、`.aimart/logs/`、当前版本的 `releases/<当前版本>/`。
2. `%LOCALAPPDATA%\aimart-sandbox\temp`，作为 `TEMP` 和 `TMP`。
3. `%LOCALAPPDATA%\aimart-sandbox\npm-cache`。
4. `%LOCALAPPDATA%\aimart-sandbox\pnpm-store`。

显式拒绝 `aimart-runner` 读取或遍历（`icacls /deny aimart-runner:(OI)(CI)F`，安装时由管理员执行一次）：

- 开发者的 `%USERPROFILE%\.ssh`、`.aws`、`.azure`、`.config\gh`、`.codex`、`.claude`、`.claude.json`
- 工作区里的 `.env`、`.env.*`（执行包文档 `docs/ENV_SETUP.md` 只描述变量名，不携带密钥）
- `releases/` 下除当前 `TargetVersion` 以外的目录
- 其他盘符的根。Phase 2 的安装脚本枚举固定磁盘，对非工作区盘符给 `aimart-runner` 拒绝 `(OI)(CI)F`

`aimart-runner` 不加入 `Administrators`、`docker-users`。不授予 `SeDebugPrivilege`、`SeImpersonatePrivilege`、`SeAssignPrimaryTokenPrivilege`、`SeTcbPrivilege`、`SeBackupPrivilege`、`SeRestorePrivilege`。

模型 API 的登录态放在 `C:\Users\aimart-runner\` 自己的配置里，由人在安装时登录一次。这样进程读不到开发者的 `.ssh`，它仍然读得到自己的 API 令牌。令牌外带要靠第 3 节的网络边界。Phase 3 再把令牌挪到本机代理后面，子进程环境里不再出现原始密钥。

### 2.4 与「同用户降级」的关系

许多开发机上的当前用户就在管理员组里，而创建 `aimart-runner` 需要一次管理员操作。在那一次操作完成之前，包装器不得声称 ACL 边界已生效。降级行为见第 5.4 节：拒绝以提升后的进程启动 Runner，用受限令牌去掉管理员组 SID，并在审计里写 `filesystemIsolation: degraded-same-user`。Completion Gate 把这个值当成「未完成隔离」，不能给出沙箱 PASS。

## 3. 网络隔离

### 3.1 为什么不能只加防火墙允许规则

Windows 防火墙默认出站是允许。显式的 Block 规则优先于显式的 Allow 规则。所以「一条阻止全部出站 + 若干允许 443」在防火墙规则模型里会把允许规则一起否掉，合法的 `pnpm` 和模型 API 也会断。

能表达「默认拒绝、名单例外」的是 WFP 筛选器权重：权重大的筛选器优先。做法是：

- 权重较低的一条：该用户 SID 的全部出站，动作 Block。
- 权重较高的若干条：只允许下面列出的流。

`New-NetFirewallRule` 表达不了这组例外。Phase 2 的安装脚本用 `Add-Type` 调用 WFP（`FwpmEngineOpen0` / `FwpmFilterAdd0`），不另发一个长期驻留的驱动。

仅按 IP 允许 443 也不够。CDN 上一个 IP 后面有很多主机，IP 名单还会过期。主机名判断放在本机代理里做，WFP 只允许沙箱进程连接这个代理。

### 3.2 叠放

```text
aimart-runner 进程
    |  HTTPS_PROXY / HTTP_PROXY = http://127.0.0.1:<port>
    |  NO_PROXY = 127.0.0.1
    v
scripts/sandbox-proxy.mjs     只对允许列表里的主机名完成 CONNECT
    ^
    |  WFP：该 SID 只允许
    |    - TCP 到 127.0.0.1:<port>
    |    - UDP/TCP 53 到系统当前 DNS
    |  其余出站 Block（权重低于上面的允许项）
```

代理是仓库里的一个 Node 脚本，随 Runner 启动，随机本地端口，只监听 `127.0.0.1`。允许列表是工作区里的 `runtime/SANDBOX_NETWORK_ALLOWLIST.json`，由人维护，代理启动时读取，不接受来自模型进程的热更新。

起始允许主机（实施时用本机安装的 `codex` 与 `claude` 做一次探测，把真实 CONNECT 的主机名写回这个文件，再删掉用不到的）：

- `registry.npmjs.org`
- `github.com`
- `codeload.github.com`
- `objects.githubusercontent.com`
- `api.openai.com`
- `api.anthropic.com`

默认不放镜像站。需要 `registry.npmmirror.com` 或 `npm.pkg.github.com` 时由人加一行。遥测主机（各 CLI 可能访问的统计或崩溃上报域名）不在起始列表里。探测跑若因为被拒绝而失败，审计里记下被拒主机，由人决定加还是保持拒绝。源码里看不到 Codex 的唯一 API 主机，因为请求发生在外部 CLI，所以起始列表是探测前的种子，不是冻结名单。

横向移动端口另加一组防火墙 Block，即使用户还没装上 WFP 默认拒绝也生效，因为这些流没有对应的允许需求：TCP 135、139、445、3389、5985、5986，外加 UDP 137、138。git 走 HTTPS，不开放 22。

### 3.3 本地回环

`pnpm test` 和 Next 可能听 `127.0.0.1`。允许沙箱进程连接回环地址上的高端口。不允许从非回环接口连入这些端口。包装器不设置端口转发。

### 3.4 代理被绕过时的诚实标记

有的 CLI 会忽略 `HTTPS_PROXY`，直接连 443。WFP 启用后这种连接会被拒绝，表现是该 CLI 启动失败，这是预期。WFP 尚未安装时，包装器在审计里写 `networkIsolation: proxy-only`，Completion Gate 的网络项记为 `PARTIAL`，不能写成已阻止外带。只有审计里的 `networkIsolation` 为 `wfp-default-deny` 时，网络项才能是 `PASS`。

DNS 隧道留在残余风险里：Phase 2/3 允许发往系统 DNS 的 53 端口。不在本方案里做 DNS 负载检测。

## 4. 进程隔离

包装器创建一只 Windows Job，把 `codex`、`claude`、`pnpm`、`node` 及其子孙放进同一只 Job。用 PowerShell 5.1 可编译的 `Add-Type` C# 调用 `CreateJobObject` / `SetInformationJobObject` / `AssignProcessToJobObject`，不新增 exe。仓库的失败分类器把 `??` 和 `ForEach-Object -Parallel` 标成 `POWERSHELL_51_SYNTAX`，Job 的实现保持在 `Add-Type` 的 C# 里，脚本表面语法维持 5.1。

Job 限制（数字写进 `runtime/SANDBOX_PROFILE.json`，下面是 dogfood 本仓库的默认值）：

| 项 | 默认 | 理由 |
|---|---|---|
| `JOB_OBJECT_LIMIT_JOB_MEMORY` | 8 GB | 本仓库 `pnpm build` 加 Vitest 会超过 4 GB。客户包可以在 profile 里调低 |
| `JOB_OBJECT_CPU_RATE_CONTROL_ENABLE` 硬上限 | 80% | 无人值守时留下余量给桌面和代理 |
| `JOB_OBJECT_LIMIT_ACTIVE_PROCESS` | 128 | Vitest worker、pnpm 脚本和 git 会并行。超过视为失控并杀掉 Job |
| `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` | 开 | 包装器退出时整棵进程树退出，不留 `node` 孤儿 |
| 时钟 | 见下表 | Job 本身不提供墙钟，由包装器 `Wait-Process` 后 `TerminateJobObject` |

墙钟：

| 调用场景 | 超时 |
|---|---|
| Runner 的单条验证命令（`pnpm test`、`pnpm lint`、`pnpm build`、`package.ps1`） | 20 分钟 |
| `codex exec` 或 `claude -p` 的一次自主会话 | 90 分钟 |
| `end_to_end_autonomous` 一次会话 | 6 小时 |
| `run-autonomous-version.ps1` 整体 | 8 小时 |

超时后的顺序：`TerminateJobObject`，等待 5 秒，若仍有进程则 `taskkill /T /F` 作为兜底，审计字段 `killMethod` 记下实际用的一种。退出码固定为 `1460`（包装器自定义，避免和工具自己的 1 混在一起），失败分类新增 `SANDBOX_TIMEOUT`。不自动重试超时。

提权约束，全部在包装器启动时执行，任一失败则不启动命令：

1. 当前进程若已提升（`WindowsPrincipal` 属于 Administrators 且令牌是完整管理员令牌），直接退出，分类 `SANDBOX_ELEVATED_PARENT`。不提供开关去关掉这条。Runner 不需要管理员。
2. Phase 1 降级路径调用 `CreateRestrictedToken`，把 `Administrators` 以及上面列出的特权做成 deny-only。子进程即使用户在管理员组里，也拿不到管理员 SID。
3. Phase 2 路径不把密码留在命令行。安装脚本注册一个「只在用户登录时不依赖交互」的计划任务，任务身份是 `aimart-runner`。包装器往工作区里的 `runtime/sandbox/inbox/` 投递一份请求文件，任务拾起并在 Job 里执行。模型进程读不到任务密码。
4. 子进程环境是白名单：`PATH`（重建，只含 Git、Node、pnpm、目标 CLI 的目录和 `%SystemRoot%\System32`）、`TEMP`、`TMP`、`HOME`/`USERPROFILE` 指向沙箱配置、`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY`、`SYSTEMROOT`、`COMSPEC`。父进程里的 `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GH_TOKEN`、`AWS_*`、`NPM_TOKEN` 不继承。Phase 2 之前 CLI 若因此缺少登录态，预检失败并写明「在 `aimart-runner` 配置里登录一次」，而不是把开发者的密钥拷进去。
5. 工作目录必须落在第 2.3 节的工作区根里。包装器拒绝 `cd` 到根外面再执行。

这些措施挡的是令牌继承和失控子进程。挡不住已经在内核里的漏洞。

## 5. Autonomous Runner 怎么调用

### 5.1 插入点

所有阶段命令和一次 CLI 会话都经同一个包装器：

```text
scripts/invoke-sandboxed.ps1
  -File <要跑的 ps1 或 exe>
  -ArgumentList <已拆开的参数数组>
  -Cwd <工作区根>
  -TimeoutSec <上表>
  -ProfilePath runtime/SANDBOX_PROFILE.json
  -AuditPath runtime/sandbox/<runId>/audit.json
```

调用方只增加这一层，不改阶段顺序，避免 `runner-stage-machine.ps1` 的阶段名变化：

| 调用方 | 今天 | 改完后 |
|---|---|---|
| `scripts/run-autonomous-version.ps1` 里的 `pnpm test`、`pnpm lint`、`pnpm build`、`package.ps1`、`normalize-sample-pack.ps1`、`verify-autonomous-completion.ps1` | 直接 `&` | 经 `invoke-sandboxed.ps1` |
| `src/lib/generators/script-pack.ts` 发出的客户 Runner 和 `START_CODEX_*.ps1` | 直接启动 | 生成包内带一份相同的 `scripts/invoke-sandboxed.ps1`，入口改为调用它 |
| `src/lib/adapters/codex.ts` 生成的 `run-codex-*.ps1` | `Get-Content prompt \| codex exec ...` | 整条 `codex` 管道作为包装器的子进程。生成文本里的参数保持不变，以维持 `codex.test.ts` |

`CODEX_EXECUTION` 这个阶段名保持不变。阶段名是历史标识。适配器 id 写进 `runtime/RUNNER_STATE.json` 的新字段 `activeAdapterId`，默认 `codex`。

包装器的标准输出仍走现有日志：`.aimart/logs/` 或 `codex_runs/*.combined.log`。包装器不吞掉 stderr。Codex 会把「Reading prompt from stdin」写到 stderr，现有脚本因此在调用周围把 `ErrorActionPreference` 降到 `Continue`。包装器继承这个约定：收集 stderr，但不把原生命令的 stderr 当成终止错误。

### 5.2 `codex-windows-sandbox-setup.exe` 的等价物做什么

不在 PATH 上放置一个同名的假 exe。Codex 可能按文件名启动并校验它；伪造既不能稳定通过，也会把本方案和 Codex 的私有辅助程序绑死。

等价物是仓库脚本 `scripts/aimart-windows-sandbox-setup.ps1`，由管理员运行一次，之后可重复运行（幂等）。它按顺序做这些事：

1. 确认系统是 Windows 10 1809 或更新版本（按用户的防火墙 SID 和 WFP 需要这一代）。不是则退出并写 `BLOCKERS.md` 风格的一行原因。
2. 若不存在本地用户 `aimart-runner`，创建它，密码由安装脚本生成，写入只有 Administrators 能读的 DPAPI blob：`%ProgramData%\aimart-sandbox\account.bin`。账户密码不进工作区。
3. 创建第 2.3 节的目录，授予 `aimart-runner` 修改权限，并写拒绝 ACE。
4. 写 `runtime/SANDBOX_PROFILE.json`：内存、CPU、进程数、超时、可写根、账户名。
5. 写 `runtime/SANDBOX_NETWORK_ALLOWLIST.json` 的起始名单（若文件已存在则不覆盖人改过的条目，只补缺）。
6. 安装横向端口的防火墙 Block 规则，名称前缀 `AIMart-Sandbox-Block-`。
7. 安装 WFP 筛选器（第 3.2 节）。失败时 profile 里 `networkIsolation` 留在 `proxy-only`，脚本退出码为 0 但打印「网络默认拒绝未生效」。WFP 失败不删除已经完成的账户和 ACL。
8. 注册计划任务 `AIMart-Sandbox-Worker`，身份 `aimart-runner`，触发方式是事件或工作区 `runtime/sandbox/inbox` 的文件到达。任务动作是 `powershell.exe -NoProfile -File scripts/invoke-sandboxed.ps1 -Worker`。
9. 探测 `codex`。运行一次短命令（`codex exec --help` 或等价的不改文件命令）。若 stderr 含 `spawn setup refresh` 或进程在沙箱建立阶段退出，把 `runtime/SANDBOX_PROFILE.json` 的 `codexHelper` 设为 `missing`。这是已知状态，不是安装失败。
10. 打印下一步：用 `aimart-runner` 的配置登录一次 Codex（以及将来的 Claude），不要把开发者家目录拷进去。

每次真正跑命令时，`invoke-sandboxed.ps1` 做的是下面这串，而不是再去找那个缺失的 exe：

1. 读 profile。没有 profile 就走第 5.4 节的降级，并在审计里标明。
2. 确认父进程没有提升。
3. 启动 `scripts/sandbox-proxy.mjs`（profile 要求代理时），等它监听成功。
4. 创建 Job，填入 profile 里的限制。
5. 组白名单环境，把请求写成 `runtime/sandbox/inbox/<id>.json`（程序、参数、cwd、超时、代理端口）。
6. 计划任务拾起请求，以 `aimart-runner` 启动进程，`AssignProcessToJobObject`，把 stdout/stderr 写到请求指定的日志路径。
7. 包装器轮询 `runtime/sandbox/outbox/<id>.json` 直到退出或超时。超时则 `TerminateJobObject`。
8. 写第 6 节的审计记录，把子进程退出码当作自己的退出码返回。超时返回 `1460`。

生成包里的 `run-codex-*.ps1` 仍包含现在的 `--approve-for-me` 或 `--sandbox workspace-write`。外层包装器不改写这些参数，这样 `codex.test.ts` 的字符串断言保持有效。若 `codexHelper` 为 `missing` 且该次是监督模式（参数里带 `--sandbox`），预检在 `PREFLIGHT` 记一条 `CODEX_SANDBOX_HELPER_MISSING`，然后仍然启动，隔离由外层负责。内层 helper 再次崩溃时，这次运行失败分类用新类别 `CODEX_SANDBOX_HELPER_MISSING`，Completion Gate 失败，但失败原因指向缺失的 Codex helper，而不是一条看不懂的 `spawn setup refresh`。修复动作是继续靠外层边界，并在该次生成脚本的运行路径上改用与自主模式相同的 `--approve-for-me`（实现时改的是运行路径的选择，生成文本的两种模式都还在，测试继续锁住「监督脚本含 `--sandbox workspace-write`」「自主脚本不含该参数」）。

### 5.3 命令策略仍然生效

包装器在投递请求前读 `runtime/PERMISSION_POLICY.yaml`。动作是 `deny` 的命令前缀直接不启动，审计记 `deniedByPolicy`，退出码 `1461`。动作是 `queue_for_approval` 的命令在自主模式下同样不启动，并往 `runtime/APPROVAL_QUEUE.md` 追加一行（风险、原因、是否阻塞、建议）。这和 `AGENTS.md` 第 7 条、`RUNTIME_SECURITY_POLICY.md` 的「先写入审批队列」一致，只是改成包装器强制执行，不再依赖模型记得写。`allow` 列表为空时不表示全部允许，而表示「没有额外的命令前缀限制」，隔离仍由账户、Job 和网络完成。L4/L5 的默认动作维持现状：进队列或拒绝。

### 5.4 Phase 1 降级（还没有账户的时候）

管理员还没跑安装脚本时，包装器仍然：

- 拒绝提升后的父进程
- 创建 Job（内存、CPU、进程数、超时、关闭即杀）
- 使用受限令牌去掉管理员 SID
- 把 `TEMP` 指到工作区下的 `.aimart/sandbox-temp`
- 不继承密钥环境变量
- 执行第 5.3 节的策略前缀检查
- 审计写 `filesystemIsolation: degraded-same-user`、`networkIsolation: none`

这个模式挡得住资源耗尽、提权令牌和策略里点名的命令。挡不住同一用户读 `.ssh` 或任意 HTTPS。Completion Gate 因此不能给沙箱项 PASS。

## 6. 日志与审计

每次被包装的调用在 `runtime/sandbox/<runId>/` 写一份 `audit.json`，多条命令追加到同目录的 `audit.jsonl`。`runId` 与现有日志时间戳对齐，例如 `codex_runs/codex-unified-autonomous-<stamp>.log` 对应 `runtime/sandbox/<stamp>/`。

每条记录的字段：

| 字段 | 含义 |
|---|---|
| `runId`、`commandId` | 一次 Runner 与其中一条命令 |
| `startedAt`、`endedAt`、`durationMs` | UTC |
| `adapterId` | `codex` 或以后的 `claude-code`；验证命令用 `runner` |
| `mode` | `supervised`、`autonomous`、`end_to_end_autonomous`、`stage` |
| `stage` | `run-autonomous-version.ps1` 的阶段名，没有则空 |
| `file`、`argumentList` | 参数里的令牌样字符串替换成 `<redacted>` |
| `cwd` | 必须在可写根内 |
| `userSid`、`elevated` | 实际令牌 |
| `filesystemIsolation` | `aimart-runner-acl` 或 `degraded-same-user` |
| `networkIsolation` | `none`、`proxy-only`、`wfp-default-deny` |
| `jobMemoryMb`、`cpuRatePercent`、`activeProcessLimit`、`timeoutSec` | 本次生效的限制 |
| `exitCode`、`timedOut`、`killMethod` | `none`、`terminate-job`、`taskkill-tree` |
| `stdoutPath`、`stderrPath` | 现有日志文件 |
| `deniedByPolicy` | 空或被拒绝的命令行 |
| `proxyDeniedHosts` | 代理拒绝的主机名列表 |
| `writableRoots` | 本次允许写的根 |

不记录环境变量的值。记录「哪些变量名被传进去了」。

Completion Gate（`scripts/verify-autonomous-completion.ps1` 增加的检查，与现有 PASS/FAIL 报告放在一起）读这些记录：

1. 该次 `runId` 的 `audit.jsonl` 存在，且每个阶段至少一行。缺文件即 FAIL，分类沿用 `COMPLETION_GATE_FAILURE`。
2. 任意一行 `elevated` 为 true，或 `exitCode` 为 `1460`/`1461`，则沙箱项 FAIL。
3. `filesystemIsolation` 不是 `aimart-runner-acl` 时，沙箱项为 `PARTIAL`。整体交付在 Phase 1 可以继续，但 `runtime/AUTONOMOUS_VERIFICATION_REPORT.md` 里沙箱行不能写 PASS。Phase 2 完成后，dogfood 要求这一行是 PASS。
4. `networkIsolation` 不是 `wfp-default-deny` 时，网络行同样是 `PARTIAL`。
5. `proxyDeniedHosts` 非空只记入报告，不单独 FAIL。人要看模型是不是在试探名单外的主机。
6. 工作区外的写探测：包装器在命令前后对可写根之外不做全盘扫描。它在子进程退出后检查审计里的 `cwd`，并用一条只读的 `git status --short` 确认没有人把 `releases/` 历史目录改脏（现有 `HISTORICAL_RELEASE_MODIFIED` 分类继续负责这件事）。

`runtime/AUTONOMOUS_RUN_SUMMARY.md` 增加三行：沙箱账户、文件系统隔离级别、网络隔离级别。现有的 Codex 退出码、Completion Gate、失败门、日志路径保留。

## 7. 分阶段落地

### Phase 1 — 最小可用，无新二进制

交付物是两个 PowerShell 5.1 脚本和审计文件，外加失败分类器里的三个新类别（`SANDBOX_TIMEOUT`、`SANDBOX_ELEVATED_PARENT`、`CODEX_SANDBOX_HELPER_MISSING`）。

包含：

- `scripts/invoke-sandboxed.ps1` 的降级路径（第 5.4 节）接到 `run-autonomous-version.ps1` 的验证、打包和 Completion Gate 调用上。
- 生成端：`script-pack.ts` 与 `codex.ts` 把同一包装器调用写进客户入口和 `run-codex-*.ps1` 的外层。生成脚本里的 Codex 参数文本不改。
- Job、超时、关闭即杀、拒绝提升、环境变量白名单、策略前缀拒绝。
- `audit.jsonl` 与 Gate 对「文件存在、未提升、未超时」的检查。隔离级别允许是 `degraded-same-user`，网络允许是 `none`，报告写 `PARTIAL`。

不包含：本地账户、NTFS 拒绝 ACE、WFP、代理、VHDX、Windows Sandbox。Phase 1 完成的定义是：一次 dogfood 在超时或提升时会失败并留下审计；在正常跑完时 Gate 能指出「进程限制已生效，文件系统与网络仍是 PARTIAL」。

### Phase 2 — 专用安装工具

交付物是 `scripts/aimart-windows-sandbox-setup.ps1` 和第 5.2 节的 10 步，加上 `scripts/sandbox-proxy.mjs`。

包含：

- 账户、ACL、计划任务、profile、允许列表、横向端口 Block。
- 代理允许列表。审计级别 `proxy-only` 或 `wfp-default-deny`（WFP 调用成功时）。
- 预检探测 Codex helper，把 `spawn setup refresh` 收成 `CODEX_SANDBOX_HELPER_MISSING`。
- Gate 在本仓库 dogfood 上要求 `filesystemIsolation = aimart-runner-acl`。网络在 WFP 成功时要求 `wfp-default-deny`，否则保持 `PARTIAL` 并在 `BLOCKERS.md` 记一行，不假装已经默认拒绝。

不包含：假的 `codex-windows-sandbox-setup.exe`、内核驱动、把开发者密钥复制进沙箱账户。

Phase 2 完成的定义：管理员在一台机器上重复运行安装脚本两次，第二次不报错也不重复创建账户；之后 `run-autonomous-version.ps1` 的子进程令牌 SID 属于 `aimart-runner`；从该令牌读 `%USERPROFILE%\.ssh`（开发者的）失败；访问允许列表内的 `registry.npmjs.org` 成功。

### Phase 3 — 加固

在 Phase 2 的边界上加，不替换它：

- WFP 若在 Phase 2 没配成，这里修到 `wfp-default-deny` 成为 dogfood 的必过项。
- API 令牌只放在代理或计划任务能读的 DPAPI blob 里，子进程环境不再持有 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`。CLI 若必须自己持有令牌，则该项保持开放并在报告里继续可见，不伪造「密钥已不可读」。
- 可选的 VHDX 差分盘作为工作区卷。Gate FAIL 或超时后卸下并删除差分盘。路径由包装器固定，脚本里的 `$RootDir` 仍指向挂载后的工作区根。
- 可选的 Windows Sandbox 配置 `deploy/aimart-untrusted.wsb`，只给「讨论内容来自仓库外、且人指定了不可信」的执行包。LogonCommand 在客户机里跑 Phase 2 的同一套脚本。MappedFolder 只读。结果从客户机的 `runtime/sandbox-export/` 拷回。默认 Runner 不走这条路径。
- AppLocker 或 WDAC 允许列表：`node.exe`、`pnpm.cmd`、`git.exe`、`codex.exe`、`claude.exe`、`powershell.exe`。这是额外的进程白名单，放在账户边界之后。本仓库不把 AppContainer 列进 Phase 3 的必做项。

Phase 3 完成的定义：审计里文件系统与网络两行都是强级别；一份故意访问 `example.com` 的命令被 WFP 拒绝并出现在 `proxyDeniedHosts` 或 WFP 丢弃日志里；一份故意读开发者 `.ssh` 的命令失败。

## 8. 实施时不要做的事

- 不要把隔离做进 `codex exec` 的参数里去替代外层。内层参数继续表达 Codex 自己的审批语义。
- 不要为了让缺失的 helper 返回 0 而放置同名 exe。
- 不要把机器的防火墙默认出站改成阻止。那会打断开发者会话里的其他程序。默认拒绝只作用于 `aimart-runner` 的 SID，并用 WFP 权重写出例外。
- 不要在 Phase 1 的报告里把 `degraded-same-user` 写成已隔离。
