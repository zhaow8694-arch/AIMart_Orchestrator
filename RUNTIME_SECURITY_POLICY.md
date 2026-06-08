# Runtime Security Policy for Building AIMart Orchestrator

## 命令风险等级

```text
L0 只读命令：ls, cat 项目文件, git status, node -v
L1 项目内安全命令：pnpm install, pnpm test, pnpm build
L2 可恢复修改：格式化、生成文件、更新 lockfile
L3 环境级命令：Docker、数据库迁移、安装系统依赖
L4 外部资源命令：git push、部署、云资源创建、PR 合并
L5 破坏性命令：删除系统目录、清空数据库、读取密钥、销毁云资源
```

## 默认允许

```text
git status
git diff
pnpm install
pnpm lint
pnpm test
pnpm build
node -v
pnpm -v
```

## 默认进入审批队列

```text
git push
git push --tags
gh pr create
vercel deploy
terraform apply
kubectl apply
brew install
apt install
npm install -g
```

## 默认禁止

```text
rm -rf /
sudo rm -rf
cat ~/.ssh/*
cat ~/.aws/*
cat .env
printenv
terraform destroy
kubectl delete
aws s3 rm --recursive
```

## 实施要求

1. Codex 执行高风险操作前，必须写入 `APPROVAL_QUEUE.md`。
2. 对于非阻塞审批项，继续执行其他 pending 任务。
3. 任何备份、清理、打包都必须限制在项目目录内。
4. 脚本默认不推送远程 tag，除非用户明确传入参数。
