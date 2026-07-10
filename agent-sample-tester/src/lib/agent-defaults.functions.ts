import { createServerFn } from "@tanstack/react-start";

export const getAgentDefaults = createServerFn({ method: "GET" }).handler(async () => {
  return {
    apiUrl: process.env.AGENT_URL ?? "/api/chat",
    apiKey: process.env.AGENT_API_KEY ?? "",
    apiHeader: process.env.AGENT_API_HEADER ?? "Authorization",
  };
});
