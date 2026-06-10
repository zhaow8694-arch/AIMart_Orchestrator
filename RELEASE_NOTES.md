# Release Notes

## Scope

AIMart Orchestrator v0.1.1 Codex-only patch release.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Codex target adapter generation.
- Documentation generation.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## v0.1.1 Fixes

- Fixed Web UI loading state so stale generated output is hidden while a new pack is being created.
- Standardized "Forbidden items" wording in generated pack docs and adapter output.
- Clarified that the source release ZIP is the repository delivery artifact, while a generated execution-pack ZIP is the runtime pack produced by the app.
- Corrected final delivery wording for generated docs/README.md and docs/RUN_APP.md.
- Required zip in Unix preflight instead of silently falling back to tar.gz packaging.

## Notes

Remote tag push and production deployment are not performed by default.
