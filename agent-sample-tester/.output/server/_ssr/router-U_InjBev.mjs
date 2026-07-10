import { r as __toESM } from "../_runtime.mjs";
import { _ as useRouter, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, l as useLocation, m as createFileRoute, p as lazyRouteComponent, s as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as require_react, n as QueryClientProvider, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as SettingsProvider } from "./settings-context-Cy0u4pAg.mjs";
import { n as Sparkles, o as MessageSquare, r as Settings } from "../_libs/lucide-react.mjs";
import { t as createOpenAICompatible } from "../_libs/ai-sdk__openai-compatible.mjs";
import { t as generateText } from "../_libs/ai.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/router-U_InjBev.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-V1B0A6nB.css";
var NAV = [{
	to: "/",
	label: "Chat",
	icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "h-4 w-4" })
}, {
	to: "/settings",
	label: "Settings",
	icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" })
}];
function AppShell() {
	const location = useLocation();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-screen w-full overflow-hidden bg-background text-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-16 items-center gap-3 border-b border-sidebar-border px-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-9 w-9 items-center justify-center rounded-lg btn-gradient",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-white" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "leading-tight",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold tracking-tight text-sidebar-foreground",
							children: "Agent Testing Workspace"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Agent validation dashboard"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex-1 space-y-1 p-3",
					children: NAV.map((item) => {
						const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " + (active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner ring-1 ring-primary/40" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex h-6 w-6 items-center justify-center rounded-md text-white",
								children: item.icon
							}), item.label]
						}, item.to);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-t border-sidebar-border p-4 text-xs text-muted-foreground",
					children: "© 2026 WSO2"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/60 px-4 backdrop-blur md:px-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 md:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex h-8 w-8 items-center justify-center rounded-md btn-gradient",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-white" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-semibold",
								children: "Agent Testing Workspace"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "hidden text-sm text-muted-foreground md:block",
							children: location.pathname === "/settings" ? "Settings" : "Chat"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold",
								children: "A"
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "min-h-0 flex-1 overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex shrink-0 border-t border-border bg-sidebar md:hidden",
					children: NAV.map((item) => {
						const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs " + (active ? "text-white" : "text-muted-foreground"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-white",
								children: item.icon
							}), item.label]
						}, item.to);
					})
				})
			]
		})]
	});
}
function SplashScreen({ visible }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 " + (visible ? "opacity-100" : "opacity-0"),
		"aria-hidden": !visible,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-none absolute inset-0 opacity-40",
			style: { background: "radial-gradient(600px circle at 50% 40%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 60%)" }
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative flex flex-col items-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative flex h-20 w-20 items-center justify-center rounded-2xl btn-gradient animate-pulse",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-10 w-10 text-white" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 text-lg font-semibold tracking-tight text-foreground",
					children: "Agent Testing Workspace"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 w-2 animate-bounce rounded-full bg-primary" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-2 w-2 animate-bounce rounded-full bg-primary",
							style: { animationDelay: "150ms" }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-2 w-2 animate-bounce rounded-full bg-primary",
							style: { animationDelay: "300ms" }
						})
					]
				})
			]
		})]
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$3 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Agent Testing Workspace" },
			{
				name: "description",
				content: "Validate and chat with your AI agent in a focused, professional workspace."
			},
			{
				name: "author",
				content: "WSO2"
			},
			{
				name: "application-name",
				content: "Agent Testing Workspace"
			},
			{
				name: "theme-color",
				content: "#0f172a"
			},
			{
				property: "og:title",
				content: "Agent Testing Workspace"
			},
			{
				property: "og:description",
				content: "Validate and chat with your AI agent in a focused, professional workspace."
			},
			{
				property: "og:site_name",
				content: "Agent Testing Workspace"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			},
			{
				name: "twitter:title",
				content: "Agent Testing Workspace"
			},
			{
				name: "twitter:description",
				content: "Validate and chat with your AI agent in a focused, professional workspace."
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "icon",
			href: "/favicon.svg",
			type: "image/svg+xml"
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$3.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SplashGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {}) }) })
	});
}
function SplashGate({ children }) {
	const [showSplash, setShowSplash] = (0, import_react.useState)(true);
	const [mountSplash, setMountSplash] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const hideTimer = setTimeout(() => setShowSplash(false), 1200);
		const unmountTimer = setTimeout(() => setMountSplash(false), 1800);
		return () => {
			clearTimeout(hideTimer);
			clearTimeout(unmountTimer);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [children, mountSplash && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SplashScreen, { visible: showSplash })] });
}
var $$splitComponentImporter$1 = () => import("./settings-rWpMGB-T.mjs");
var Route$2 = createFileRoute("/settings")({
	head: () => ({ meta: [{ title: "Settings · Agent Testing Workspace" }, {
		name: "description",
		content: "Configure your agent API endpoint, key, and request header."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./routes-DbedQsHZ.mjs");
var Route$1 = createFileRoute("/")({
	head: () => ({ meta: [{ title: "Conversation · Agent Testing Workspace" }, {
		name: "description",
		content: "Talk to your AI agent from a clean, focused chat interface."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
function createGatewayProvider(apiKey) {
	return createOpenAICompatible({
		name: "agent-gateway",
		baseURL: "https://ai.gateway.lovable.dev/v1",
		headers: { "Lovable-API-Key": apiKey }
	});
}
var Route = createFileRoute("/api/chat")({ server: { handlers: { POST: async ({ request }) => {
	let body;
	try {
		body = await request.json();
	} catch {
		return new Response("Invalid JSON body", { status: 400 });
	}
	const messages = body.messages ?? (typeof body.message === "string" && body.message.trim() ? [{
		role: "user",
		content: body.message.trim()
	}] : void 0);
	if (!Array.isArray(messages) || messages.length === 0) return new Response("messages array is required", { status: 400 });
	const key = processModule.env.AGENT_API_KEY ?? processModule.env.LOVABLE_API_KEY;
	if (!key) return new Response("Missing agent API key on server", { status: 500 });
	try {
		const { text } = await generateText({
			model: createGatewayProvider(key)("openai/gpt-5.5"),
			system: "You are a helpful AI assistant inside an Agent Manager dashboard. Answer concisely and use markdown when useful.",
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content
			}))
		});
		return new Response(JSON.stringify({ text }), { headers: { "Content-Type": "application/json" } });
	} catch (err) {
		const status = err && typeof err === "object" && "status" in err && typeof err.status === "number" ? err.status : 500;
		const message = err instanceof Error ? err.message : "Unknown error";
		if (status === 429) return new Response("Rate limit exceeded. Please try again shortly.", { status: 429 });
		if (status === 402) return new Response("AI credits exhausted. Add credits in your workspace billing.", { status: 402 });
		return new Response(message, { status: 500 });
	}
} } } });
var SettingsRoute = Route$2.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => Route$3
});
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$3
	}),
	SettingsRoute,
	ApiChatRoute: Route.update({
		id: "/api/chat",
		path: "/api/chat",
		getParentRoute: () => Route$3
	})
};
var routeTree = Route$3._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
