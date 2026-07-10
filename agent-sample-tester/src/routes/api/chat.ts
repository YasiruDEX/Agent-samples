import { createGatewayProvider } from "@/lib/ai-gateway.server";
import { readAgentSettings } from "@/lib/agent-settings.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";

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
        const messages =
          body.messages ??
          (typeof body.message === "string" && body.message.trim()
            ? [{ role: "user", content: body.message.trim() }]
            : undefined);
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("messages array is required", { status: 400 });
        }

        const { apiKey: key } = await readAgentSettings();
        if (!key) {
          return new Response("Missing agent API key on server", { status: 500 });
        }

        try {
          const gateway = createGatewayProvider(key);
          const { text } = await generateText({
            model: gateway("openai/gpt-5.5"),
            system:
              "You are a helpful AI assistant inside an Agent Manager dashboard. Answer concisely and use markdown when useful.",
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          });
          return new Response(JSON.stringify({ text }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const status =
            err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
              ? ((err as { status: number }).status)
              : 500;
          const message = err instanceof Error ? err.message : "Unknown error";
          if (status === 429) {
            return new Response("Rate limit exceeded. Please try again shortly.", { status: 429 });
          }
          if (status === 402) {
            return new Response("AI credits exhausted. Add credits in your workspace billing.", {
              status: 402,
            });
          }
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
