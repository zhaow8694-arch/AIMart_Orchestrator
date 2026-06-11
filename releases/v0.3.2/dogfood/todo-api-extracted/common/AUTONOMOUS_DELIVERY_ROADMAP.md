# Autonomous Delivery Roadmap

Project: Todo API

This roadmap adapts the generic AIMart delivery ladder to the supplied ProjectSpec. Assumptions stay explicit so the selected AI can continue without repeated human prompting for ordinary work.

## Project Context

- Background: A local sample API used to verify AIMart generated execution packs.
- MVP scope: - Todo CRUD endpoints
- local tests
- generated run docs
- Forbidden items: - No SaaS accounts
- no cloud runner
- no payment
- no production deploy
- no external API integration
- Testing requirements: - Core modules must have tests
- completion gate must run before success
- Delivery requirements: - Generated execution-pack ZIP with completion gate docs
- manifest
- roadmap
- and independent adapter options
- Security boundaries: - Do not read .env
- SSH keys
- cloud credentials
- or system secrets

## Assumptions

- None

## Version Path

- v0.0.1 discovery/spec: confirm scope, constraints, assumptions, and task queue.
- v0.1.0 MVP implementation: build the smallest usable local product matching the ProjectSpec.
- v0.2.x autonomous runtime and completion gates: add safe autonomous execution, reports, and verification gates.
- v0.3.x multi-agent independent adapters: generate independent adapter options for Codex, Claude Code, Trae, and Cursor.
- v0.4.x runner hardening: improve resilience, resumability, logs, and blocked-command handling.
- v0.5.x delivery automation: freeze releases, generate checksums, sample packs, and handoff reports.
- v1.0 final usable delivery: complete acceptance criteria, final verification, docs, and release handoff.

The selected AI advances only after the phase Completion Gate reports PASS.