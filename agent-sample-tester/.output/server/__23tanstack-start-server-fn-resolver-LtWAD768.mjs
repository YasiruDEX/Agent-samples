//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-LtWAD768.js
var manifest = { "e5d664a604c33258e250f02dfb469b9b7687bef2d8bd545f876e0e6ae9aa548f": {
	functionName: "getAgentDefaults_createServerFn_handler",
	importer: () => import("./_ssr/agent-defaults.functions-B04VOSQv.mjs")
} };
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
