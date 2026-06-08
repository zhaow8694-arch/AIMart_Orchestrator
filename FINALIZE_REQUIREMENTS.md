# Finalize Requirements

AIMart Orchestrator v0.1 必须提供完整的 PowerShell / Bash 自动化收尾脚本。

## 脚本清单

```text
scripts/preflight.ps1
scripts/preflight.sh
scripts/backup.ps1
scripts/backup.sh
scripts/test.ps1
scripts/test.sh
scripts/git-cleanup.ps1
scripts/git-cleanup.sh
scripts/tag-release.ps1
scripts/tag-release.sh
scripts/package.ps1
scripts/package.sh
scripts/finalize.ps1
scripts/finalize.sh
```

## finalize 必须做什么

1. 执行 preflight。
2. 创建备份。
3. 运行 lint/test/build。
4. 检查 Git 状态。
5. 清理临时构建产物。
6. 创建本地 release tag。
7. 打包 ZIP。
8. 生成或更新 IMPLEMENTATION_REPORT.md。
9. 生成或更新 RELEASE_NOTES.md。
10. 输出 FINAL_DELIVERY_CHECK.md。

## 安全要求

- 默认不 `git push`。
- 默认不删除远程分支。
- 默认不读 `.env`。
- 默认不读用户主目录密钥。
- 默认不操作生产资源。

## 标签规则

默认标签格式：

```text
v0.1.0-YYYYMMDDHHMM
```

如果项目中存在 `package.json.version`，可使用：

```text
v{package.version}
```

远程推送 tag 必须由用户显式批准或传参。
