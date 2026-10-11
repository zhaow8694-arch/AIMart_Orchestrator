# Phase Gate Plan

Project: Todo API

Each phase must define current tasks, run relevant tests, update runtime/RUN_STATE.json, and write PASS or FAIL to runtime/COMPLETION_GATE_REPORT.md.

## Required Phase Files

- common/CURRENT_PHASE.md
- runtime/CURRENT_TASK.md
- runtime/PHASE_GATE_REPORT.md
- runtime/COMPLETION_GATE_REPORT.md
- runtime/MORNING_REPORT.md
- runtime/HANDOFF_TO_NEXT_VERSION.md

## Gate Checklist

- Scope remains inside the ProjectSpec.
- Forbidden items remain excluded.
- Required tests pass.
- Completion Gate report is current.
- High-risk commands are queued, not executed automatically.
- Next-version handoff is updated before advancing.