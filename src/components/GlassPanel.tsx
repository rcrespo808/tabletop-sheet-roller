import type { ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  glow?: "subtle" | "medium" | "strong";
  level?: "primary" | "secondary" | "tertiary";
};

const glowClasses = {
  subtle: "shadow-lg shadow-purple-500/10",
  medium: "shadow-xl shadow-purple-500/15",
  strong: "shadow-2xl shadow-purple-500/25"
};

const levelClasses = {
  primary: "border border-slate-700/30 bg-gradient-to-br from-slate-900/55 to-slate-950/55",
  secondary: "border border-slate-700/25 bg-slate-950/35",
  tertiary: "border border-slate-700/20 bg-slate-900/25"
};

export function GlassPanel({
  children,
  className = "",
  glow = "subtle",
  level = "secondary"
}: GlassPanelProps) {
  return (
    <div
      className={[
        "rounded-lg backdrop-blur-xl transition-all duration-300",
        levelClasses[level],
        glowClasses[glow],
        className
      ].join(" ")}
    >
      {children}
    </div>
  );
}
