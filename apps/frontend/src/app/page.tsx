"use client";

import { Cloud, Server, Cpu, ShieldCheck, Lock, Layers, Globe, Check, ArrowRight } from "lucide-react";
import Terminal from "@/components/Terminal";
import posthog from "posthog-js";

/* ════════════════════════════════════════════════════════════════════════
   UniDeploy Landing Page
   Open SaaS & E2B Cloud Sandbox Platform
   Typography: Sans category (DM Sans & Sora)
   Icons: Professional Lucide SVG icons (Zero emojis)
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
              fontWeight: 600,
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
            href="/pricing"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            Pricing
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
        Open Source Core · Powered by E2B Cloud Sandboxes · Free Tier Available
      </div>

      {/* ── Section 3: Hero Headline ───────────────────────────────────── */}
      <h1
        style={{
          fontFamily: "var(--font-display), Sora, sans-serif",
          fontSize: "clamp(38px, 7vw, 62px)",
          fontWeight: 800,
          lineHeight: 1.08,
          textAlign: "center",
          letterSpacing: "-0.03em",
          marginBottom: 20,
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>Deploy Anywhere.</span>
        <br />
        <span style={{ color: "var(--accent-green)" }}>Host on UniDeploy Cloud.</span>
      </h1>

      <p
        style={{
          fontSize: 17,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          textAlign: "center",
          maxWidth: 540,
          margin: "0 auto 24px",
        }}
      >
        Deploy vibe-coded web apps and AI agents in isolated E2B cloud microVMs. Open source core for complete self-hosting freedom, or zero-config UniDeploy Cloud SaaS.
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
          { stat: "2,000+", desc: "microVM sandboxes executed for modern apps" },
          { stat: "$20,000", desc: "in E2B credits powering free managed cloud sandboxes" },
          { stat: "100%", desc: "open source CLI engine for complete self-hosting" },
          { stat: "1-Click", desc: "cloud deployments with managed SSL & live previews" },
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

      {/* ── Section 3c: Three Core Platform Category Cards ──────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
        {[
          {
            icon: Cpu,
            title: "E2B Cloud Sandboxes",
            desc: "Isolated Linux microVM cloud environments running Next.js, Node, React, and Python applications with instant live preview URLs.",
            badge: "Cloud MicroVM",
          },
          {
            icon: Cloud,
            title: "Managed Cloud SaaS",
            desc: "Zero-config hosted deployment version. Automatic SSL, managed PostgreSQL/Redis databases, environment secret vaults, and team RBAC.",
            badge: "Zero Setup",
          },
          {
            icon: Server,
            title: "Open Source Engine",
            desc: "Self-host anytime on your own VPS or private infrastructure using our 100% open source CLI engine and Docker containers.",
            badge: "Open Core",
          },
        ].map(({ icon: IconComponent, title, desc, badge }) => (
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(92, 122, 62, 0.12)",
                  color: "var(--accent-green)",
                }}
              >
                <IconComponent size={18} strokeWidth={2} />
              </div>
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
                {badge}
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

      {/* ── Section 4: Get Started Action ───────────────────────────────── */}
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
          Start deploying on UniDeploy Cloud
        </div>

        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href="/connect"
            onClick={() => posthog.capture("get_started_clicked", { location: "hero" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--text-primary)",
              color: "var(--bg-primary)",
              padding: "14px 32px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Launch Cloud Sandbox
            <ArrowRight size={16} strokeWidth={2} />
          </a>

          <a
            href="/pricing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              background: "transparent",
              padding: "14px 28px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            View Pricing Tiers
          </a>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 14,
            marginBottom: 0,
          }}
        >
          Free starter cloud sandbox tier included · Powered by $20,000 E2B credits
        </p>

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 20,
            marginTop: 20,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {["E2B MicroVMs", "Managed SSL", "Self-Host Open Core", "Partner Integrations"].map((badge) => (
            <span key={badge} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={14} strokeWidth={2.5} style={{ color: "var(--accent-green)" }} />
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* ── Section 5: Animated Sandbox Terminal ──────────────────────────── */}
      <Terminal
        title="Terminal — unideploy cloud"
        animated={true}
        lines={[
          { text: '$ unideploy auth', color: "#C8D8B0", delay: 400 },
          { text: "✓ Authenticated! Token stored for UniDeploy Cloud.", color: "#6DB84A", delay: 500 },
          { text: "", delay: 200 },
          { text: '$ unideploy cloud sandbox --template nextjs', color: "#C8D8B0", delay: 600 },
          { text: "● Initializing E2B isolated cloud microVM...", color: "#6DB84A", delay: 500 },
          { text: "  Detected project: Next.js 14 + Node 20", color: "#C8D8B0", delay: 400 },
          { text: "  Allocating E2B microVM sandbox (ID: sbx-8f92a1)...", color: "#C8D8B0", delay: 800 },
          { text: "  Starting live preview server on port 3000...", color: "#C8D8B0", delay: 400 },
          { text: "", delay: 200 },
          { text: "  ✓ E2B Sandbox Live: https://sbx-8f92a1.e2b.dev", color: "#6DB84A", bold: true, delay: 400 },
          { text: "  Running automated production scan...", color: "#C8D8B0", delay: 350 },
          { text: "  ✓ Secrets audit: Passed (0 hardcoded keys)", color: "#6DB84A", delay: 300 },
          { text: "  ✓ RLS Policy audit: Passed", color: "#6DB84A", delay: 300 },
          { text: "  ✓ SSL & CORS headers: Configured", color: "#6DB84A", delay: 300 },
          { text: "", delay: 200 },
          { text: '  Grade: A  |  Production Ready  |  Deployed to UniDeploy Cloud', color: "#6DB84A", bold: true, delay: 400 },
          { text: "", delay: 600 },
          { text: '$ unideploy deploy --cloud', color: "#C8D8B0", delay: 400 },
          { text: "● Promoting sandbox to production deployment...", color: "#6DB84A", delay: 500 },
          { text: "  ✓ Domain linked: https://my-app.unideploy.cloud", color: "#6DB84A", bold: true, delay: 400 },
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
          Three steps. Zero infra pain.
        </p>

        {[
          {
            num: "01",
            title: "Authenticate & Connect",
            desc: "Install the open source CLI engine or sign up on UniDeploy Cloud. Link your CLI to your dashboard in seconds.",
            action: "$ unideploy auth",
          },
          {
            num: "02",
            title: "Launch E2B Cloud Sandbox",
            desc: "Spin up an isolated Linux microVM sandbox powered by E2B for your Next.js, Node, or Python app with instant live previews.",
            action: "$ unideploy cloud sandbox --create",
          },
          {
            num: "03",
            title: "Deploy to Managed SaaS or Self-Host",
            desc: "Promote your sandbox to production on UniDeploy Cloud with automated SSL & managed DBs, or export to your own VPS anytime.",
            action: "$ unideploy deploy --cloud",
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
          Powered by world-class cloud infrastructure
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
            { name: "E2B", desc: "microVM sandboxes" },
            { name: "Vercel", desc: "hosting connector" },
            { name: "Render", desc: "cloud runner" },
            { name: "DigitalOcean", desc: "droplet partner" },
            { name: "Composio", desc: "tool actions" },
            { name: "Gemini", desc: "agent reasoning" },
            { name: "Dodo Payments", desc: "billing" },
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
          Launch your E2B Cloud Sandbox
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          Zero setup. Free starter tier included. Open source engine available.
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
            href="/connect"
            onClick={() => posthog.capture("get_started_clicked", { location: "footer_cta" })}
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
            Get Started Free
          </a>
          <a
            href="/pricing"
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
            Explore SaaS Tiers
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
        Managed Cloud Walkthrough
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
        See E2B Cloud Sandboxes in Action
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
        Book a quick demo. We will show you how to spin up E2B isolated cloud microVM sandboxes, manage multi-cloud hosting, and automate production security.
      </p>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}
      >
        {["30 minutes", "Google Meet", "E2B cloud sandbox setup included"].map((item) => (
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
