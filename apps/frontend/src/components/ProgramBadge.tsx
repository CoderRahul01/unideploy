"use client";

interface ProgramBadgeProps {
  program: "e2b" | "devlabs";
}

// E2B brand: pure black/white monochrome with orange accent — e2b.dev
// Devlabs brand: dark bg, warm orange fox — devlabs.club
const BADGE_CONFIG = {
  e2b: {
    label: "E2B Startup Program",
    borderColor: "#FF8C00",
    textColor: "#b0a090",
    animationName: "pulseBorderE2b",
  },
  devlabs: {
    label: "Devlabs Momentum Program",
    borderColor: "#F07B2C",
    textColor: "#b09070",
    animationName: "pulseBorderDevlabs",
  },
} as const;

export default function ProgramBadge({ program }: ProgramBadgeProps) {
  const cfg = BADGE_CONFIG[program];

  return (
    <>
      <style>{`
        @keyframes ${cfg.animationName} {
          0%, 100% { border-color: ${cfg.borderColor}40; }
          50%       { border-color: ${cfg.borderColor}cc; }
        }
      `}</style>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: 999,
          border: `0.5px solid ${cfg.borderColor}40`,
          background: "rgba(255,255,255,0.02)",
          color: cfg.textColor,
          fontSize: 11,
          fontFamily: "var(--font-mono), JetBrains Mono, monospace",
          letterSpacing: "0.03em",
          animation: `${cfg.animationName} 3s ease-in-out infinite`,
        }}
      >
        {cfg.label}
      </span>
    </>
  );
}
