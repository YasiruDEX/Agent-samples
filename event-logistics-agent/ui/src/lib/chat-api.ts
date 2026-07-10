export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SESSION_ID_STORAGE_KEY = "agent-sample-tester:session-id";

type SendOpts = {
  apiUrl: string;
  apiKey: string;
  apiHeader: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
};

export async function sendChat({
  messages,
  signal,
}: SendOpts): Promise<string> {
  // Always route through the internal /api/chat proxy so that the full
  // conversation history is forwarded to the configured external agent.
  // The proxy reads AGENT_URL / AGENT_API_KEY from the server-side .env file
  // and attaches the correct auth header before calling the external agent.
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const body: Record<string, unknown> = {
    session_id: getSessionId(),
    messages,
  };

  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as unknown;
    return extractText(data);
  }
  return await res.text();
}

function getSessionId() {
  if (typeof window === "undefined") return "session";

  try {
    const existing = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (existing) return existing;

    const next = crypto.randomUUID();
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

function extractText(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";
  const obj = data as Record<string, unknown>;
  if (typeof obj.text === "string") return obj.text;
  if (typeof obj.response === "string") return obj.response;
  if (typeof obj.content === "string") return obj.content;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.output === "string") return obj.output;
  if (typeof obj.result === "string") return obj.result;
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const first = obj.choices[0] as Record<string, unknown>;
    const msg = first.message as Record<string, unknown> | undefined;
    if (msg && typeof msg.content === "string") return msg.content;
    if (typeof first.text === "string") return first.text;
  }
  return JSON.stringify(data);
}
