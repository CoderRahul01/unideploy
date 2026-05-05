"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import OTPInput from "@/components/OTPInput";
import { verifySession } from "@/lib/api";

const C = {
  bg: "#0F1410",
  surface: "#161D16",
  border: "#2A3A2A",
  text: "#E8F0D8",
  muted: "#6A7A5A",
  green: "#6DB84A",
  amber: "#F0A830",
  mono: "var(--font-mono), JetBrains Mono, monospace",
  font: "var(--font-body), DM Sans, sans-serif",
};

/* ════════════════════════════════════════════════════════════════════════
   UniDeploy — Session Code Entry Page
   Developer runs `npx unideploy init` → gets 6-digit code → enters here
   ════════════════════════════════════════════════════════════════════════ */

type PageState = "entry" | "waiting" | "complete";

export default function ConnectPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("entry");
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Scan progress from WebSocket
  const [filesScanned, setFilesScanned] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to browser WebSocket for real-time progress
  useEffect(() => {
    if (!sessionId) return;

    const wsBase = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000")
      .replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    const ws = new WebSocket(`${wsBase}/ws/browser/${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "scan_progress") {
          setFilesScanned(msg.files_scanned ?? 0);
          setTotalFiles(msg.total_files ?? 0);
        } else if (msg.type === "scan_complete") {
          setPageState("complete");
          ws.close();
          setTimeout(() => {
            router.push(`/dashboard?session_id=${sessionId}`);
          }, 800);
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => { /* non-fatal — CLI will still POST results */ };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, router]);

  const connectSession = async (code: string) => {
    setLoading(true);
    setError(false);

    try {
      const data = await verifySession(code);
      setSessionId(data.session_id);
      setPageState("waiting");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShakeComplete = useCallback(() => setError(false), []);

  const handleCopy = () => {
    navigator.clipboard.writeText("npx unideploy@latest init");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPct = totalFiles > 0 ? Math.round((filesScanned / totalFiles) * 100) : 0;

  // ── Waiting state ───────────────────────────────────────────────────────────

  if (pageState === "waiting" || pageState === "complete") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.font }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, marginBottom: 48, color: C.text }}>
            unideploy
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 20px", borderRadius: 999,
            border: `1.5px solid ${pageState === "complete" ? C.green : C.amber}`,
            background: pageState === "complete" ? `${C.green}11` : `${C.amber}11`,
            fontSize: 13, fontWeight: 600, color: pageState === "complete" ? C.green : C.amber,
            marginBottom: 40,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: pageState === "complete" ? C.green : C.amber,
              animation: pageState === "complete" ? "none" : "pulse 1.5s ease-in-out infinite",
            }} />
            {pageState === "complete" ? "Scan complete — redirecting..." : "Waiting for CLI scan..."}
          </div>

          <h2 style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800,
            letterSpacing: "-0.03em", marginBottom: 16, color: C.text,
          }}>
            {pageState === "complete" ? "Scan complete" : "Scanning your project"}
          </h2>

          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 40 }}>
            {pageState === "complete"
              ? "Opening your security report..."
              : "Your CLI is running local security heuristics. Results will appear in your dashboard when complete."}
          </p>

          {/* Progress bar */}
          {pageState === "waiting" && (
            <div style={{ marginBottom: 32 }}>
              <div style={{
                height: 6, background: C.surface, borderRadius: 99,
                border: `1px solid ${C.border}`, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", background: C.green,
                  borderRadius: 99, transition: "width 0.4s ease",
                  width: totalFiles > 0 ? `${progressPct}%` : "0%",
                  animation: totalFiles === 0 ? "shimmer 2s ease-in-out infinite" : "none",
                }} />
              </div>
              {totalFiles > 0 ? (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8, fontFamily: C.mono }}>
                  {filesScanned} / {totalFiles} files scanned ({progressPct}%)
                </div>
              ) : (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                  Waiting for CLI to begin scan...
                </div>
              )}
            </div>
          )}

          {/* Terminal-style hint */}
          {pageState === "waiting" && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "14px 18px", textAlign: "left",
              fontFamily: C.mono, fontSize: 12, color: C.muted,
            }}>
              <div style={{ color: "#6DB84A", marginBottom: 4 }}>$ npx unideploy init</div>
              <div>● UniDeploy agent running</div>
              <div style={{ color: C.muted }}>  Scanning local files...</div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes shimmer {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  // ── Entry state ─────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "0 24px",
        fontFamily: C.font,
      }}
    >
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
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
              fontFamily: C.mono,
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
            style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", padding: "6px 12px" }}
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
            <span className="status-dot" style={{ background: "var(--accent-live)" }} />
            Ready
          </span>
        </div>
      </nav>

      {/* ── Status indicator ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 20px", borderRadius: "var(--radius-pill)",
            border: "1.5px solid var(--border)", background: "rgba(255,255,255,0.5)",
            fontSize: 13, color: "var(--text-secondary)", fontWeight: 500, letterSpacing: "0.02em",
          }}
        >
          <span className="status-dot" style={{ background: "var(--accent-live)" }} />
          Ready
        </div>
      </div>

      {/* ── Headline ────────────────────────────────────────────────────────── */}
      <h1
        style={{
          fontFamily: "var(--font-display), Sora, sans-serif",
          fontSize: "clamp(36px, 7vw, 48px)", fontWeight: 800,
          lineHeight: 1.1, textAlign: "center", letterSpacing: "-0.03em", marginBottom: 16,
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>Enter your</span>
        <br />
        <span style={{ color: "var(--accent-green)", fontStyle: "italic" }}>session code</span>
      </h1>

      <p
        style={{
          fontSize: 15, color: "var(--text-secondary)", textAlign: "center",
          maxWidth: 440, margin: "0 auto 40px", lineHeight: 1.6,
        }}
      >
        Type the 6-digit code shown in your terminal after running{" "}
        <code
          style={{
            fontFamily: C.mono, fontSize: 13,
            background: "rgba(92,122,62,0.08)", padding: "2px 6px",
            borderRadius: 4, color: "var(--accent-green)",
          }}
        >
          npx unideploy@latest init
        </code>
      </p>

      {/* ── OTP Input ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <OTPInput
          onComplete={connectSession}
          error={error}
          loading={loading}
          onShakeComplete={handleShakeComplete}
        />
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginBottom: 32 }}>
        Code expires in 10 minutes
      </div>

      {/* ── Trust badges ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: 24, fontSize: 13, color: "var(--text-secondary)", marginBottom: 60,
        }}
      >
        {["Local scan", "No upload", "Instant results", "Free forever"].map((badge) => (
          <span key={badge}>✓ {badge}</span>
        ))}
      </div>

      {/* ── Install block ────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", paddingBottom: 80 }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Don&apos;t have the CLI installed?
        </div>
        <div
          className="terminal-block"
          style={{ maxWidth: 400, margin: "0 auto", padding: "16px 20px" }}
        >
          <div className="terminal-dots" style={{ marginBottom: 12 }}>
            <div className="terminal-dot-red" />
            <div className="terminal-dot-amber" />
            <div className="terminal-dot-green" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ color: "#6DB84A" }}>$ </span>
              <span style={{ color: "#C8D8B0" }}>npx unideploy@latest init</span>
            </div>
            <button
              onClick={handleCopy}
              style={{
                color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent", fontFamily: C.mono, fontSize: 11,
                padding: "4px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer",
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
