import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIMart Orchestrator",
  description: "Codex-only execution pack generator"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
