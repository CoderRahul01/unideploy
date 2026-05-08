"use client";

import { useState } from "react";
import Terminal from "@/components/Terminal";

/* ════════════════════════════════════════════════════════════════════════
   UniDeploy Landing Page
   Design: warm cream (skyping.app aesthetic), calm, minimal, trustworthy
   ════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npx unideploy@latest init");
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
      {/* ── Section 1: Nav ─────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 32,
          marginBottom: 48,
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
          <span
            style={{
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginRight: 8,
            }}
          >
            unideploy
          </span>
          <a
            href="#how-it-works"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            How it works
          </a>
          <a
            href="/connect"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--bg-primary)",
              background: "var(--text-primary)",
              padding: "7px 16px",
              borderRadius: "var(--radius-pill)",
              textDecoration: "none",
            }}
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* ── Section 2: Status Strip ────────────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 24,
          fontWeight: 500,
        }}
      >
        macOS · Linux · Windows · Free to start
      </div>

      {/* ── Section 3: Hero Headline ───────────────────────────────────── */}
      <h1
        style={{
          fontFamily: "var(--font-display), Sora, sans-serif",
          fontSize: "clamp(40px, 8vw, 68px)",
          fontWeight: 800,
          lineHeight: 1.05,
          textAlign: "center",
          letterSpacing: "-0.03em",
          marginBottom: 20,
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>Make your app</span>
        <br />
        <span style={{ color: "var(--accent-green)", fontStyle: "italic" }}>production-ready.</span>
      </h1>

      <p
        style={{
          fontSize: 17,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          textAlign: "center",
          maxWidth: 520,
          margin: "0 auto 40px",
        }}
      >
        UniDeploy scans your vibe-coded app in seconds. No DevOps. No config.
        One command and your app is hardened, secure, and ready to ship.
      </p>

      {/* ── Section 4: Install Command Block ───────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginBottom: 12,
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          INSTALL VIA TERMINAL
        </div>

        <div className="terminal-block">
          <div className="terminal-dots">
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
              <span style={{ color: "#C8D8B0" }}>npx unideploy@latest init</span>
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
                transition: "color 0.15s ease, border-color 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 24,
            marginTop: 16,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {["Any framework", "Auto-fix", "Zero config", "Free forever"].map(
            (badge) => (
              <span key={badge}>✓ {badge}</span>
            )
          )}
        </div>
      </div>

      {/* ── Section 5: Animated Scan Terminal ──────────────────────────── */}
      <Terminal
        title="Terminal — zsh"
        animated={true}
        lines={[
          { text: "$ npx unideploy@latest init", color: "#C8D8B0", delay: 600 },
          { text: "● UniDeploy agent running", color: "#6DB84A", delay: 500 },
          { text: "  Detected: Next.js 14 + FastAPI + Supabase", color: "#C8D8B0", delay: 400 },
          { text: "  Scanning 847 files...", color: "#C8D8B0", delay: 800 },
          { text: "", delay: 200 },
          { text: "  [CRITICAL] Stripe live key in source    src/lib/stripe.ts:3", color: "#FF6B6B", delay: 350 },
          { text: "  [HIGH]     RLS disabled on 4 tables     supabase/schema.sql", color: "#F0A830", delay: 300 },
          { text: "  [HIGH]     No rate limiting on /api     routes/auth.ts:12", color: "#F0A830", delay: 300 },
          { text: "  [MEDIUM]   Missing security headers     next.config.js", color: "#8A9070", delay: 300 },
          { text: "", delay: 200 },
          { text: "  Grade: D  |  12 issues  |  8 auto-fixable", color: "#FF6B6B", bold: true, delay: 400 },
          { text: "  ✓ Dashboard ready → unideploy.in/dashboard", color: "#6DB84A", delay: 400 },
          { text: "", delay: 600 },
          { text: "$ unideploy fix", color: "#C8D8B0", delay: 400 },
          { text: "● UniDeploy FixAgent — patching 8 issues...", color: "#6DB84A", delay: 500 },
          { text: "  ✓ [CRITICAL] Stripe key moved to env var", color: "#6DB84A", delay: 350 },
          { text: "  ✓ [HIGH]     RLS policies added to 4 tables", color: "#6DB84A", delay: 350 },
          { text: "  ✓ 8 patches applied  |  Grade: B", color: "#6DB84A", bold: true, delay: 400 },
          { text: "", delay: 600 },
          { text: "$ unideploy deploy", color: "#C8D8B0", delay: 400 },
          { text: "● UniDeploy DeployAgent", color: "#6DB84A", delay: 500 },
          { text: "  Detected: Next.js → Vercel + FastAPI → Cloud Run", color: "#C8D8B0", delay: 400 },
          { text: "  ✓ vercel.json — Vercel deployment config", color: "#6DB84A", delay: 350 },
          { text: "  ✓ cloudbuild.yaml — GCP Cloud Build pipeline", color: "#6DB84A", delay: 350 },
          { text: "  ✓ Dockerfile — production container", color: "#6DB84A", delay: 350 },
          { text: "  ✓ 3 config files generated", color: "#6DB84A", bold: true, delay: 400 },
        ]}
        style={{ minHeight: 400, marginBottom: 80 }}
      />
      {/* Blinking cursor after terminal */}
      <div style={{ marginTop: -64, marginBottom: 64, textAlign: "center" }}>
        <span className="cursor-blink" style={{ color: "var(--accent-live)", fontSize: 16, fontFamily: "var(--font-mono), JetBrains Mono, monospace" }}>▊</span>
      </div>

      {/* ── Demo Section ───────────────────────────────────────────────── */}
      <DemoSection />

      {/* ── Section 6: How It Works ────────────────────────────────────── */}
      <section id="how-it-works" style={{ marginBottom: 80 }}>
        <h2
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text-primary)",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          How it works
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 16,
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          Three steps. No DevOps required.
        </p>

        {[
          {
            num: "01",
            title: "Install the scanner",
            desc: "One command installs UniDeploy globally. Works with any project — Next.js, FastAPI, Django, Express, Vite, or mixed stack. No dependencies. No config files.",
            cmd: "npx unideploy@latest init",
          },
          {
            num: "02",
            title: "Get your security grade",
            desc: "UniDeploy detects your framework and scans across 13 production-readiness categories — secrets, auth, RLS, rate limiting, dependencies, and more. You get a grade from A to F with every issue listed by file and line number.",
            cmd: "unideploy scan",
          },
          {
            num: "03",
            title: "Fix and generate deployment configs",
            desc: "AI patches your local files directly. Then generate platform-aware deployment configs for Vercel, Cloud Run, Railway, AWS, or Cloudflare — with live docs fetched at runtime. Or run it all in one command.",
            cmd: "unideploy fix  &&  unideploy deploy",
          },
          {
            num: "04",
            title: "One command does it all",
            desc: "unideploy run orchestrates the full pipeline — scan, AI fix, and deployment config generation — in a single command. Built for CI/CD and power users.",
            cmd: "unideploy run",
          },
        ].map(({ num, title, desc, cmd }) => (
          <div
            key={num}
            style={{
              borderTop: "1px solid var(--border)",
              padding: "32px 0",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono), JetBrains Mono, monospace",
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              Step {num}
            </p>
            <h3
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 12,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                maxWidth: 480,
                marginBottom: 14,
              }}
            >
              {desc}
            </p>
            <code style={{
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontSize: 13,
              color: "var(--accent-green)",
              background: "rgba(109,184,74,0.08)",
              border: "1px solid rgba(109,184,74,0.2)",
              borderRadius: 6,
              padding: "4px 10px",
            }}>
              $ {cmd}
            </code>
          </div>
        ))}
      </section>

      {/* ── Section 7: Partner Strip ───────────────────────────────────── */}
      <section style={{ marginBottom: 80 }}>
        <div
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: 20,
            fontWeight: 500,
          }}
        >
          Powered by world-class infrastructure
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {[
            { name: "Composio", desc: "tool actions" },
            { name: "Gemini", desc: "agent reasoning" },
            { name: "Tinyfish", desc: "live platform docs" },
            { name: "Dodo Payments", desc: "billing" },
            { name: "Supermemory", desc: "project memory" },
            { name: "AutoSend", desc: "notifications" },
            { name: "E2B", desc: "sandbox" },
          ].map(({ name, desc }) => (
            <span
              key={name}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-pill)",
                padding: "8px 16px",
                background: "rgba(255,255,255,0.4)",
                fontSize: 13,
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {name}{" "}
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                · {desc}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Section 8: Bottom CTA ──────────────────────────────────────── */}
      <section
        style={{ textAlign: "center", padding: "80px 0" }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Ready to harden your app?
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Install the scanner, get your grade, and fix issues — all in under 60
          seconds.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/dashboard"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-primary)",
              padding: "12px 28px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            Open Dashboard
          </a>
          <a
            href="https://github.com/CoderRahul01/unideploy"
            target="_blank"
            rel="noreferrer"
            style={{
              background: "transparent",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
              padding: "12px 28px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            View on GitHub
          </a>
        </div>
      </section>
    </div>
  );
}

function DemoSection() {
  return (
    <section
      style={{
        marginBottom: 80,
        border: "0.5px solid rgba(90,120,60,0.3)",
        borderRadius: 12,
        padding: "48px 40px",
        background: "rgba(0,0,0,0.04)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono), JetBrains Mono, monospace",
          fontSize: 11,
          color: "var(--accent-green)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Free security audit
      </p>
      <h2
        style={{
          fontFamily: "var(--font-display), Sora, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.25,
          marginBottom: 12,
        }}
      >
        See UniDeploy scan your app live
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          marginBottom: 24,
          maxWidth: 460,
        }}
      >
        Bring your project. We run a live scan on the call and show you exactly
        what&apos;s exposed.
      </p>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}
      >
        {["30 minutes", "Google Meet", "Free security audit included"].map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--accent-green)",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{item}</span>
          </div>
        ))}
      </div>
      <button
        data-cal-link="rahulpandey187/unideploy-demo"
        data-cal-namespace="unideploy-demo"
        data-cal-config='{"layout":"month_view"}'
        style={{
          background: "var(--text-primary)",
          color: "var(--bg-primary)",
          border: "none",
          borderRadius: "var(--radius-pill)",
          padding: "12px 28px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-body), DM Sans, sans-serif",
        }}
      >
        Book a demo — it&apos;s free
      </button>
    </section>
  );
}
