import { r as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as useSettings } from "./settings-context-Cy0u4pAg.mjs";
import { a as RotateCcw, s as Check } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-rWpMGB-T.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SettingsPage() {
	const { apiUrl, apiKey, apiHeader, updateSettings, reset, defaults } = useSettings();
	const [url, setUrl] = (0, import_react.useState)(apiUrl);
	const [key, setKey] = (0, import_react.useState)(apiKey);
	const [header, setHeader] = (0, import_react.useState)(apiHeader);
	const [saved, setSaved] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setUrl(apiUrl);
		setKey(apiKey);
		setHeader(apiHeader);
	}, [
		apiUrl,
		apiKey,
		apiHeader
	]);
	function save(e) {
		e.preventDefault();
		updateSettings({
			apiUrl: url.trim() || defaults.apiUrl,
			apiKey: key.trim(),
			apiHeader: header.trim() || defaults.apiHeader
		});
		setSaved(true);
		setTimeout(() => setSaved(false), 1500);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-full overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-2xl px-4 py-10 md:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold tracking-tight",
					children: "Settings"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Override the agent endpoint, API key, and request header name. Values are stored in your browser and take precedence over environment defaults."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: save,
					className: "mt-8 space-y-6 rounded-2xl border border-border bg-card p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Agent URL",
							hint: `Default: ${defaults.apiUrl}`,
							id: "api-url",
							value: url,
							onChange: setUrl,
							placeholder: "https://your-agent.example.com/v1/chat"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "API Key",
							hint: "Sent using the request header name below. If the header is Authorization, it becomes 'Bearer <key>'.",
							id: "api-key",
							value: key,
							onChange: setKey,
							placeholder: "sk-...",
							type: "password"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Request Header Name",
							hint: `Default: ${defaults.apiHeader}. Common values: Authorization, X-API-Key.`,
							id: "api-header",
							value: header,
							onChange: setHeader,
							placeholder: "X-API-Key"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium text-foreground",
								children: "Outgoing request header preview"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 font-mono text-xs",
								children: [
									header.trim() || defaults.apiHeader || "Authorization",
									": ",
									" ",
									key.trim() ? header.trim().toLowerCase() === "authorization" ? `Bearer ${key.trim()}` : key.trim() : "(enter an API key)"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-3 pt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								className: "btn-gradient inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold",
								children: [saved ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 text-white" }) : null, saved ? "Saved" : "Save changes"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									reset();
									setSaved(false);
								},
								className: "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4" }), "Reset to defaults"]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-semibold text-foreground",
							children: "Environment defaults"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 font-mono",
							children: ["AGENT_URL = ", defaults.apiUrl || "(unset)"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-mono",
							children: ["AGENT_API_KEY = ", defaults.apiKey ? "••••••" : "(unset)"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-mono",
							children: ["AGENT_API_HEADER = ", defaults.apiHeader || "(unset)"]
						})
					]
				})
			]
		})
	});
}
function Field({ label, hint, id, value, onChange, placeholder, type = "text" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			htmlFor: id,
			className: "text-sm font-medium text-foreground",
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			id,
			type,
			value,
			onChange: (e) => onChange(e.target.value),
			placeholder,
			className: "mt-2 h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
		}),
		hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1.5 text-xs text-muted-foreground",
			children: hint
		})
	] });
}
//#endregion
export { SettingsPage as component };
