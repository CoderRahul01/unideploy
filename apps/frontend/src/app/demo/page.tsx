"use client";
import { Calendar } from "lucide-react";

export default function DemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f1410",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            fontSize: 11,
            color: "#1D9E75",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Free security audit
        </span>

        <h1
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#e8f0d8",
            lineHeight: 1.25,
            marginBottom: 16,
          }}
        >
          Book a security audit
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#6a7a5a",
            lineHeight: 1.7,
            marginBottom: 32,
          }}
        >
          Bring your project. We run a live scan on the call and walk you
          through exactly what&apos;s exposed — and how to fix it.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 40,
            alignItems: "center",
          }}
        >
          {["30 minutes", "Google Meet", "Free security audit included"].map(
            (item) => (
              <div
                key={item}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#1D9E75",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, color: "#8a9a7a" }}>{item}</span>
              </div>
            )
          )}
        </div>

        <button
          data-cal-link="rahulpandey187/unideploy-demo"
          data-cal-namespace="unideploy-demo"
          data-cal-config='{"layout":"month_view"}'
          style={{
            background: "#1D9E75",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Calendar size={17} strokeWidth={2} />
          Book a demo — it&apos;s free
        </button>

        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "#3a4a2a",
          }}
        >
          No prep needed. Just show up with your GitHub URL.
        </p>
      </div>
    </main>
  );
}
