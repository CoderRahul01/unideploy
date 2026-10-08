"use client";
import { Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function DemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B0F0C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            fontSize: 11,
            color: "#86EFAC",
            background: "rgba(109, 184, 74, 0.12)",
            border: "1px solid rgba(109, 184, 74, 0.25)",
            padding: "4px 12px",
            borderRadius: 999,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Live Sandbox Demo
        </span>

        <h1
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 34,
            fontWeight: 700,
            color: "#FFFFFF",
            lineHeight: 1.25,
            marginBottom: 16,
          }}
        >
          See Cloud MicroVMs in Action
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#A3B398",
            lineHeight: 1.7,
            marginBottom: 32,
          }}
        >
          Watch how fast UniDeploy boots isolated Debian microVMs, renders data visualisations in real time, runs autonomous agent code safely, and deploys scripts as live REST APIs.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 36,
            alignItems: "center",
          }}
        >
          {[
            "20 minutes interactive session",
            "Google Colab migration & benchmark",
            "Agent code execution walkthrough",
            "500,000 complimentary compute tokens included",
          ].map((item) => (
            <div
              key={item}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <CheckCircle2 size={16} color="#6DB84A" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "#DDF4CE" }}>{item}</span>
            </div>
          ))}
        </div>

        <button
          data-cal-link="rahulpandey187/unideploy-demo"
          data-cal-namespace="unideploy-demo"
          data-cal-config='{"layout":"month_view"}'
          style={{
            background: "#22C55E",
            color: "#0B0F0C",
            border: "none",
            borderRadius: 8,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(34, 197, 94, 0.3)",
          }}
        >
          <Calendar size={17} strokeWidth={2.5} />
          Book a Live Walkthrough — It&apos;s Free
        </button>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 16, fontSize: 13 }}>
          <Link href="/sandbox" style={{ color: "#86EFAC", textDecoration: "none" }}>
            Or try the Web Sandbox now →
          </Link>
        </div>
      </div>
    </main>
  );
}
