import { Sparkles } from "lucide-react";

export function SplashScreen({ visible }: { visible: boolean }) {
  return (
    <div
      className={
        "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 " +
        (visible ? "opacity-100" : "opacity-0")
      }
      aria-hidden={!visible}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 50% 40%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl btn-gradient animate-pulse">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <div className="mt-6 text-lg font-semibold tracking-tight text-foreground">
          Agent Testing Workspace
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
