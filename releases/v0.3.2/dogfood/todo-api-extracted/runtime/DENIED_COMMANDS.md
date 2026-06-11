# Denied Commands

The following commands and action categories are forbidden for automated execution. Queue L4 items in runtime/APPROVAL_QUEUE.md when they are truly needed; never run L5 secret access or destructive commands.

## Forbidden Automation Categories

- `git push` and remote tag publishing.
- Deleting or modifying historical release folders.
- Reading secrets such as `.env`, SSH keys, cloud credentials, or system credentials.
- Production deployment.
- Real database migration.
- Cloud resource creation or deletion.

## Denied Or Approval-Controlled Commands

- `git push`
- `git push --tags`
- `gh pr create`
- `vercel deploy`
- `terraform apply`
- `kubectl apply`
- `production deployment`
- `real database migration`
- `cloud resource creation`
- `cloud resource deletion`
- `delete historical release folders`
- `rm -rf /`
- `sudo rm -rf`
- `cat ~/.ssh/*`
- `cat ~/.aws/*`
- `cat .env`
- `type .env`
- `Get-Content .env`
- `printenv`
- `terraform destroy`
- `kubectl delete`
- `git push`
- `git push --tags`
- `Remove-Item releases/v0.1.0`
- `Remove-Item releases/v0.1.1`
- `Remove-Item releases/v0.2.1`
- `Remove-Item releases/v0.2.2`
- `Remove-Item releases/v0.3.0`