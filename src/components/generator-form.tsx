"use client";

import { FormEvent, useState } from "react";

type FormState = {
  projectName: string;
  background: string;
  rawDiscussion: string;
  mvpScope: string;
  forbiddenItems: string;
  techStackPreferences: string;
  testingRequirements: string;
  deliveryRequirements: string;
  securityBoundaries: string;
  selectedAdapterIds: AdapterId[];
  executionScope: ExecutionScope;
  executionMode: ExecutionMode;
};

type AdapterId = "codex" | "claude-code" | "trae" | "cursor";
type ExecutionScope = "single_phase" | "multi_phase" | "end_to_end_delivery";
type ExecutionMode = "supervised" | "autonomous" | "end_to_end_autonomous";

type GenerateResponse = {
  fileName: string;
  zipBase64: string;
  projectSpec: {
    projectName: string;
    mvpScope: string[];
    explicitRequirements: string[];
    inferredAssumptions: string[];
    openQuestions: string[];
    selectedAdapterIds: AdapterId[];
    executionScope: string;
    executionMode: string;
  };
  error?: string;
};

type DownloadState = {
  url: string;
  fileName: string;
};

type GenerationDisplayInput = {
  isGenerating: boolean;
  summary: GenerateResponse["projectSpec"] | null;
  download: DownloadState | null;
};

export function getGenerationDisplayState({
  isGenerating,
  summary,
  download
}: GenerationDisplayInput): {
  buttonLabel: string;
  buttonAriaBusy: boolean;
  summary: GenerateResponse["projectSpec"] | null;
  download: DownloadState | null;
} {
  if (isGenerating) {
    return {
      buttonLabel: "Generating ZIP...",
      buttonAriaBusy: true,
      summary: null,
      download: null
    };
  }

  return {
    buttonLabel: "Generate ZIP",
    buttonAriaBusy: false,
    summary,
    download
  };
}

const initialFormState: FormState = {
  projectName: "",
  background: "",
  rawDiscussion: "",
  mvpScope: "",
  forbiddenItems: "",
  techStackPreferences: "Next.js, TypeScript, Zod, Vitest, pnpm",
  testingRequirements: "Core modules must have tests",
  deliveryRequirements: "ZIP delivery",
  securityBoundaries: "Do not read .env, SSH keys, or production credentials",
  selectedAdapterIds: ["codex"],
  executionScope: "single_phase",
  executionMode: "supervised"
};

export function GeneratorForm() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<DownloadState | null>(null);
  const [summary, setSummary] = useState<GenerateResponse["projectSpec"] | null>(
    null
  );
  const displayState = getGenerationDisplayState({
    isGenerating,
    summary,
    download
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (download) {
      URL.revokeObjectURL(download.url);
    }
    setIsGenerating(true);
    setError(null);
    setDownload(null);
    setSummary(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formState)
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Generation failed.");
      }

      const blob = base64ToZipBlob(data.zipBase64);
      const url = URL.createObjectURL(blob);

      setDownload({ url, fileName: data.fileName });
      setSummary(data.projectSpec);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateField<Field extends keyof FormState>(
    field: Field,
    value: FormState[Field]
  ) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <div className="workspace">
      <form className="generator" onSubmit={handleSubmit}>
        <Field
          label="Project name"
          name="projectName"
          value={formState.projectName}
          onChange={(value) => updateField("projectName", value)}
          required
        />
        <Field
          label="Project background"
          name="background"
          value={formState.background}
          onChange={(value) => updateField("background", value)}
        />
        <TextArea
          label="Deep discussion"
          name="rawDiscussion"
          value={formState.rawDiscussion}
          onChange={(value) => updateField("rawDiscussion", value)}
          required
        />
        <TextArea
          label="MVP scope"
          name="mvpScope"
          value={formState.mvpScope}
          onChange={(value) => updateField("mvpScope", value)}
        />
        <TextArea
          label="Forbidden items"
          name="forbiddenItems"
          value={formState.forbiddenItems}
          onChange={(value) => updateField("forbiddenItems", value)}
        />
        <Field
          label="Tech stack preferences"
          name="techStackPreferences"
          value={formState.techStackPreferences}
          onChange={(value) => updateField("techStackPreferences", value)}
        />
        <Field
          label="Testing requirements"
          name="testingRequirements"
          value={formState.testingRequirements}
          onChange={(value) => updateField("testingRequirements", value)}
        />
        <Field
          label="Delivery requirements"
          name="deliveryRequirements"
          value={formState.deliveryRequirements}
          onChange={(value) => updateField("deliveryRequirements", value)}
        />
        <Field
          label="Security boundaries"
          name="securityBoundaries"
          value={formState.securityBoundaries}
          onChange={(value) => updateField("securityBoundaries", value)}
        />
        <AdapterSelector
          value={formState.selectedAdapterIds}
          onChange={(value) => updateField("selectedAdapterIds", value)}
        />
        <ScopeSelector
          value={formState.executionScope}
          onChange={(value) => updateField("executionScope", value)}
        />
        <ModeSelector
          value={formState.executionMode}
          onChange={(value) => updateField("executionMode", value)}
        />
        <p className="zip-note">
          This creates a generated execution-pack ZIP for the target project, not a source release ZIP of AIMart Orchestrator.
          Selecting multiple adapters means generating multiple independent execution options; it does not run multiple agents together.
          Choose one adapter when executing against a workspace.
        </p>
        <button
          aria-busy={displayState.buttonAriaBusy}
          className="primary"
          type="submit"
          disabled={isGenerating}
        >
          {displayState.buttonLabel}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </form>

      <aside className="summary" aria-label="ProjectSpec Summary">
        <h2>ProjectSpec Summary</h2>
        {displayState.summary ? (
          <>
            <p className="summary-name">{displayState.summary.projectName}</p>
            <SummaryList title="MVP" items={displayState.summary.mvpScope} />
            <SummaryList
              title="Requirements"
              items={displayState.summary.explicitRequirements}
            />
            <SummaryList
              title="Assumptions"
              items={displayState.summary.inferredAssumptions}
            />
            <SummaryList
              title="Open Questions"
              items={displayState.summary.openQuestions}
            />
            <p className="summary-mode">
              Target adapters: {displayState.summary.selectedAdapterIds.join(", ")}
            </p>
            <p className="summary-mode">
              Execution scope: {displayState.summary.executionScope}
            </p>
            <p className="summary-mode">
              Execution mode: {displayState.summary.executionMode}
            </p>
            {displayState.download ? (
              <a
                className="download"
                href={displayState.download.url}
                download={displayState.download.fileName}
              >
                Download ZIP
              </a>
            ) : null}
          </>
        ) : (
          <p className="empty">No pack generated yet.</p>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  required = false
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  required = false
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <textarea
        name={name}
        value={value}
        required={required}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AdapterSelector({
  value,
  onChange
}: {
  value: AdapterId[];
  onChange: (value: AdapterId[]) => void;
}) {
  const adapters: Array<{ id: AdapterId; label: string }> = [
    { id: "codex", label: "Codex" },
    { id: "claude-code", label: "Claude Code" },
    { id: "trae", label: "Trae" },
    { id: "cursor", label: "Cursor" }
  ];

  function toggle(id: AdapterId) {
    if (value.includes(id)) {
      const next = value.filter((item) => item !== id);
      onChange(next.length > 0 ? next : ["codex"]);
      return;
    }

    onChange([...value, id]);
  }

  return (
    <fieldset className="mode-select">
      <legend>Target AI adapters</legend>
      {adapters.map((adapter) => (
        <label key={adapter.id}>
          <input
            checked={value.includes(adapter.id)}
            name="selectedAdapterIds"
            type="checkbox"
            value={adapter.id}
            onChange={() => toggle(adapter.id)}
          />
          <span>{adapter.label}</span>
        </label>
      ))}
      <small>
        Multiple selections generate multiple independent execution options and do not run multiple agents together.
      </small>
    </fieldset>
  );
}

function ScopeSelector({
  value,
  onChange
}: {
  value: ExecutionScope;
  onChange: (value: ExecutionScope) => void;
}) {
  return (
    <fieldset className="mode-select">
      <legend>Execution scope</legend>
      <label>
        <input
          checked={value === "single_phase"}
          name="executionScope"
          type="radio"
          value="single_phase"
          onChange={() => onChange("single_phase")}
        />
        <span>Single Phase</span>
      </label>
      <label>
        <input
          checked={value === "multi_phase"}
          name="executionScope"
          type="radio"
          value="multi_phase"
          onChange={() => onChange("multi_phase")}
        />
        <span>Multi Phase</span>
      </label>
      <label>
        <input
          checked={value === "end_to_end_delivery"}
          name="executionScope"
          type="radio"
          value="end_to_end_delivery"
          onChange={() => onChange("end_to_end_delivery")}
        />
        <span>End-to-End Delivery</span>
      </label>
    </fieldset>
  );
}

function ModeSelector({
  value,
  onChange
}: {
  value: ExecutionMode;
  onChange: (value: ExecutionMode) => void;
}) {
  return (
    <fieldset className="mode-select">
      <legend>Execution mode</legend>
      <label>
        <input
          checked={value === "supervised"}
          name="executionMode"
          type="radio"
          value="supervised"
          onChange={() => onChange("supervised")}
        />
        <span>Supervised Mode</span>
      </label>
      <label>
        <input
          checked={value === "autonomous"}
          name="executionMode"
          type="radio"
          value="autonomous"
          onChange={() => onChange("autonomous")}
        />
        <span>Autonomous Mode</span>
      </label>
      <label>
        <input
          checked={value === "end_to_end_autonomous"}
          name="executionMode"
          type="radio"
          value="end_to_end_autonomous"
          onChange={() => onChange("end_to_end_autonomous")}
        />
        <span>End-to-End Autonomous</span>
        <small>Includes phase gates, one-window status files, and final PASS/FAIL reporting.</small>
      </label>
    </fieldset>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="summary-section">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="empty">None</p>
      )}
    </section>
  );
}

function base64ToZipBlob(base64: string): Blob {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: "application/zip" });
}
