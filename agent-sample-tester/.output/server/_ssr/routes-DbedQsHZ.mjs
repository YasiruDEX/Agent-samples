import { r as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as useSettings } from "./settings-context-Cy0u4pAg.mjs";
import { i as Send, n as Sparkles, t as User } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DbedQsHZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SESSION_ID_STORAGE_KEY = "agent-sample-tester:session-id";
async function sendChat({ apiUrl, apiKey, apiHeader, messages, signal }) {
	const headers = { "Content-Type": "application/json" };
	const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
	const body = {
		session_id: getSessionId(),
		message: lastUserMessage,
		messages
	};
	if (apiKey) {
		const headerName = (apiHeader || "Authorization").trim();
		if (headerName.toLowerCase() === "authorization") headers[headerName] = `Bearer ${apiKey}`;
		else headers[headerName] = apiKey;
	}
	const res = await fetch(apiUrl, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
		signal
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
	}
	if ((res.headers.get("content-type") ?? "").includes("application/json")) return extractText(await res.json());
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
function extractText(data) {
	if (typeof data === "string") return data;
	if (!data || typeof data !== "object") return "";
	const obj = data;
	if (typeof obj.text === "string") return obj.text;
	if (typeof obj.content === "string") return obj.content;
	if (typeof obj.message === "string") return obj.message;
	if (Array.isArray(obj.choices) && obj.choices.length > 0) {
		const first = obj.choices[0];
		const msg = first.message;
		if (msg && typeof msg.content === "string") return msg.content;
		if (typeof first.text === "string") return first.text;
	}
	return JSON.stringify(data);
}
function ChatPage() {
	const { apiUrl, apiKey, apiHeader } = useSettings();
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [input, setInput] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const scrollRef = (0, import_react.useRef)(null);
	const inputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages, loading]);
	(0, import_react.useEffect)(() => {
		inputRef.current?.focus();
	}, []);
	async function submit() {
		const text = input.trim();
		if (!text || loading) return;
		setError(null);
		const next = [...messages, {
			role: "user",
			content: text
		}];
		setMessages(next);
		setInput("");
		setLoading(true);
		try {
			const reply = await sendChat({
				apiUrl,
				apiKey,
				apiHeader,
				messages: next
			});
			setMessages((m) => [...m, {
				role: "assistant",
				content: reply || "(empty response)"
			}]);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
		} finally {
			setLoading(false);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}
	function onKeyDown(e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: scrollRef,
			className: "min-h-0 flex-1 overflow-y-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6",
				children: [
					messages.length === 0 && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {}),
					messages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageBubble, { message: m }, i)),
					loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TypingIndicator, {}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground",
						children: error
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "shrink-0 border-t border-border bg-background/80 px-4 py-4 backdrop-blur md:px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex w-full max-w-3xl items-end gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 rounded-2xl border border-border bg-card px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						ref: inputRef,
						value: input,
						onChange: (e) => setInput(e.target.value),
						onKeyDown,
						placeholder: "Message your agent…",
						rows: 1,
						className: "max-h-40 w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: submit,
					disabled: loading || !input.trim(),
					className: "btn-gradient inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
					"aria-label": "Send message",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto mt-2 w-full max-w-3xl text-center text-[11px] text-muted-foreground",
				children: ["Endpoint: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono",
					children: apiUrl
				})]
			})]
		})]
	});
}
function EmptyState() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto mt-16 flex max-w-md flex-col items-center text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-14 w-14 items-center justify-center rounded-2xl btn-gradient",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-6 w-6 text-white" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-5 text-2xl font-semibold tracking-tight",
				children: "How can I help today?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: [
					"Start a conversation with your agent. Configure the endpoint and API key from",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-foreground",
						children: "Settings"
					}),
					"."
				]
			})
		]
	});
}
function MessageBubble({ message }) {
	const isUser = message.role === "user";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-3 " + (isUser ? "flex-row-reverse" : "flex-row"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + (isUser ? "bg-secondary text-secondary-foreground" : "btn-gradient"),
			children: isUser ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4 text-white" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-white" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed " + (isUser ? "bg-primary/15 text-foreground ring-1 ring-primary/30" : "bg-card text-card-foreground ring-1 ring-border"),
			children: message.content
		})]
	});
}
function TypingIndicator() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-8 w-8 items-center justify-center rounded-lg btn-gradient",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-white" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1.5 rounded-2xl bg-card px-4 py-3 ring-1 ring-border",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dot, { delay: "0ms" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dot, { delay: "150ms" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dot, { delay: "300ms" })
			]
		})]
	});
}
function Dot({ delay }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "h-1.5 w-1.5 animate-bounce rounded-full bg-primary",
		style: { animationDelay: delay }
	});
}
//#endregion
export { ChatPage as component };
