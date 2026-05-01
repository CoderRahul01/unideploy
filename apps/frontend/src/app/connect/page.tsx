"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import OTPInput from "@/components/OTPInput";

/* ════════════════════════════════════════════════════════════════════════
   UniDeploy — Session Code Entry Page
   Developer runs `npx unideploy init` → gets 6-digit code → enters here
   ════════════════════════════════════════════════════════════════════════ */

export default function ConnectPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);

  const connectSession = async (code: string) => {
    setLoading(true);
    setError(false);
    console.log("[UniDeploy] Connecting session:", code);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/sessions/connect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        }
      );

      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/dashboard?session_id=${data.session_id}&machine=${encodeURIComponent(data.machine_name ?? 'Your machine')}`);

    } catch {
      setError(true);
      setLoading(false);
    }
  };

  const handleShakeComplete = useCallback(() => {
    setError(false);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText("curl -fsSL unideploy.in/install.sh | sh");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "0 24px",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
      }}
    >
      {/* ── Nav (same as landing) ──────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 32,
          marginBottom: 60,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-pill)",
            padding: "6px 6px 6px 16px",
            background: "rgba(255,255,255,0.5)",
          }}
        >
          <a
            href="/"
            style={{
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-primary)",
              textDecoration: "none",
              marginRight: 8,
            }}
          >
            unideploy
          </a>
          <a
            href="/"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            Home
          </a>
          <span
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              className="status-dot"
              style={{ background: "var(--accent-live)" }}
            />
            Ready
          </span>
        </div>
      </nav>

      {/* ── Status indicator ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: "var(--radius-pill)",
            border: "1.5px solid var(--border)",
            background: "rgba(255,255,255,0.5)",
            fontSize: 13,
            color: "var(--text-secondary)",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          <span
            className="status-dot"
            style={{ background: "var(--accent-live)" }}
          />
          Ready
        </div>
      </div>

      {/* ── Headline ───────────────────────────────────────────────────── */}
      <h1
        style={{
          fontFamily: "var(--font-display), Sora, sans-serif",
          fontSize: "clamp(36px, 7vw, 48px)",
          fontWeight: 800,
          lineHeight: 1.1,
          textAlign: "center",
          letterSpacing: "-0.03em",
          marginBottom: 16,
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>Enter your</span>
        <br />
        <span style={{ color: "var(--accent-green)", fontStyle: "italic" }}>session code</span>
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "var(--text-secondary)",
          textAlign: "center",
          maxWidth: 440,
          margin: "0 auto 40px",
          lineHeight: 1.6,
        }}
      >
        Type the 6-digit code shown in your terminal after running{" "}
        <code
          style={{
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            fontSize: 13,
            background: "rgba(92,122,62,0.08)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "var(--accent-green)",
          }}
        >
          npx unideploy init
        </code>
      </p>

      {/* ── OTP Input ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <OTPInput
          onComplete={connectSession}
          error={error}
          loading={loading}
          onShakeComplete={handleShakeComplete}
        />
      </div>

      {/* Expiry helper */}
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        Code expires in 10 minutes
      </div>

      {/* ── Trust badges ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 24,
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 60,
        }}
      >
        {["Encrypted", "Local-first", "Instant sync", "Free forever"].map(
          (badge) => (
            <span key={badge}>✓ {badge}</span>
          )
        )}
      </div>

      {/* ── Install block ──────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", paddingBottom: 80 }}>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          Don&apos;t have the agent installed?
        </div>

        <div
          className="terminal-block"
          style={{
            maxWidth: 400,
            margin: "0 auto",
            padding: "16px 20px",
          }}
        >
          <div className="terminal-dots" style={{ marginBottom: 12 }}>
            <div className="terminal-dot-red" />
            <div className="terminal-dot-amber" />
            <div className="terminal-dot-green" />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ color: "#6DB84A" }}>$ </span>
              <span style={{ color: "#C8D8B0" }}>curl -fsSL unideploy.in/install.sh | sh</span>
            </div>
            <button
              onClick={handleCopy}
              style={{
                color: "var(--text-muted)",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                fontFamily: "var(--font-mono), JetBrains Mono, monospace",
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
