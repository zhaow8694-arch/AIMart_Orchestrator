import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const card = {
    name: "AIMart Execution Pack Generator",
    description:
      "把自然语言项目描述转成 AI Coding Agent 无人值守执行包（含启动脚本、任务清单、验收标准），下载即用。",
    url: baseUrl,
    version: "0.3.2",
    capabilities: { streaming: false, pushNotifications: false },
    skills: [
      {
        id: "generate-execution-pack",
        name: "生成无人值守执行包",
        description:
          "输入一段项目描述（纯文本，1MB 以内），返回可下载的执行包 ZIP。",
        examples: ["帮我生成一个 Python 爬虫项目的无人值守执行包"],
      },
    ],
    authentication: { schemes: ["none"] },
  };
  return NextResponse.json(card, {
    headers: { "Content-Type": "application/json" },
  });
}
