import { r as __toESM } from "../_runtime.mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-BaOM1vmh.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-context-D9YD2z_W.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getAgentDefaults = createServerFn({ method: "GET" }).handler(createSsrRpc("e5d664a604c33258e250f02dfb469b9b7687bef2d8bd545f876e0e6ae9aa548f"));
var FALLBACK_DEFAULTS = {
	apiUrl: "/api/chat",
	apiKey: "",
	apiHeader: "Authorization"
};
var SettingsContext = (0, import_react.createContext)(null);
function SettingsProvider({ children }) {
	const { data: defaults, isSuccess } = useQuery({
		queryKey: ["agent-defaults"],
		queryFn: () => getAgentDefaults(),
		staleTime: Infinity
	});
	const activeDefaults = defaults ?? FALLBACK_DEFAULTS;
	const [overrides, setOverrides] = (0, import_react.useState)({});
	const merged = {
		...activeDefaults,
		...overrides
	};
	const value = (0, import_react.useMemo)(() => ({
		...merged,
		defaults: activeDefaults,
		ready: isSuccess,
		updateSettings: (next) => {
			setOverrides((prev) => ({
				...prev,
				...next
			}));
		},
		reset: () => {
			setOverrides({});
		}
	}), [
		merged.apiUrl,
		merged.apiKey,
		merged.apiHeader,
		activeDefaults,
		isSuccess
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsContext.Provider, {
		value,
		children
	});
}
function useSettings() {
	const ctx = (0, import_react.useContext)(SettingsContext);
	if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
	return ctx;
}
//#endregion
export { useSettings as n, SettingsProvider as t };
