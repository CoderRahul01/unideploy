"use client";

import Terminal from "@/components/Terminal";
import posthog from "posthog-js";

/* ════════════════════════════════════════════════════════════════════════
   UniDeploy Landing Page
   Design: warm cream (skyping.app aesthetic), calm, minimal, trustworthy
   ════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {

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
        Mac App · Apple Silicon + Intel · Free to start
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
        <span style={{ color: "var(--text-primary)" }}>UniDeploy</span>
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
          margin: "0 auto 20px",
        }}
      >
        Production-readiness agent for vibe-coded apps.
        You build anywhere. We make it production-grade.
      </p>

      {/* ── Section 3b: Stat Tiles ─────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 40,
        }}
      >
        {[
          { stat: "2,000+", desc: "critical vulns found in 5,600+ vibe-coded apps (Escape.tech)" },
          { stat: "400+", desc: "exposed secrets in production apps" },
          { stat: "45%", desc: "of AI-generated code has OWASP Top 10 flaws (Veracode)" },
          { stat: "63%", desc: "of vibe-coding users are non-developers" },
        ].map(({ stat, desc }) => (
          <div
            key={stat}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "16px 14px",
              textAlign: "center",
              background: "rgba(255,255,255,0.3)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 24,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              {stat}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 3c: Three Scan Category Cards ──────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
        {[
          {
            emoji: "🔐",
            title: "Secrets",
            desc: "Finds hardcoded API keys, missing LLM tool ignore files (.cursorignore, .claudeignore, .aiderignore), and secrets in git history.",
            grade: "Grade: A–F",
          },
          {
            emoji: "🛡️",
            title: "Supabase RLS",
            desc: "Detects CVE-2025-48757 pattern: USING(true) policies, service_role in client code, disabled RLS.",
            grade: "Grade: A–F",
          },
          {
            emoji: "🚀",
            title: "Deploy Readiness",
            desc: "CORS wildcard, missing rate limiting, HTTPS issues, dep vulnerabilities, error handling gaps.",
            grade: "Grade: A–F",
          },
        ].map(({ emoji, title, desc, grade }) => (
          <div
            key={title}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "20px 24px",
              background: "rgba(255,255,255,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{emoji}</span>
              <span
                style={{
                  fontFamily: "var(--font-display), Sora, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {title}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono), JetBrains Mono, monospace",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "2px 8px",
                }}
              >
                {grade}
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* ── Section 4: Download CTA ─────────────────────────────────────── */}
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginBottom: 16,
            fontWeight: 500,
          }}
        >
          Get started in seconds
        </div>

        <a
          href="https://github.com/rahulpandey535/unideploy/releases/latest/download/UniDeploy.dmg"
          onClick={() => posthog.capture("mac_download_clicked", { location: "hero" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "var(--text-primary)",
            color: "var(--bg-primary)",
            padding: "14px 32px",
            borderRadius: "var(--radius-pill)",
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ fontSize: 18 }}>↓</span>
          Download for Mac
        </a>

        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          macOS 13+ · Apple Silicon &amp; Intel · Free to start
        </p>

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 24,
            marginTop: 20,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {["Any framework", "Auto-fix", "Zero config", "Free forever"].map((badge) => (
            <span key={badge}>✓ {badge}</span>
          ))}
        </div>
      </div>

      {/* ── Section 5: Animated Scan Terminal ──────────────────────────── */}
      <Terminal
        title="Terminal — zsh"
        animated={true}
        lines={[
          { text: '$ unideploy auth', color: "#C8D8B0", delay: 400 },
          { text: "✓ Authenticated! Token stored.", color: "#6DB84A", delay: 500 },
          { text: "", delay: 200 },
          { text: '$ unideploy "scan this project"', color: "#C8D8B0", delay: 600 },
          { text: "● UniDeploy agent running", color: "#6DB84A", delay: 500 },
          { text: "  Detected: Next.js 14 + Supabase", color: "#C8D8B0", delay: 400 },
          { text: "  Scanning 847 files...", color: "#C8D8B0", delay: 800 },
          { text: "", delay: 200 },
          { text: "  [CRITICAL] Stripe live key in source    src/lib/stripe.ts:3", color: "#FF6B6B", delay: 350 },
          { text: "  [CRITICAL] .env in git history          recoverable via git log", color: "#FF6B6B", delay: 300 },
          { text: "  [HIGH]     RLS disabled on 4 tables     supabase/schema.sql", color: "#F0A830", delay: 300 },
          { text: "  [HIGH]     No rate limiting on /api     routes/auth.ts:12", color: "#F0A830", delay: 300 },
          { text: "  [HIGH]     .cursorignore missing        .env exposed to Cursor", color: "#F0A830", delay: 300 },
          { text: "  [MEDIUM]   Missing security headers     next.config.js", color: "#8A9070", delay: 300 },
          { text: "", delay: 200 },
          { text: "  Grade: D  |  12 issues  |  8 auto-fixable", color: "#FF6B6B", bold: true, delay: 400 },
          { text: "  Migrate secrets → 1Claw: https://1claw.xyz", color: "#6DB84A", delay: 400 },
          { text: "", delay: 600 },
          { text: '$ unideploy "fix the secrets issues"', color: "#C8D8B0", delay: 400 },
          { text: "● UniDeploy — patching 8 issues...", color: "#6DB84A", delay: 500 },
          { text: "  ✓ [CRITICAL] Stripe key moved to env var", color: "#6DB84A", delay: 350 },
          { text: "  ✓ [HIGH]     RLS policies added to 4 tables", color: "#6DB84A", delay: 350 },
          { text: "  ✓ [HIGH]     .cursorignore created", color: "#6DB84A", delay: 350 },
          { text: "  ✓ 8 patches applied  |  Grade: B", color: "#6DB84A", bold: true, delay: 400 },
        ]}
        style={{ minHeight: 450, marginBottom: 80 }}
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
            title: "Install & Authenticate",
            desc: "Download the Mac application (.dmg) and move the unideploy binary to your path (e.g., /usr/local/bin). Run the authentication command to securely connect your CLI to your dashboard.",
            action: "$ unideploy auth",
          },
          {
            num: "02",
            title: "Scan your project",
            desc: "Run the scan command in any Next.js, FastAPI, or Express project. UniDeploy finds secrets, audits RLS policies, and checks deploy readiness, grading your app from A to F.",
            action: "$ unideploy \"scan this project\"",
          },
          {
            num: "03",
            title: "Fix issues automatically",
            desc: "UniDeploy doesn't just report — it patches your local files directly. It moves secrets to env vars, applies ignore files for LLM tools, and hardens configurations automatically.",
            action: "$ unideploy \"fix the secrets issues\"",
          },
        ].map(({ num, title, desc, action }) => (
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
            <span style={{
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontSize: 12,
              color: "var(--accent-green)",
              background: "rgba(109,184,74,0.08)",
              border: "1px solid rgba(109,184,74,0.2)",
              borderRadius: 6,
              padding: "4px 10px",
            }}>
              {action}
            </span>
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
      <section style={{ textAlign: "center", padding: "80px 0" }}>
        <h2
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Start your first scan →
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          Security grade in 60 seconds. No config. No DevOps.
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
            href="https://github.com/rahulpandey535/unideploy/releases/latest/download/UniDeploy.dmg"
            onClick={() => posthog.capture("mac_download_clicked", { location: "footer_cta" })}
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-primary)",
              padding: "12px 28px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            ↓ Download for Mac
          </a>
          <a
            href="/dashboard"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              background: "transparent",
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
        onClick={() => posthog.capture("demo_booking_clicked", { location: "landing_demo_section" })}
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
