import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/agent-defaults.functions-B04VOSQv.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getAgentDefaults_createServerFn_handler = createServerRpc({
	id: "e5d664a604c33258e250f02dfb469b9b7687bef2d8bd545f876e0e6ae9aa548f",
	name: "getAgentDefaults",
	filename: "src/lib/agent-defaults.functions.ts"
}, (opts) => getAgentDefaults.__executeServer(opts));
var getAgentDefaults = createServerFn({ method: "GET" }).handler(getAgentDefaults_createServerFn_handler, async () => {
	return {
		apiUrl: processModule.env.AGENT_URL ?? "/api/chat",
		apiKey: processModule.env.AGENT_API_KEY ?? "",
		apiHeader: processModule.env.AGENT_API_HEADER ?? "Authorization"
	};
});
//#endregion
export { getAgentDefaults_createServerFn_handler };
