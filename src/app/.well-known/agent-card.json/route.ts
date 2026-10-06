import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://ai-mart-orchestrator.vercel.app";
  const card = {
    name: "AIMart Execution Pack Generator",
    description:
      "Turns natural-language project descriptions into self-contained execution packs for AI coding agents (startup scripts, task checklists, acceptance criteria). Download and run.",
    url: baseUrl,
    version: "0.3.2",
    capabilities: { streaming: false, pushNotifications: false },
    skills: [
      {
        id: "generate-execution-pack",
        name: "Generate Unattended Execution Pack",
        description:
          "Input a project description (plain text, under 1MB), get a downloadable execution pack ZIP.",
        examples: ["Generate an unattended execution pack for my Python crawler project"],
      },
    ],
    authentication: { schemes: ["none"] },
  };
  return NextResponse.json(card, {
    headers: { "Content-Type": "application/json" },
  });
}
