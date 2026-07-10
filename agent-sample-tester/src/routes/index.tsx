import { sendChat, type ChatMessage } from "@/lib/chat-api";
import { useSettings } from "@/lib/settings-context";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conversation · Agent Testing Workspace" },
      {
        name: "description",
        content: "Talk to your AI agent from a clean, focused chat interface.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { apiUrl, apiKey, apiHeader } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendChat({ apiUrl, apiKey, apiHeader, messages: next });
      setMessages((m) => [...m, { role: "assistant", content: reply || "(empty response)" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
          {messages.length === 0 && !loading && <EmptyState />}
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {loading && <TypingIndicator />}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background/80 px-4 py-4 backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-3">
          <div className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message your agent…"
              rows={1}
              className="max-h-40 w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className="btn-gradient inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mx-auto mt-2 w-full max-w-3xl text-center text-[11px] text-muted-foreground">
          Endpoint: <span className="font-mono">{apiUrl}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl btn-gradient">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">How can I help today?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start a conversation with your agent. Configure the endpoint and API key from{" "}
        <span className="text-foreground">Settings</span>.
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={"flex gap-3 " + (isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
          (isUser ? "bg-secondary text-secondary-foreground" : "btn-gradient")
        }
      >
        {isUser ? <User className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
      </div>
      <div
        className={
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed " +
          (isUser
            ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
            : "bg-card text-card-foreground ring-1 ring-border")
        }
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg btn-gradient">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
      style={{ animationDelay: delay }}
    />
  );
}
