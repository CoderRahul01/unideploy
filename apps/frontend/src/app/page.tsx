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
  Shield,
  Zap,
  RefreshCw,
  Sliders,
  Copy,
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
  const [codeTab, setCodeTab] = useState<"curl" | "python" | "ts" | "composio">("curl");
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCheckout = (tierName: string) => {
    posthog.capture("checkout_initiated", { tier: tierName, annual: annualBilling, source: "landing" });
    const DODO_PRODUCT_MAP: Record<string, { monthly: string; annual: string }> = {
      starter: {
        monthly: "pdt_0NfRPIDZgIPVGLL45EiGe",
        annual: "pdt_0NfRPVE7owS0NJwLO3LUl",
      },
      pro: {
        monthly: "pdt_0NfRPxJ2x8CUfGx9IzZT9",
        annual: "pdt_0NfRQIl15TvH6p5pQpoKv",
      },
      team: {
        monthly: "pdt_0NfRR1eES9t51E5OLG7j9",
        annual: "pdt_0NfRR1eES9t51E5OLG7j9",
      },
    };
    const key = tierName.toLowerCase();
    let targetTier = "starter";
    if (key.includes("pro")) targetTier = "pro";
    else if (key.includes("team") || key.includes("enterprise")) targetTier = "team";

    const prodConfig = DODO_PRODUCT_MAP[targetTier] || DODO_PRODUCT_MAP.starter;
    const directProductId = annualBilling ? prodConfig.annual : prodConfig.monthly;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://unideploy.in";
    const returnUrl = `${origin}/dashboard?payment=success&upgraded=${encodeURIComponent(tierName)}`;
    window.location.href = `https://checkout.dodopayments.com/buy/${directProductId}?redirect_url=${encodeURIComponent(returnUrl)}`;
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
            href="#architecture"
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            Architecture
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
              4. Deploy AI Models &amp; Microservices with Zero Downtime
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              Deploy small AI models (PyTorch, ONNX, Scikit-Learn, GGUF) and Python inference scripts into live, isolated microVMs in seconds. Get an authenticated HTTPS URL, edge token-bucket rate limits, zero-downtime hot swapping, and effortless multi-platform action management via Composio.
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
              title: "Launch in Browser or Terminal",
              desc: "Jump straight into the web studio at unideploy.in/sandbox with zero install, or run directly from your terminal using npx unideploy.",
            },
            {
              step: "02",
              title: "Write, Test, or Fine-Tune Your Model",
              desc: "Pre-loaded with Python, NumPy, Pandas, Matplotlib, and AI runtimes. Test models, adjust weights, and inspect plots in isolated Firecracker microVMs.",
            },
            {
              step: "03",
              title: "Deploy 24/7 REST API with Composio",
              desc: "Get an authenticated HTTPS endpoint with smart rate limits, zero downtime, and tool actions to GitHub, Slack, and Vercel via Composio.",
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

      {/* ── Section: AI Model Deployment & Private Sandbox Architecture ── */}
      <section id="architecture" style={{ marginBottom: 90 }}>
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
            Architecture &amp; Private Sandboxes
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
            How developers deploy models without downtime or cloud headaches
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 8, maxWidth: 680, margin: "8px auto 0" }}>
            Kernel-level microVM isolation protects your models and datasets. Edge rate limiting shields your compute, and Composio connects your model to 250+ platforms.
          </p>
        </div>

        {/* 4 Architectural Pillars Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(109, 184, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={16} color="var(--accent-green)" />
              </div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Private Sandbox Isolation</h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Each run executes inside a dedicated Debian 13 Firecracker microVM with its own virtualized kernel. No noisy neighbours, no memory leaks between tenants, and zero risk to host infrastructure.
            </p>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(109, 184, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={16} color="var(--accent-green)" />
              </div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Zero-Downtime Hot Swap</h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Fine-tune models and adjust weights directly inside the sandbox. When updating inference code, warm standby microVMs handle traffic instantly without dropped sockets or downtime.
            </p>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(109, 184, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sliders size={16} color="var(--accent-green)" />
              </div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Awesome Rate Limiting</h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Edge gateway enforces token-bucket rate limits per API key with DDoS protection and transparent HTTP 429 Retry-After headers to prevent runaway billing and compute exhaustion.
            </p>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(109, 184, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={16} color="var(--accent-green)" />
              </div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Composio Multi-Platform</h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Connect your deployed model or autonomous agent directly to 250+ platforms (GitHub, Slack, Discord, Linear, Notion) through Composio with zero OAuth setup friction.
            </p>
          </div>
        </div>

        {/* Interactive "How to Include in Your Project" Code Box */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "#0E140F",
            overflow: "hidden",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              background: "rgba(255,255,255,0.02)",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-muted)", marginRight: 8 }}>
                INCLUDE IN YOUR PROJECT:
              </span>
              {[
                { id: "curl", label: "cURL" },
                { id: "python", label: "Python SDK" },
                { id: "ts", label: "TypeScript / Next.js" },
                { id: "composio", label: "Composio Action Hook" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCodeTab(tab.id as "curl" | "python" | "ts" | "composio")}
                  style={{
                    background: codeTab === tab.id ? "rgba(109, 184, 74, 0.18)" : "transparent",
                    color: codeTab === tab.id ? "var(--accent-green)" : "var(--text-secondary)",
                    border: codeTab === tab.id ? "1px solid rgba(109, 184, 74, 0.4)" : "1px solid transparent",
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    fontWeight: codeTab === tab.id ? 600 : 400,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const codeSnippets: Record<string, string> = {
                  curl: `curl -X POST https://api.unideploy.in/v1/models/mod_8f21/invoke \\\n  -H "Authorization: Bearer uni_live_9a72e8140f" \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "Classify incoming customer feedback", "temperature": 0.2}'`,
                  python: `import requests\n\n# Call your live UniDeploy model endpoint from any Python app\nres = requests.post(\n    "https://api.unideploy.in/v1/models/mod_8f21/invoke",\n    headers={"Authorization": "Bearer uni_live_9a72e8140f"},\n    json={"prompt": "Classify incoming customer feedback", "temperature": 0.2}\n)\n\nprint(res.json())  # {'prediction': 'positive', 'confidence': 0.98, 'latency_ms': 34}`,
                  ts: `// Seamlessly invoke your model inside Next.js server actions or Node API\nconst res = await fetch("https://api.unideploy.in/v1/models/mod_8f21/invoke", {\n  method: "POST",\n  headers: {\n    "Authorization": \`Bearer \${process.env.UNIDEPLOY_API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({ prompt: "Classify incoming customer feedback" }),\n});\nconst data = await res.json();\nconsole.log(data.prediction);`,
                  composio: `# Trigger multi-platform actions via Composio when model makes a prediction\nfrom composio import ComposioToolSet, Action\n\ntoolset = ComposioToolSet(api_key="comp_live_demo")\nprediction = model.predict(input_data)\n\nif prediction["flag_urgent"]:\n    # Automatically create GitHub Issue or alert Slack without auth friction\n    toolset.execute_action(\n        action=Action.SLACK_CHAT_POST_MESSAGE,\n        params={"channel": "#triage", "text": f"Urgent issue detected: {prediction['summary']}"}\n    )`,
                };
                copyCode(codeSnippets[codeTab] || "");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              {copiedCode ? <Check size={12} color="var(--accent-green)" /> : <Copy size={12} />}
              <span>{copiedCode ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div style={{ padding: "18px 20px", margin: 0, overflowX: "auto" }}>
            <pre style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.6, color: "#C8D8B0" }}>
              {codeTab === "curl" && `# Invoke model endpoint via cURL with Bearer API Key
curl -X POST https://api.unideploy.in/v1/models/mod_8f21/invoke \\
  -H "Authorization: Bearer uni_live_9a72e8140f" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Classify incoming customer feedback", "temperature": 0.2}'`}

              {codeTab === "python" && `# Call your live UniDeploy model endpoint from any Python app
import requests

res = requests.post(
    "https://api.unideploy.in/v1/models/mod_8f21/invoke",
    headers={"Authorization": "Bearer uni_live_9a72e8140f"},
    json={"prompt": "Classify incoming customer feedback", "temperature": 0.2}
)

print(res.json())
# Output: {"prediction": "positive", "confidence": 0.98, "latency_ms": 34}`}

              {codeTab === "ts" && `// Seamlessly invoke your model inside Next.js server actions or Node API
const res = await fetch("https://api.unideploy.in/v1/models/mod_8f21/invoke", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.UNIDEPLOY_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prompt: "Classify incoming customer feedback" }),
});

const data = await res.json();
console.log(data.prediction);`}

              {codeTab === "composio" && `# Trigger multi-platform actions via Composio when model makes a prediction
from composio import ComposioToolSet, Action

toolset = ComposioToolSet(api_key="comp_live_demo")
prediction = model.predict(input_data)

if prediction["flag_urgent"]:
    # Automatically create GitHub Issue or alert Slack without auth friction
    toolset.execute_action(
        action=Action.SLACK_CHAT_POST_MESSAGE,
        params={"channel": "#triage", "text": f"Urgent issue detected: {prediction['summary']}"}
    )`}
            </pre>
          </div>
        </div>

        {/* ── v1 Launch vs v2 Roadmap Clear Callout ──────────────────────── */}
        <div
          style={{
            border: "1px solid rgba(109, 184, 74, 0.3)",
            borderRadius: 14,
            padding: "24px 28px",
            background: "linear-gradient(135deg, rgba(109, 184, 74, 0.06) 0%, rgba(15, 20, 15, 0.4) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div style={{ maxWidth: 660 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              <Sparkles size={13} />
              <span>Release Architecture: v1 Production Launch vs v2 Roadmap</span>
            </div>
            <h4 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
              v1 is 100% Cloud-Native: Browser Studio, CLI &amp; Edge APIs
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Zero battery drain or heavy Docker installations. Launch directly in the browser (<Link href="/sandbox" style={{ color: "var(--accent-green)", textDecoration: "underline" }}>unideploy.in/sandbox</Link>) or terminal (<code style={{ color: "var(--accent-green)" }}>npx unideploy</code>). The desktop companion app (.dmg / .exe) is on the v2 roadmap for local offline caching and hardware acceleration.
            </p>
          </div>

          <Link
            href="/sandbox"
            style={{
              padding: "10px 20px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent-green)",
              color: "#06230C",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>Try v1 Sandbox Free</span>
            <ArrowRight size={14} />
          </Link>
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

            <button
              onClick={() => handleCheckout("Starter")}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                background: "var(--accent-green)",
                color: "#06230C",
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center",
                border: "none",
                cursor: "pointer",
                display: "block",
                boxShadow: "0 2px 10px rgba(109, 184, 74, 0.3)",
              }}
            >
              Subscribe for {annualBilling ? "₹399" : "₹499"}/mo
            </button>
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

            <button
              onClick={() => handleCheckout("Pro")}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                cursor: "pointer",
                display: "block",
              }}
            >
              Upgrade to Pro ({annualBilling ? "₹1,199" : "₹1,499"}/mo)
            </button>
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

            <button
              onClick={() => handleCheckout("Team")}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                cursor: "pointer",
                display: "block",
              }}
            >
              Get Team Plan ({annualBilling ? "₹3,999" : "₹4,999"}/mo)
            </button>
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
