# Task Queue

Generated for: Todo API

## TASK-001 Initialize target project

- Status: pending
- Phase: setup
- Risk: L1
- Dependencies: none
- Test command: `pnpm build`
- Rollback: Remove generated skeleton files and restore the previous package files.

### Done Criteria

- Project dependencies install successfully.
- Lint, test, and build commands are available.

## TASK-002 Implement v0.1 core MVP

- Status: pending
- Phase: core
- Risk: L2
- Dependencies: TASK-001
- Test command: `pnpm test`
- Rollback: Revert the feature files touched for the MVP implementation.

### Done Criteria

- MVP behavior is implemented without expanding scope.
- Explicit requirements from PROJECT_SPEC are traceable in code or docs.

## TASK-003 Apply runtime and permission boundaries

- Status: pending
- Phase: runtime
- Risk: L2
- Dependencies: TASK-001
- Test command: `pnpm test`
- Rollback: Restore previous runtime policy files from backup.

### Done Criteria

- Runtime policy files are present.
- High-risk operations are documented instead of executed automatically.

## TASK-004 Add focused tests

- Status: pending
- Phase: qa
- Risk: L1
- Dependencies: TASK-002, TASK-003
- Test command: `pnpm test`
- Rollback: Remove only the failing or obsolete test files introduced in this task.

### Done Criteria

- Core behavior has automated tests.
- Regression-prone script or adapter output is covered.

## TASK-005 Write delivery documentation

- Status: pending
- Phase: docs
- Risk: L1
- Dependencies: TASK-003
- Test command: `pnpm lint`
- Rollback: Restore previous docs from backup or remove generated doc files.

### Done Criteria

- README, RUN_APP, ENV_SETUP, and security docs are complete.
- Known assumptions and open questions are documented honestly.

## TASK-006 Finalize local delivery artifact

- Status: pending
- Phase: finalize
- Risk: L2
- Dependencies: TASK-004, TASK-005
- Test command: `pnpm build`
- Rollback: Delete only project-local generated artifacts or local tag if needed.

### Done Criteria

- Finalize script completes locally.
- Release notes and final delivery check are present.
- Remote push or deployment is not performed.