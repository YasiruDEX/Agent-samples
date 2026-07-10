import { readAgentSettings } from "@/lib/agent-settings.server";
import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Body = {
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  session_id?: string;
  message?: string;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const incomingMessages = normalizeMessages(body.messages);
        const fallbackMessage =
          typeof body.message === "string" && body.message.trim()
            ? [{ role: "user", content: body.message.trim() } satisfies ChatMessage]
            : [];

        const messages = incomingMessages.length > 0 ? incomingMessages : fallbackMessage;

        if (messages.length === 0) {
          return new Response("messages array is required", { status: 400 });
        }

        const { apiUrl, apiKey, apiHeader } = await readAgentSettings();

        // If the configured AGENT_URL is the internal fallback, respond with an error
        // asking the user to configure a real agent endpoint.
        if (!apiUrl || apiUrl === "/api/chat") {
          return new Response(
            "No external agent URL configured. Set AGENT_URL in Settings.",
            { status: 500 },
          );
        }

        // Build request headers for the external agent
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (apiKey) {
          const headerName = (apiHeader || "Authorization").trim();
          if (headerName.toLowerCase() === "authorization") {
            headers[headerName] = `Bearer ${apiKey}`;
          } else {
            headers[headerName] = apiKey;
          }
        }

        const outboundBody: Record<string, unknown> = {
          session_id: typeof body.session_id === "string" ? body.session_id : "default",
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        };

        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(outboundBody),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return new Response(
              `Agent responded with ${res.status}: ${text || res.statusText}`,
              { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
            );
          }

          const contentType = res.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            const data = (await res.json()) as unknown;
            const text = extractText(data);
            return new Response(JSON.stringify({ text }), {
              headers: { "Content-Type": "application/json" },
            });
          }

          // Plain-text response from the agent
          const text = await res.text();
          return new Response(JSON.stringify({ text }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});

function normalizeMessages(messages: Body["messages"]): ChatMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages.filter(isChatMessage).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant" || message.role === "system") &&
    typeof message.content === "string"
  );
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
