# Runner Next Action

Project: Todo API

Use exactly this approved command for autonomous version execution:

Approved runner script path: scripts/run-autonomous-version.ps1

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-autonomous-version.ps1 -TargetVersion v1.0
```

> `-ExecutionPolicy Bypass` applies to that one PowerShell process only and does not change your machine's execution policy. It lets the pack launch straight from a downloaded ZIP without a manual unblock step.

Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.

Next stage: PREFLIGHT