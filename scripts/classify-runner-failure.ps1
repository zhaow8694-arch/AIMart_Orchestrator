param(
  [string]$Message = "",
  [string]$LogPath = ""
)

if ($LogPath -and (Test-Path $LogPath)) {
  $Message = $Message + "`n" + (Get-Content $LogPath -Raw)
}

$Rules = @(
  @{ Category = "PNPM_ARGUMENT_LOSS"; Pattern = "pnpm.*argument|ERR_PNPM|Unknown option" },
  @{ Category = "POWERSHELL_51_SYNTAX"; Pattern = "\?\?|ForEach-Object -Parallel|ParserError|Unexpected token" },
  @{ Category = "CODEX_ARGUMENT_ORDER"; Pattern = "codex.*argument.*order|--sandbox.*after" },
  @{ Category = "CODEX_PROMPT_ARGUMENT_SPLIT"; Pattern = "prompt.*split|CODEX_TASK_PROMPT|unterminated prompt" },
  @{ Category = "NEXT_START_ARGUMENT_ORDER"; Pattern = "next start.*argument|next.*Invalid project directory" },
  @{ Category = "SOURCE_ZIP_PATH_SEPARATOR"; Pattern = "backslash|path separator|SOURCE_ZIP_PATH_SEPARATOR" },
  @{ Category = "SOURCE_ZIP_FORBIDDEN_ENTRY"; Pattern = "Forbidden source ZIP entry|node_modules|\.env|credentials" },
  @{ Category = "SAMPLE_PACK_JSON_BASE64_RESPONSE"; Pattern = "zipBase64|SAMPLE_PACK_JSON_BASE64_RESPONSE" },
  @{ Category = "SAMPLE_PACK_STALE_FILE"; Pattern = "stale|timestamp.*run start|SAMPLE_PACK_STALE_FILE" },
  @{ Category = "SAMPLE_PACK_INVALID_ZIP"; Pattern = "invalid zip|Missing ZIP|End of Central Directory|SAMPLE_PACK_INVALID_ZIP" },
  @{ Category = "SAMPLE_PACK_MISSING_ADAPTER"; Pattern = "missing.*adapter|agent_adapters/(claude-code|trae|cursor)" },
  @{ Category = "COMPLETION_GATE_FAILURE"; Pattern = "Autonomous Completion Gate FAIL|completion gate" },
  @{ Category = "TAG_NULL_TRIM"; Pattern = "Trim\(\).*null|TAG_NULL_TRIM|Cannot bind argument.*Trim" },
  @{ Category = "DIRTY_WORKTREE"; Pattern = "working tree|worktree|git status.*modified|DIRTY_WORKTREE" },
  @{ Category = "HISTORICAL_RELEASE_MODIFIED"; Pattern = "Historical releases? (modified|changed)|HISTORICAL_RELEASE_MODIFIED" }
)

foreach ($Rule in $Rules) {
  if ($Message -match $Rule.Pattern) {
    Write-Output $Rule.Category
    exit 0
  }
}

Write-Output "COMPLETION_GATE_FAILURE"
