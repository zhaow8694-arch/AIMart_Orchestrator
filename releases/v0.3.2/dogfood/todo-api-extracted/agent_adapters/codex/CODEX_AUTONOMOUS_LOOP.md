# Codex Autonomous Loop

Repeat this loop until every task is complete:

1. Pick the first pending task whose dependencies are done.
2. Read the relevant spec, runtime, adapter, and docs files.
3. Write or update tests before changing behavior.
4. Implement only what the task requires.
5. Run the task test command.
6. Run broader verification when the task affects shared behavior.
7. Update common/PROGRESS_LOG.md.
8. Continue to the next task.

Stop only for a blocker that prevents meaningful progress. Record blockers in common/BLOCKERS.md.