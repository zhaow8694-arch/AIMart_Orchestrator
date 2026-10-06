import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ProjectSpecInput } from "@/lib/core/project-spec";
import { createExecutionPackZip } from "@/lib/zip/packager";

const MAX_DESCRIPTION_BYTES = 1_000_000;

export function createAIMartMcpServer(): McpServer {
  const server = new McpServer({
    name: "aimart-execution-pack",
    version: "0.3.2",
  });

  server.tool(
    "generate-execution-pack",
    "把项目描述转成 AI Coding Agent 无人值守执行包（含启动脚本、任务清单、验收标准）。返回执行包摘要（含项目名、ZIP 大小、执行模式）；如需下载 ZIP 文件，请调用 HTTP API /api/generate。",
    {
      projectDescription: z
        .string()
        .max(MAX_DESCRIPTION_BYTES)
        .describe("项目描述纯文本，1MB 以内"),
      projectName: z
        .string()
        .max(200)
        .optional()
        .describe("项目名称（可选，不填则自动推断）"),
    },
    async ({ projectDescription, projectName }) => {
      const input: ProjectSpecInput = {
        rawDiscussion: projectDescription,
        ...(projectName ? { projectName } : {}),
      };
      const { pack, zipBuffer } = await createExecutionPackZip(input);
      const spec = pack.projectSpec;
      const lines = [
        `执行包已生成：${spec.projectName}`,
        `ZIP 大小：${zipBuffer.byteLength} 字节`,
        `执行模式：${spec.executionMode} / ${spec.executionScope}`,
        `适配器：${(spec.selectedAdapterIds ?? []).join(", ") || "默认"}`,
        `如需下载 ZIP，请调用 HTTP API /api/generate（POST JSON 与上述输入相同）。`,
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  return server;
}
