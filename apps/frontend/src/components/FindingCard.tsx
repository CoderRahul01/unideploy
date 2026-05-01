"use client";

interface FindingCardProps {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  file: string;
  line?: number;
  autoFixable?: boolean;
}

const severityConfig = {
  CRITICAL: { color: "#FF6B6B", bg: "rgba(201,64,64,0.08)", border: "rgba(201,64,64,0.2)" },
  HIGH: { color: "#F0A830", bg: "rgba(196,122,32,0.08)", border: "rgba(196,122,32,0.2)" },
  MEDIUM: { color: "#8A9070", bg: "rgba(138,144,112,0.06)", border: "rgba(138,144,112,0.15)" },
  LOW: { color: "#6A7A5A", bg: "rgba(106,122,90,0.05)", border: "rgba(106,122,90,0.1)" },
};

export default function FindingCard({
  severity,
  title,
  file,
  line,
  autoFixable = false,
}: FindingCardProps) {
  const config = severityConfig[severity];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${config.border}`,
        background: config.bg,
      }}
    >
      {/* Severity badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--font-mono), JetBrains Mono, monospace",
          color: config.color,
          letterSpacing: "0.06em",
          padding: "3px 8px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${config.border}`,
          background: config.bg,
          whiteSpace: "nowrap",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {severity}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            color: "var(--text-muted)",
          }}
        >
          {file}
          {line !== undefined && `:${line}`}
        </div>
      </div>

      {/* Auto-fix badge */}
      {autoFixable && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            color: "var(--accent-live)",
            padding: "3px 8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(109,184,74,0.2)",
            background: "rgba(109,184,74,0.06)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          AUTO-FIX
        </span>
      )}
    </div>
  );
}
