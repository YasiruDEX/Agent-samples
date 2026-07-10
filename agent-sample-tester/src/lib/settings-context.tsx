import { getAgentDefaults } from "@/lib/agent-defaults.functions";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Settings = {
  apiUrl: string;
  apiKey: string;
  apiHeader: string;
};

type SettingsContextValue = Settings & {
  updateSettings: (next: Partial<Settings>) => void;
  reset: () => void;
  defaults: Settings;
  ready: boolean;
};

const STORAGE_KEY = "agent-sample-tester:settings";

const FALLBACK_DEFAULTS: Settings = {
  apiUrl: "/api/chat",
  apiKey: "",
  apiHeader: "Authorization",
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStored(): Partial<Settings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Settings>;
  } catch {
    return {};
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: defaults, isSuccess } = useQuery({
    queryKey: ["agent-defaults"],
    queryFn: () => getAgentDefaults(),
    staleTime: Infinity,
  });

  const activeDefaults = defaults ?? FALLBACK_DEFAULTS;
  const [overrides, setOverrides] = useState<Partial<Settings>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOverrides(readStored());
    setHydrated(true);
  }, []);

  const merged: Settings = { ...activeDefaults, ...overrides };

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...merged,
      defaults: activeDefaults,
      ready: hydrated && isSuccess,
      updateSettings: (next) => {
        setOverrides((prev) => {
          const nextOverrides = { ...prev, ...next };
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOverrides));
          }
          return nextOverrides;
        });
      },
      reset: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setOverrides({});
      },
    }),
    [merged.apiUrl, merged.apiKey, merged.apiHeader, activeDefaults, hydrated, isSuccess],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
