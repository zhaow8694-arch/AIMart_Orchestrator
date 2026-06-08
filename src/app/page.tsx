import { APP_NAME, APP_VERSION } from "@/lib/core/version";
import { GeneratorForm } from "@/components/generator-form";

export default function Page() {
  return (
    <main className="shell">
      <header className="intro">
        <p className="eyebrow">Codex-only build pack generator</p>
        <h1>{APP_NAME}</h1>
        <p>v{APP_VERSION}</p>
      </header>
      <GeneratorForm />
    </main>
  );
}
