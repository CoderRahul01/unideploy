"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Shield,
  Sparkles,
  Cpu,
  Zap,
  Code2,
  Boxes,
  Database,
  Layers,
  BarChart3,
  Bot,
  Play,
} from "lucide-react";
import { TEMPLATES } from "@/lib/sandbox/templates";

const C = {
  bg: "#0B0F0C",
  surface: "#121813",
  surfaceCard: "#151F16",
  surfaceHover: "#1A271B",
  surfaceInput: "#090D0A",
  border: "#202E22",
  borderHover: "#2F4232",
  borderActive: "#6DB84A",
  text: "#E8F0D8",
  textSecondary: "#A3B398",
  textMuted: "#6B7C62",
  green: "#6DB84A",
  greenBright: "#22C55E",
  greenLight: "#86EFAC",
  greenGlow: "rgba(109, 184, 74, 0.15)",
  amber: "#F0A830",
  blue: "#60A5FA",
  purple: "#C084FC",
  font: "var(--font-body), DM Sans, sans-serif",
  mono: "var(--font-mono), JetBrains Mono, monospace",
  display: "var(--font-display), Sora, sans-serif",
};

type CategoryType = "all" | "data" | "agents" | "apis" | "shell";

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filteredTemplates = TEMPLATES.filter((tmpl) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "data") return tmpl.id === "colab-python";
    if (selectedCategory === "agents") return tmpl.id === "agent-code-interpreter" || tmpl.id === "agent-scraper";
    if (selectedCategory === "apis") return tmpl.id === "model-deploy";
    if (selectedCategory === "shell") return tmpl.id === "cloud-terminal";
    return true;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: C.font,
        paddingBottom: 120,
      }}
    >
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(18, 24, 19, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 1140,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/"
              style={{
                fontFamily: C.mono,
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                textDecoration: "none",
              }}
            >
              unideploy
            </Link>
            <span style={{ color: C.textMuted, fontSize: 13 }}>/</span>
            <span
              style={{
                fontFamily: C.mono,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.greenLight,
                background: "rgba(109, 184, 74, 0.12)",
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid rgba(109, 184, 74, 0.25)",
              }}
            >
              Cloud Marketplace
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/sandbox"
              style={{
                fontSize: 13,
                color: C.greenLight,
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Zap size={14} />
              <span>Launch Sandbox</span>
            </Link>
            <Link
              href="/pricing"
              style={{
                fontSize: 13,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Pricing
            </Link>
            <Link
              href="/getting-started"
              style={{
                fontSize: 13,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Docs
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "56px 24px 28px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: C.greenLight,
            fontFamily: C.mono,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 14,
            background: "rgba(109, 184, 74, 0.1)",
            padding: "5px 14px",
            borderRadius: 999,
            border: "1px solid rgba(109, 184, 74, 0.25)",
          }}
        >
          <Sparkles size={13} color={C.greenLight} />
          <span>100% Cloud-Native · Zero Local Device Downloads · Sub-2s MicroVMs</span>
        </div>

        <h1
          style={{
            fontFamily: C.display,
            fontSize: 42,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            lineHeight: 1.18,
            margin: "0 0 16px",
          }}
        >
          AI Cloud Sandbox &amp; Template Marketplace
        </h1>

        <p
          style={{
            fontSize: 16,
            color: C.textSecondary,
            margin: "0 auto",
            maxWidth: 680,
            lineHeight: 1.65,
          }}
        >
          Discover, customize, and launch pre-configured Firecracker microVM sandboxes instantly in your browser.
          No local setup, zero battery drain, and no Docker memory hogs. Build custom scripts, save them to your workspace, or deploy them as 24/7 REST APIs.
        </p>

        {/* ── Category Filters ───────────────────────────────────────── */}
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            background: C.surface,
            padding: 5,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            marginTop: 36,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {(
            [
              { id: "all", label: "All Templates", icon: Boxes },
              { id: "data", label: "Python & Data Science", icon: BarChart3 },
              { id: "agents", label: "AI Agents & Interpreters", icon: Bot },
              { id: "apis", label: "APIs & Microservices", icon: Zap },
              { id: "shell", label: "Linux Cloud Shell", icon: Terminal },
            ] as const
          ).map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: C.font,
                  border: "none",
                  cursor: "pointer",
                  background: isSelected ? "rgba(109, 184, 74, 0.18)" : "transparent",
                  color: isSelected ? "#FFFFFF" : C.textMuted,
                  boxShadow: isSelected ? `0 0 12px ${C.greenGlow}` : "none",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: isSelected ? C.borderActive : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={15} color={isSelected ? C.greenLight : C.textMuted} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Marketplace Templates Grid ────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "24px 24px 48px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                background: C.surface,
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              <div>
                {/* Header: Badge & Specs */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: C.mono,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: C.greenLight,
                      background: "rgba(109, 184, 74, 0.15)",
                      padding: "3px 9px",
                      borderRadius: 6,
                      border: "1px solid rgba(109, 184, 74, 0.25)",
                    }}
                  >
                    {tmpl.badge}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: C.mono, color: C.textMuted }}>
                    {tmpl.specs.cpu} · {tmpl.specs.ram}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: C.display,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    margin: "0 0 10px",
                    lineHeight: 1.3,
                  }}
                >
                  {tmpl.name}
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color: C.textSecondary,
                    margin: "0 0 16px",
                    lineHeight: 1.55,
                  }}
                >
                  {tmpl.description}
                </p>

                {/* MicroVM Runtime Specs */}
                <div
                  style={{
                    background: C.surfaceInput,
                    borderRadius: 8,
                    padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    fontSize: 11,
                    fontFamily: C.mono,
                    color: C.textMuted,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Cpu size={13} color={C.greenLight} />
                    <span>{tmpl.specs.os}</span>
                  </div>
                  <div style={{ width: 1, height: 12, background: C.border }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Zap size={13} color={C.amber} />
                    <span>Sub-2s Boot</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <Link
                  href={`/sandbox?template=${tmpl.id}`}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: C.greenBright,
                    color: "#06230C",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 2px 10px rgba(34, 197, 94, 0.25)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Play size={13} fill="#06230C" />
                  <span>Launch in Cloud</span>
                </Link>

                <Link
                  href={`/sandbox?template=${tmpl.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: C.surfaceCard,
                    border: `1px solid ${C.borderHover}`,
                    color: C.textSecondary,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                  title="Open in editor to customize and save"
                >
                  <Code2 size={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Architecture Comparison: Zero Local Load ──────────────────── */}
      <section
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "36px 24px 64px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(18, 28, 19, 0.7) 0%, rgba(13, 20, 14, 0.7) 100%)",
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "36px 36px",
          }}
        >
          <div style={{ maxWidth: 680, marginBottom: 32 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontFamily: C.mono,
                fontWeight: 700,
                color: C.greenLight,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              <Shield size={13} color={C.greenLight} />
              <span>Zero Local Footprint</span>
            </div>
            <h2
              style={{
                fontFamily: C.display,
                fontSize: 26,
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "0 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              Why Run 100% in UniDeploy Cloud Sandboxes?
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>
              Local Docker daemons consume 10GB–16GB of system RAM, drain laptop battery life, and pollute system Python paths. UniDeploy offloads everything to dedicated Firecracker microVMs.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            <div style={{ background: C.surface, padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: C.greenBright }}>
                <Zap size={16} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>Sub-2s Cloud Boot</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                Firecracker microVMs spin up isolated Linux environments faster than local Docker Desktop can even initialize.
              </p>
            </div>

            <div style={{ background: C.surface, padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: C.blue }}>
                <Layers size={16} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>Zero Battery Drain</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                Heavy matrix computations, Pandas merges, and web scraping run in the cloud without heating your laptop or throttling CPU.
              </p>
            </div>

            <div style={{ background: C.surface, padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: C.purple }}>
                <Database size={16} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>Zero Colab Disconnects</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                Unlike free Google Colab sessions that disconnect when you step away, UniDeploy preserves your variables and outputs.
              </p>
            </div>

            <div style={{ background: C.surface, padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: C.amber }}>
                <Shield size={16} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>100% Host Isolation</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                Safely run untrusted LLM-generated code or web scrapers with zero access to your machine&apos;s local files or credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLI Terminal Cloud Runner ─────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "0 24px 64px",
        }}
      >
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: C.mono, color: C.greenLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                <Terminal size={13} />
                <span>Prefer the Terminal?</span>
              </div>
              <h3 style={{ fontFamily: C.display, fontSize: 22, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                Run Remote Cloud Sandboxes from Your Local CLI
              </h3>
            </div>
            <span style={{ fontSize: 12, fontFamily: C.mono, color: C.textMuted, background: C.surfaceInput, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}` }}>
              No local Python or Docker needed
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>
            Install the UniDeploy CLI via npm. Code executes directly in isolated cloud microVMs while streaming stdout, stderr, and chart outputs back to your terminal window.
          </p>

          <div
            style={{
              background: C.surfaceInput,
              borderRadius: 10,
              padding: "16px 20px",
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: C.mono,
              fontSize: 13,
              color: C.greenLight,
            }}
          >
            <code>npm install -g unideploy &amp;&amp; unideploy run script.py</code>
            <button
              onClick={() => handleCopy("npm install -g unideploy && unideploy run script.py", "cli-cmd")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: C.surfaceCard,
                border: `1px solid ${C.borderHover}`,
                color: C.textSecondary,
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: C.font,
              }}
            >
              {copiedCmd === "cli-cmd" ? <Check size={13} color={C.greenBright} /> : <Copy size={13} />}
              <span>{copiedCmd === "cli-cmd" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Paid Conversion Upgrade Banner ────────────────────────────── */}
      <section
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(20, 33, 22, 0.9) 0%, rgba(13, 20, 14, 0.9) 100%)",
            border: `1.5px solid ${C.borderActive}`,
            borderRadius: 16,
            padding: "36px 36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            boxShadow: "0 16px 36px rgba(109, 184, 74, 0.12)",
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: C.mono,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.greenLight,
                background: "rgba(109, 184, 74, 0.2)",
                padding: "4px 10px",
                borderRadius: 6,
                display: "inline-block",
                marginBottom: 10,
              }}
            >
              UNLOCK PERSISTENT CLOUD COMPUTE
            </span>
            <h3
              style={{
                fontFamily: C.display,
                fontSize: 24,
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "0 0 10px",
              }}
            >
              Save Custom Models, Persist Storage &amp; Deploy 24/7 APIs
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>
              Free users enjoy 3 daily microVM sessions and browser workspace saving. Upgrade to <strong>Starter (₹499/mo)</strong> for 20 compute hours and persistent filesystems, or <strong>Pro (₹1,499/mo)</strong> for 3 live deployed HTTPS endpoints with custom API keys. Instant checkout via UPI, RuPay, and Cards.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 10,
                background: C.greenBright,
                color: "#06230C",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(34, 197, 94, 0.3)",
              }}
            >
              <span>View Plans from ₹499/mo</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/sandbox"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                borderRadius: 10,
                background: C.surfaceCard,
                border: `1px solid ${C.borderHover}`,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <span>Try Web Sandbox</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
