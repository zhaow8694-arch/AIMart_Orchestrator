# RUN_APP.md Requirements

Codex 必须在最终产品生成的执行包中输出 `docs/RUN_APP.md`。

内容必须包含：

1. 环境要求。
2. 首次安装步骤。
3. 开发模式启动命令。
4. 测试命令。
5. 构建命令。
6. 生产启动命令。
7. 常见问题。
8. 默认端口。
9. 默认账号，如果项目有账号系统。
10. 故障排查。

示例结构：

```markdown
# Run App

## Requirements

- Node.js 20+
- pnpm

## First Install

pnpm install

## Start Dev

pnpm dev

## Test

pnpm test

## Build

pnpm build

## Troubleshooting

...
```
