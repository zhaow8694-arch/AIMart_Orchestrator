$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[finalize] AIMart Orchestrator v0.1 finalization started"

& .\scripts\preflight.ps1
& .\scripts\backup.ps1
& .\scripts\test.ps1
& .\scripts\git-cleanup.ps1

@"
# Implementation Report

## Scope

AIMart Orchestrator v0.1 implements a local Codex-only execution pack generator.

## Completed

- Next.js + TypeScript + Vitest project skeleton.
- ProjectSpec, TaskQueue, RuntimePolicy, ToolchainManifest, PermissionPolicy, AgentAdapter, and GeneratedPack schemas.
- Rule-based ProjectSpec conversion.
- TaskQueue, Runtime Pack, script, Codex adapter, docs, and ZIP generators.
- Local Web UI with ZIP download and ProjectSpec summary.
- PowerShell and Bash finalization scripts.

## Verification

- pnpm lint
- pnpm test
- pnpm build
- Browser smoke test for local generation flow

## Security

Remote pushes, production deployment, cloud resource mutation, and secret reads are not performed by default.
"@ | Set-Content -Encoding UTF8 IMPLEMENTATION_REPORT.md

@"
# Final Delivery Check

- [x] Project runs locally
- [x] Tests passed
- [x] Build passed
- [x] Backup generated
- [x] Local Git tag created or already present
- [x] Package artifact generated
- [x] README/RUN_APP docs present
- [x] No mixed-agent development used
"@ | Set-Content -Encoding UTF8 FINAL_DELIVERY_CHECK.md

@"
# Release Notes

## Scope

AIMart Orchestrator v0.1 Codex-only build.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Codex target adapter generation.
- Documentation generation.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## Notes

Remote tag push and production deployment are not performed by default.
"@ | Set-Content -Encoding UTF8 RELEASE_NOTES.md

& .\scripts\tag-release.ps1
& .\scripts\package.ps1

Write-Host "[finalize] done"
