# High Risk Commands

The following commands must not run automatically. Queue them in APPROVAL_QUEUE.md first.

## Requires Approval

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

## Forbidden By Default

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