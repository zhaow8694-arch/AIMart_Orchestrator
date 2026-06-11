# Start Here

Project: Todo API

This execution pack is meant to be run from the customer point of view after unzipping it into a project workspace.

## Start Codex

Use the stable v0.3.2 autonomous runner. It displays one approved command and prevents old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners from becoming the future path.

Approved runner script path: scripts/run-autonomous-version.ps1

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-autonomous-version.ps1 -TargetVersion v1.0
```

START_CODEX_AUTONOMOUS.ps1 and START_CODEX_SUPERVISED.ps1 remain compatibility launchers; they route to the stable generated runner path.

Use START_CODEX_SUPERVISED.ps1 or START_CODEX_SUPERVISED.cmd when a human wants interactive approval prompts.

## What The Launcher Shows

- project name
- selected AI adapter
- current lifecycle phase
- current target version
- current task
- log updated time
- release output status
- completion gate status
- blocked/known issue status
- final PASS or FAIL summary

## Customer Validation

```powershell
./scripts/verify-customer-delivery.ps1
```

```bash
bash scripts/verify-customer-delivery.sh
```

The verifier updates runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md.

## Safety

Use one selected AI adapter at a time. Generated Claude Code, Trae, and Cursor directories are independent export options, not collaborators. Do not run multiple agents against the same workspace unless a human manually coordinates ownership.