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
  apiUrl,
  apiKey,
  apiHeader,
  messages,
  signal,
}: SendOpts): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const body: Record<string, unknown> = {
    session_id: getSessionId(),
    message: lastUserMessage,
    messages,
  };

  if (apiKey) {
    const headerName = (apiHeader || "Authorization").trim();
    if (headerName.toLowerCase() === "authorization") {
      headers[headerName] = `Bearer ${apiKey}`;
    } else {
      headers[headerName] = apiKey;
    }
  }

  const res = await fetch(apiUrl, {
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
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const first = obj.choices[0] as Record<string, unknown>;
    const msg = first.message as Record<string, unknown> | undefined;
    if (msg && typeof msg.content === "string") return msg.content;
    if (typeof first.text === "string") return first.text;
  }
  return JSON.stringify(data);
}
