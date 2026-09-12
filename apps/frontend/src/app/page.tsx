"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Lock,
  Globe,
  Check,
  ArrowRight,
  Play,
  Sparkles,
  Code2,
} from "lucide-react";
import Terminal from "@/components/Terminal";
import posthog from "posthog-js";

/* ════════════════════════════════════════════════════════════════════════
   UniDeploy Landing Page
   Instant Cloud Sandboxes & AI Model Deployment
   Clean, human-written, authentic developer narrative.
   ════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [annualBilling, setAnnualBilling] = useState(false);

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        padding: "0 24px 100px",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
      }}
    >
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 28,
          marginBottom: 52,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-pill)",
            padding: "6px 8px 6px 18px",
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              textDecoration: "none",
              marginRight: 10,
              letterSpacing: "-0.02em",
            }}
          >
            unideploy
          </Link>
          <a
            href="#problems"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            Why UniDeploy
          </a>
          <a
            href="#how-it-works"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            How It Works
          </a>
          <a
            href="#pricing"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            Pricing
          </a>
          <Link
            href="/sandbox"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            Marketplace
          </Link>
          <Link
            href="/sandbox"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--bg-primary)",
              background: "var(--accent-green)",
              padding: "7px 18px",
              borderRadius: "var(--radius-pill)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Play size={13} fill="currentColor" />
            <span>Try Sandbox Free</span>
          </Link>
        </div>
      </nav>

      {/* ── Status Pill ────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 14px",
            borderRadius: 999,
            background: "rgba(109, 184, 74, 0.1)",
            border: "1px solid rgba(109, 184, 74, 0.25)",
            fontSize: 12,
            color: "var(--accent-green)",
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22C55E",
              boxShadow: "0 0 8px #22C55E",
              display: "inline-block",
            }}
          />
          <span>Instant Cloud MicroVMs · Python &amp; AI Runner · ₹0 Free Trial</span>
        </div>
      </div>

      {/* ── Hero Headline ──────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 36px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: "clamp(38px, 6vw, 58px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: 20,
            color: "var(--text-primary)",
          }}
        >
          Run Python, Data Science &amp; AI code in the cloud.
          <br />
          <span style={{ color: "var(--accent-green)" }}>Without the setup headache.</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            maxWidth: 640,
            margin: "0 auto 28px",
          }}
        >
          Instant cloud microVMs booting in under 2 seconds. A persistent Google Colab alternative that never randomly disconnects, a safe code interpreter for AI agents, and 1-click script-to-API deployment.
        </p>

        {/* Hero CTA Buttons */}
        <div style={{ display: "inline-flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/sandbox"
            onClick={() => posthog.capture("launch_sandbox_clicked", { location: "hero" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent-green)",
              color: "#06230C",
              padding: "14px 32px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(109, 184, 74, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <span>Launch Free Cloud Sandbox</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>

          <Link
            href="/sandbox"
            onClick={() => posthog.capture("browse_marketplace_clicked", { location: "hero" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              background: "rgba(255,255,255,0.03)",
              padding: "14px 26px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <Sparkles size={16} color="var(--accent-green)" />
            <span>Browse Sandbox Marketplace</span>
          </Link>

          <a
            href="#pricing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-secondary)",
              padding: "14px 18px",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            <span>From ₹499/mo</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· UPI Accepted</span>
          </a>
        </div>
      </div>

      {/* ── Key Proof Points Grid ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 60,
        }}
      >
        {[
          { stat: "< 2s", title: "MicroVM Boot Time", desc: "Debian 13 Firecracker instances ready instantly" },
          { stat: "₹0", title: "Free Trial on Signup", desc: "50,000 compute tokens & 3 daily cloud sessions" },
          { stat: "Persistent", title: "Zero Disconnects", desc: "Variables, files, and state stay saved between runs" },
          { stat: "UPI & Cards", title: "Frictionless Billing", desc: "Pay with GPay, PhonePe, Paytm or Card via Dodo" },
        ].map(({ stat, title, desc }) => (
          <div
            key={title}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "18px 16px",
              background: "rgba(255,255,255,0.02)",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 22,
                fontWeight: 800,
                color: "var(--accent-green)",
                marginBottom: 4,
              }}
            >
              {stat}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              {title}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── Interactive Sandbox Terminal Demo ──────────────────────────── */}
      <div style={{ marginBottom: 80 }}>
        <Terminal
          title="Terminal — unideploy runner"
          animated={true}
          lines={[
            { text: "$ unideploy run damped_wave_analysis.py", color: "#C8D8B0", delay: 400 },
            { text: "● Spawning isolated cloud microVM (Debian 13 Firecracker)...", color: "#6DB84A", delay: 500 },
            { text: "  Runtime: Python 3.13 | Pre-cached: NumPy, Pandas, Matplotlib, SciPy", color: "#C8D8B0", delay: 350 },
            { text: "  Sandbox ID: sbx_9f82a174 · MicroVM boot completed in 1.42s", color: "#6DB84A", delay: 400 },
            { text: "", delay: 200 },
            { text: "── Standard Output ──────────────────────────────────────────────", color: "#6B7C62", delay: 200 },
            { text: "Computed 100 timesteps with mean signal amplitude: 0.2841", color: "#E8F0D8", delay: 300 },
            { text: "Saved plot artifact: damped_oscillation.png (27.6 KB, 130 DPI)", color: "#6DB84A", bold: true, delay: 300 },
            { text: "Session state: ACTIVE & PERSISTENT (files saved to /workspace)", color: "#6DB84A", delay: 300 },
            { text: "", delay: 300 },
            { text: "$ unideploy deploy --name 'wave-forecast-api'", color: "#C8D8B0", delay: 450 },
            { text: "✓ Live API Endpoint: https://api.unideploy.in/v1/models/mod_8f21/invoke", color: "#6DB84A", bold: true, delay: 400 },
            { text: "✓ Bearer API Key: uni_live_9a72********************", color: "#C8D8B0", delay: 300 },
          ]}
          style={{ minHeight: 420 }}
        />
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <Link
            href="/sandbox"
            style={{
              fontSize: 13,
              color: "var(--accent-green)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Open Interactive Browser Sandbox &rarr;
          </Link>
        </div>
      </div>

      {/* ── Section: The 4 Everyday Developer Problems We Solve ────────── */}
      <section id="problems" style={{ marginBottom: 90 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--accent-green)",
              marginBottom: 8,
              display: "inline-block",
            }}
          >
            Why We Built UniDeploy
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display), Sora, sans-serif",
              fontSize: 32,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Real daily problems. Zero marketing fluff.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 8 }}>
            Built for developers who want to write code without cloud configuration friction.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              padding: 28,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(109, 184, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Cpu size={20} color="var(--accent-green)" />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              1. Never lose work to Google Colab disconnects
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              You step away for coffee, Colab goes idle, and your Python memory, variables, and downloaded CSVs are wiped clean. With UniDeploy, your microVM kernel stays persistent, renders high-DPI charts directly in your browser, and can be called from Python or cURL.
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              padding: 28,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(109, 184, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Lock size={20} color="var(--accent-green)" />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              2. Stop polluting your laptop with Python venvs
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              Testing a random script from GitHub, an ML model, or a web scraper shouldn&apos;t break your local brew/pip installation or eat 10GB of RAM with Docker Desktop. Run it in an isolated cloud microVM in 1.5 seconds and throw it away when you&apos;re done.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              padding: 28,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(109, 184, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Code2 size={20} color="var(--accent-green)" />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              3. Safe code interpreter for AI agents
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              Building agents with LangChain, Claude, AutoGen, or CrewAI? Running LLM-generated code on your own server is a security risk. Call UniDeploy&apos;s 1-line REST endpoint or MCP server tool to execute code in isolated microVMs safely.
            </p>
          </div>

          {/* Card 4 */}
          <div
            style={{
              padding: 28,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(109, 184, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Globe size={20} color="var(--accent-green)" />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              4. Turn any Python script into an API in 5 seconds
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              You wrote a useful Python function for financial math, image resizing, or text analysis. Don&apos;t spend half a day on Docker, FastAPI, Nginx, SSL, and AWS. Click &quot;Deploy as API&quot; and get a live HTTPS URL with authentication keys immediately.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" style={{ marginBottom: 90 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2
            style={{
              fontFamily: "var(--font-display), Sora, sans-serif",
              fontSize: 32,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Three steps. Zero DevOps.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 8 }}>
            No Dockerfiles, no IAM roles, no credit cards required to start.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              step: "01",
              title: "Open Sandbox or Mac App",
              desc: "Jump straight into the web sandbox at unideploy.in/sandbox, or launch microVMs from your Mac dock.",
            },
            {
              step: "02",
              title: "Write, Paste, or Choose Template",
              desc: "Pre-loaded with Python 3.13, NumPy, Pandas, Matplotlib, SciPy, and Node.js. Ready to execute in under 2s.",
            },
            {
              step: "03",
              title: "Run, View Charts, or Deploy API",
              desc: "Get stdout and high-DPI rendered plots instantly, or click Deploy to expose an authenticated HTTPS endpoint.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "24px 24px",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono), JetBrains Mono, monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent-green)",
                  marginBottom: 10,
                }}
              >
                STEP {step}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display), Sora, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section: Pricing (Working & Transparent) ───────────────────── */}
      <section id="pricing" style={{ marginBottom: 90 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--accent-green)",
              marginBottom: 8,
              display: "inline-block",
            }}
          >
            Transparent Pricing · Dodo Payments
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display), Sora, sans-serif",
              fontSize: 34,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Predictable cloud pricing. No surprise AWS bills.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 8 }}>
            Supports Indian UPI (GPay, PhonePe, Paytm), RuPay, and international credit cards.
          </p>

          {/* Billing Toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginTop: 20 }}>
            <span style={{ fontSize: 13, color: !annualBilling ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
              Monthly
            </span>
            <button
              onClick={() => setAnnualBilling(!annualBilling)}
              style={{
                width: 48,
                height: 26,
                borderRadius: 999,
                background: annualBilling ? "var(--accent-green)" : "rgba(255,255,255,0.15)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s ease",
              }}
              aria-label="Toggle annual billing"
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  position: "absolute",
                  top: 3,
                  left: annualBilling ? 25 : 3,
                  transition: "left 0.2s ease",
                }}
              />
            </button>
            <span style={{ fontSize: 13, color: annualBilling ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
              Annual <span style={{ color: "var(--accent-green)", fontSize: 12 }}>· 2 Months Free</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          {/* Card 1: Free Trial */}
          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Free Trial
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px", minHeight: 36 }}>
                For students, tinkerers, and quick script tests. No card required.
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  ₹0
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/ month</span>
              </div>
              <ul style={{ margin: "0 0 24px", paddingLeft: 0, listStyle: "none", fontSize: 13, color: "var(--text-secondary)", lineHeight: 2 }}>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 50,000 free compute tokens
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 3 cloud microVM sessions / day
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Google Colab alternative runner
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Instant Cloud Sandbox Marketplace
                </li>
              </ul>
            </div>

            <Link
              href="/sandbox"
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
                display: "block",
              }}
            >
              Start Free Trial
            </Link>
          </div>

          {/* Card 2: Starter Plan */}
          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(109, 184, 74, 0.05)",
              border: "1.5px solid var(--accent-green)",
              boxShadow: "0 8px 30px rgba(109, 184, 74, 0.15)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -11,
                right: 20,
                background: "var(--accent-green)",
                color: "#06230C",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                letterSpacing: "0.06em",
              }}
            >
              MOST POPULAR
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Starter
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px", minHeight: 36 }}>
                For data analysts and developers needing persistent cloud state.
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {annualBilling ? "₹399" : "₹499"}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/ month (~$6)</span>
              </div>
              <ul style={{ margin: "0 0 24px", paddingLeft: 0, listStyle: "none", fontSize: 13, color: "var(--text-secondary)", lineHeight: 2 }}>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> <strong>20 compute hours</strong> / month
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 500,000 compute tokens
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Persistent filesystem &amp; state
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 5-minute sustained timeouts
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 1 deployed model API endpoint
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Instant UPI &amp; RuPay checkout
                </li>
              </ul>
            </div>

            <Link
              href="/pricing"
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                background: "var(--accent-green)",
                color: "#06230C",
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
                display: "block",
                boxShadow: "0 2px 10px rgba(109, 184, 74, 0.3)",
              }}
            >
              Subscribe for ₹499/mo
            </Link>
          </div>

          {/* Card 3: Pro Plan */}
          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Pro
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px", minHeight: 36 }}>
                For AI engineers deploying production endpoints and autonomous agents.
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {annualBilling ? "₹1,199" : "₹1,499"}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/ month (~$18)</span>
              </div>
              <ul style={{ margin: "0 0 24px", paddingLeft: 0, listStyle: "none", fontSize: 13, color: "var(--text-secondary)", lineHeight: 2 }}>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> <strong>80 compute hours</strong> / month
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 2.5M tokens / month
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 3 live deployed API endpoints + keys
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Unlimited disposable sandboxes
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Priority compute queue (&lt; 1.2s boot)
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Full MCP agent tools integration
                </li>
              </ul>
            </div>

            <Link
              href="/pricing"
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
                display: "block",
              }}
            >
              Upgrade to Pro
            </Link>
          </div>

          {/* Card 4: Team Plan */}
          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Team
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px", minHeight: 36 }}>
                For research labs, startups, and agencies with pooled compute needs.
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {annualBilling ? "₹3,999" : "₹4,999"}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/ month (~$59)</span>
              </div>
              <ul style={{ margin: "0 0 24px", paddingLeft: 0, listStyle: "none", fontSize: 13, color: "var(--text-secondary)", lineHeight: 2 }}>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> <strong>300 compute hours</strong> pooled
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> 10,000,000 tokens / month
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Unlimited deployed model endpoints
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Multi-seat workspace &amp; shared keys
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} color="var(--accent-green)" /> Direct priority WhatsApp / Slack
                </li>
              </ul>
            </div>

            <Link
              href="/pricing"
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
                display: "block",
              }}
            >
              Get Team Plan
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section: Cloud-First Marketplace ────────────────────────────── */}
      <section
        style={{
          marginBottom: 80,
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "36px 36px",
          background: "linear-gradient(135deg, rgba(18, 28, 19, 0.7) 0%, rgba(13, 20, 14, 0.7) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 24,
        }}
      >
        <div style={{ maxWidth: 580 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontWeight: 700,
              color: "var(--accent-green)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            <Sparkles size={13} color="var(--accent-green)" />
            <span>100% Cloud-First Marketplace</span>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display), Sora, sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color: "#FFFFFF",
              margin: "0 0 10px",
              letterSpacing: "-0.02em",
            }}
          >
            Launch cloud sandboxes straight from your browser
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Zero local downloads, battery drain, or heavy Docker configurations. UniDeploy runs isolated microVMs with sub-2s boot times, persistent cloud memory, and 1-click REST API deployment.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/sandbox"
            style={{
              padding: "12px 22px",
              borderRadius: 10,
              background: "var(--accent-green)",
              color: "#06230C",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Launch Cloud Sandbox</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <Link
            href="/pricing"
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View Pricing Plans
          </Link>
        </div>
      </section>

      {/* ── Section: Bottom CTA ────────────────────────────────────────── */}
      <section style={{ textAlign: "center", padding: "40px 0 20px" }}>
        <h2
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 34,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          Ready to run code without cloud headaches?
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            marginBottom: 28,
            maxWidth: 500,
            margin: "0 auto 28px",
          }}
        >
          Try the sandbox right now in your browser. 50,000 free tokens, 3 daily sessions, no credit card required.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/sandbox"
            style={{
              background: "var(--accent-green)",
              color: "#06230C",
              padding: "14px 32px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(109, 184, 74, 0.35)",
            }}
          >
            Launch Free Sandbox
          </Link>
          <Link
            href="/pricing"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              background: "transparent",
              padding: "14px 28px",
              borderRadius: "var(--radius-pill)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            See Pricing &amp; Plans
          </Link>
        </div>
      </section>
    </div>
  );
}
