import { sendChat, type ChatMessage } from "@/lib/chat-api";
import { useSettings } from "@/lib/settings-context";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Sparkles, User, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CHAT_MESSAGES_STORAGE_KEY = "agent-sample-tester:chat-messages";

function loadMessagesFromStorage(): ChatMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isChatMessage);
  } catch {
    return [];
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant" || message.role === "system") &&
    typeof message.content === "string"
  );
}

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
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessagesFromStorage);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage failures and keep the chat functional.
    }
  }, [messages]);

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
      {messages.length > 0 && (
        <div className="flex justify-between items-center shrink-0 border-b border-border bg-background/50 px-4 py-2 backdrop-blur md:px-6">
          <span className="text-xs text-muted-foreground">
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-accent transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat
          </button>
        </div>
      )}
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_0_32px_-18px_rgba(255,255,255,0.85)] backdrop-blur-sm">
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
          "min-w-0 max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words overflow-hidden " +
          (isUser
            ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
            : "bg-card text-card-foreground ring-1 ring-border")
        }
      >
        {message.role === "assistant" ? <MarkdownText value={message.content} /> : <PlainText value={message.content} />}
      </div>
    </div>
  );
}

function PlainText({ value }: { value: string }) {
  return <div className="whitespace-pre-wrap break-words">{value}</div>;
}

function MarkdownText({ value }: { value: string }) {
  const blocks = parseMarkdownBlocks(value);

  if (blocks.length === 0) {
    return <PlainText value={value} />;
  }

  return (
    <div className="space-y-3 whitespace-normal break-words">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ol key={index} className="space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="leading-relaxed">
                  <InlineMarkdown value={item} />
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-border/80 pl-3 text-muted-foreground"
            >
              <InlineMarkdown value={block.text} />
            </blockquote>
          );
        }

        return (
          <p key={index} className="leading-relaxed">
            <InlineMarkdown value={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function InlineMarkdown({ value }: { value: string }) {
  const segments = parseInlineSegments(value);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "link") {
          return (
            <a
              key={index}
              href={segment.href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:opacity-90"
            >
              {segment.text}
            </a>
          );
        }

        if (segment.type === "strong") {
          return <strong key={index} className="font-semibold text-foreground">{segment.text}</strong>;
        }

        if (segment.type === "code") {
          return (
            <code key={index} className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[0.92em]">
              {segment.text}
            </code>
          );
        }

        return <span key={index}>{segment.text}</span>;
      })}
    </>
  );
}

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string };

type InlineSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "strong"; text: string }
  | { type: "code"; text: string };

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const rawBlocks = normalized.split(/\n\s*\n/);
  return rawBlocks.map((rawBlock) => {
    const lines = rawBlock.split("\n").map((line) => line.trimEnd());
    const listItems = lines
      .map((line) => line.match(/^\s*\d+\.\s+(.*)$/)?.[1]?.trim())
      .filter((item): item is string => Boolean(item));

    if (listItems.length > 0 && listItems.length === lines.length) {
      return { type: "list", items: listItems };
    }

    if (lines.length === 1 && lines[0].startsWith("> ")) {
      return { type: "quote", text: lines[0].slice(2).trim() };
    }

    return { type: "paragraph", text: lines.join(" ").trim() };
  });
}

function parseInlineSegments(value: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", text: value.slice(lastIndex, index) });
    }

    if (match[1] && match[2]) {
      segments.push({ type: "link", text: match[1], href: match[2] });
    } else if (match[3]) {
      segments.push({ type: "strong", text: match[3] });
    } else if (match[4]) {
      segments.push({ type: "code", text: match[4] });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({ type: "text", text: value.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", text: value }];
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-[0_0_24px_-16px_rgba(255,255,255,0.85)] backdrop-blur-sm">
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
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80" style={{ animationDelay: delay }} />
  );
}
