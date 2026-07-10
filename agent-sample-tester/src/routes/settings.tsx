import { useSettings } from "@/lib/settings-context";
import { createFileRoute } from "@tanstack/react-router";
import { Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Agent Testing Workspace" },
      {
        name: "description",
        content: "Configure your agent API endpoint, key, and request header.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { apiUrl, apiKey, apiHeader, updateSettings, reset, defaults } = useSettings();
  const [url, setUrl] = useState(apiUrl);
  const [key, setKey] = useState(apiKey);
  const [header, setHeader] = useState(apiHeader);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  type SavedSettings = {
    apiUrl: string;
    apiKey: string;
    apiHeader: string;
  };

  useEffect(() => {
    setUrl(apiUrl);
    setKey(apiKey);
    setHeader(apiHeader);
  }, [apiUrl, apiKey, apiHeader]);

  async function save(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    const nextSettings = {
      apiUrl: url.trim() || defaults.apiUrl,
      apiKey: key.trim(),
      apiHeader: header.trim() || defaults.apiHeader,
    };

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as { settings?: SavedSettings };
      const savedSettings = data.settings ?? nextSettings;

      updateSettings(savedSettings);
      setUrl(savedSettings.apiUrl);
      setKey(savedSettings.apiKey);
      setHeader(savedSettings.apiHeader);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Override the agent endpoint, API key, and request header name. Values are saved to the
          local .env file and take precedence over any runtime defaults.
        </p>

        <form onSubmit={save} className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6">
          <Field
            label="Agent URL"
            hint={`Default: ${defaults.apiUrl}`}
            id="api-url"
            value={url}
            onChange={setUrl}
            placeholder="https://your-agent.example.com/v1/chat"
          />
          <Field
            label="API Key"
            hint="Sent using the request header name below. If the header is Authorization, it becomes 'Bearer <key>'."
            id="api-key"
            value={key}
            onChange={setKey}
            placeholder="sk-..."
            type="password"
          />
          <Field
            label="Request Header Name"
            hint={`Default: ${defaults.apiHeader}. Common values: Authorization, X-API-Key.`}
            id="api-header"
            value={header}
            onChange={setHeader}
            placeholder="X-API-Key"
          />

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Outgoing request header preview</div>
            <div className="mt-2 font-mono text-xs">
              {header.trim() || defaults.apiHeader || "Authorization"}: {" "}
              {key.trim()
                ? header.trim().toLowerCase() === "authorization"
                  ? `Bearer ${key.trim()}`
                  : key.trim()
                : "(enter an API key)"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-gradient inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saved ? <Check className="h-4 w-4 text-white" /> : null}
              {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  const response = await fetch("/api/settings", { method: "DELETE" });
                  if (!response.ok) {
                    throw new Error(await response.text());
                  }

                    const data = (await response.json()) as { settings?: SavedSettings };
                    const resetSettings = data.settings ?? {
                      apiUrl: defaults.apiUrl,
                      apiKey: defaults.apiKey,
                      apiHeader: defaults.apiHeader,
                    };

                  reset();
                    updateSettings(resetSettings);
                    setUrl(resetSettings.apiUrl);
                    setKey(resetSettings.apiKey);
                    setHeader(resetSettings.apiHeader);
                  setSaved(false);
                } catch (resetError) {
                  setError(resetError instanceof Error ? resetError.message : "Failed to reset settings");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to defaults
            </button>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </form>

        <div className="mt-6 rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Local .env values</div>
          <div className="mt-2 font-mono">AGENT_URL = {defaults.apiUrl || "(unset)"}</div>
          <div className="font-mono">AGENT_API_KEY = {defaults.apiKey ? "••••••" : "(unset)"}</div>
          <div className="font-mono">AGENT_API_HEADER = {defaults.apiHeader || "(unset)"}</div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  hint?: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
