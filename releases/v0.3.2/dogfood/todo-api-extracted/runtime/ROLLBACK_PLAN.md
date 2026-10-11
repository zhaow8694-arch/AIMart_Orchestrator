# Rollback Plan

Project: Todo API

1. Stop running local dev servers.
2. Restore project-local files from the latest backup.
3. Remove generated artifacts only inside the project directory.
4. If a local release tag must be removed, document the reason before deleting it.
5. Never push rollback changes or tags to a remote without explicit approval.