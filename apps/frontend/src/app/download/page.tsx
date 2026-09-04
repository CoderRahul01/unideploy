"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Apple,
  Terminal,
  Copy,
  Check,
  Download,
  ArrowRight,
  Shield,
  Sparkles,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Lock,
  Cpu,
  RefreshCw
} from "lucide-react";

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
  font: "var(--font-body), DM Sans, sans-serif",
  mono: "var(--font-mono), JetBrains Mono, monospace",
  display: "var(--font-display), Sora, sans-serif",
};

export default function DownloadPage() {
  const [selectedOS, setSelectedOS] = useState<"mac" | "windows" | "npm">("mac");
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Auto-detect OS on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("win")) {
        setSelectedOS("windows");
      } else if (ua.includes("mac")) {
        setSelectedOS("mac");
      } else {
        setSelectedOS("npm");
      }
    }
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const macCurlCommand = "curl -fsSL https://unideploy.in/install.sh | bash";
  const winPsCommand = "irm https://unideploy.in/install.ps1 | iex";
  const npmCommand = "npm install -g @unideploy/cli";

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
            maxWidth: 1080,
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
              Download
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
              }}
            >
              Web Sandbox
            </Link>
            <Link
              href="/connect"
              style={{
                fontSize: 13,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Connect Machine
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "56px 24px 32px",
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
            marginBottom: 12,
            background: "rgba(109, 184, 74, 0.1)",
            padding: "4px 12px",
            borderRadius: 999,
            border: "1px solid rgba(109, 184, 74, 0.2)",
          }}
        >
          <Sparkles size={13} color={C.greenLight} />
          <span>Cloudflare Edge · E2B MicroVM Sandboxes</span>
        </div>

        <h1
          style={{
            fontFamily: C.display,
            fontSize: 38,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Get UniDeploy on Mac &amp; Windows
        </h1>

        <p
          style={{
            fontSize: 16,
            color: C.textSecondary,
            margin: "12px auto 0",
            maxWidth: 580,
            lineHeight: 1.6,
          }}
        >
          Run production audits, auto-fixes, and isolated cloud sandboxes directly from your local terminal.
          Instantly connects with our Cloudflare Worker server.
        </p>

        {/* ── OS Tabs Selector ───────────────────────────────────────── */}
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            background: C.surface,
            padding: 4,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            marginTop: 36,
          }}
        >
          <button
            onClick={() => setSelectedOS("mac")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: C.font,
              border: "none",
              cursor: "pointer",
              background: selectedOS === "mac" ? C.surfaceCard : "transparent",
              color: selectedOS === "mac" ? "#FFFFFF" : C.textMuted,
              boxShadow: selectedOS === "mac" ? `0 0 12px ${C.greenGlow}` : "none",
            }}
          >
            <Apple size={16} />
            <span>macOS</span>
          </button>

          <button
            onClick={() => setSelectedOS("windows")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: C.font,
              border: "none",
              cursor: "pointer",
              background: selectedOS === "windows" ? C.surfaceCard : "transparent",
              color: selectedOS === "windows" ? "#FFFFFF" : C.textMuted,
              boxShadow: selectedOS === "windows" ? `0 0 12px ${C.greenGlow}` : "none",
            }}
          >
            <Laptop size={16} />
            <span>Windows</span>
          </button>

          <button
            onClick={() => setSelectedOS("npm")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: C.font,
              border: "none",
              cursor: "pointer",
              background: selectedOS === "npm" ? C.surfaceCard : "transparent",
              color: selectedOS === "npm" ? "#FFFFFF" : C.textMuted,
              boxShadow: selectedOS === "npm" ? `0 0 12px ${C.greenGlow}` : "none",
            }}
          >
            <Terminal size={16} />
            <span>npm / Cross-Platform</span>
          </button>
        </div>
      </section>

      {/* ── Main Installer Card ───────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 32,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* macOS TAB CONTENT */}
          {selectedOS === "mac" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                  1-Click Terminal Command (Apple Silicon &amp; Intel)
                </span>
                <span style={{ fontSize: 11, fontFamily: C.mono, color: C.greenLight }}>
                  Recommended
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  background: C.surfaceInput,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <code
                  style={{
                    fontFamily: C.mono,
                    fontSize: 13,
                    color: "#DDF4CE",
                    userSelect: "all",
                  }}
                >
                  {macCurlCommand}
                </code>

                <button
                  onClick={() => handleCopy(macCurlCommand, "mac")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 6,
                    background: C.surfaceCard,
                    border: `1px solid ${C.borderHover}`,
                    color: copiedScript === "mac" ? C.greenBright : C.text,
                    fontSize: 12,
                    fontFamily: C.mono,
                    cursor: "pointer",
                  }}
                >
                  {copiedScript === "mac" ? (
                    <>
                      <Check size={14} color={C.greenBright} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: 13,
                  color: C.textMuted,
                }}
              >
                <span>Or download standalone binary:</span>
                <a
                  href="https://github.com/rahulpandey535/unideploy/releases/latest/download/cli-arm64"
                  style={{
                    color: C.greenLight,
                    textDecoration: "none",
                    fontFamily: C.mono,
                    fontSize: 12,
                  }}
                >
                  macOS ARM64 (M1/M2/M3/M4) ↓
                </a>
                <span>·</span>
                <a
                  href="https://github.com/rahulpandey535/unideploy/releases/latest/download/cli-x64"
                  style={{
                    color: C.greenLight,
                    textDecoration: "none",
                    fontFamily: C.mono,
                    fontSize: 12,
                  }}
                >
                  macOS x64 (Intel) ↓
                </a>
              </div>
            </div>
          )}

          {/* WINDOWS TAB CONTENT */}
          {selectedOS === "windows" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                  Run in PowerShell (Run as Administrator not required)
                </span>
                <span style={{ fontSize: 11, fontFamily: C.mono, color: C.greenLight }}>
                  Recommended for Windows
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  background: C.surfaceInput,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <code
                  style={{
                    fontFamily: C.mono,
                    fontSize: 13,
                    color: "#DDF4CE",
                    userSelect: "all",
                  }}
                >
                  {winPsCommand}
                </code>

                <button
                  onClick={() => handleCopy(winPsCommand, "win")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 6,
                    background: C.surfaceCard,
                    border: `1px solid ${C.borderHover}`,
                    color: copiedScript === "win" ? C.greenBright : C.text,
                    fontSize: 12,
                    fontFamily: C.mono,
                    cursor: "pointer",
                  }}
                >
                  {copiedScript === "win" ? (
                    <>
                      <Check size={14} color={C.greenBright} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: 13,
                  color: C.textMuted,
                }}
              >
                <span>Or download executable directly:</span>
                <a
                  href="https://github.com/rahulpandey535/unideploy/releases/latest/download/unideploy-windows-x64.exe"
                  style={{
                    color: C.greenLight,
                    textDecoration: "none",
                    fontFamily: C.mono,
                    fontSize: 12,
                  }}
                >
                  unideploy-windows-x64.exe ↓
                </a>
              </div>
            </div>
          )}

          {/* NPM TAB CONTENT */}
          {selectedOS === "npm" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                  Global Node.js Package (Linux, macOS, Windows)
                </span>
                <span style={{ fontSize: 11, fontFamily: C.mono, color: C.greenLight }}>
                  All Platforms
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  background: C.surfaceInput,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <code
                  style={{
                    fontFamily: C.mono,
                    fontSize: 13,
                    color: "#DDF4CE",
                    userSelect: "all",
                  }}
                >
                  {npmCommand}
                </code>

                <button
                  onClick={() => handleCopy(npmCommand, "npm")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 6,
                    background: C.surfaceCard,
                    border: `1px solid ${C.borderHover}`,
                    color: copiedScript === "npm" ? C.greenBright : C.text,
                    fontSize: 12,
                    fontFamily: C.mono,
                    cursor: "pointer",
                  }}
                >
                  {copiedScript === "npm" ? (
                    <>
                      <Check size={14} color={C.greenBright} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ marginTop: 16, fontSize: 12, color: C.textMuted }}>
                Or run without installing: <code>npx @unideploy/cli scan</code>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── How It Connects to Cloudflare Section ────────────────────── */}
      <section
        style={{
          maxWidth: 860,
          margin: "48px auto 0",
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: C.mono,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: C.greenLight,
              marginBottom: 8,
            }}
          >
            Seamless Machine Pairing
          </div>
          <h2
            style={{
              fontFamily: C.display,
              fontSize: 24,
              fontWeight: 800,
              color: "#FFFFFF",
              margin: 0,
            }}
          >
            How Your Machine Connects to the Cloudflare Server
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 12,
                fontWeight: 700,
                color: C.greenLight,
                marginBottom: 8,
              }}
            >
              01 · Authenticate
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
              Run <code>unideploy auth</code>
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
              Your terminal generates a secure 6-digit session code and registers it on Cloudflare KV.
            </div>
          </div>

          <div
            style={{
              background: C.surface,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 12,
                fontWeight: 700,
                color: C.greenLight,
                marginBottom: 8,
              }}
            >
              02 · Pair in Browser
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
              Visit unideploy.in/connect
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
              Enter the 6-digit code in the dashboard. Cloudflare pairs your machine identity securely.
            </div>
          </div>

          <div
            style={{
              background: C.surface,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 12,
                fontWeight: 700,
                color: C.greenLight,
                marginBottom: 8,
              }}
            >
              03 · Cloud Sandbox Ready
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
              Deploy &amp; Execute
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
              Run scans, trigger E2B sandboxes, and apply auto-fixes orchestrated by Cloudflare Workers.
            </div>
          </div>
        </div>

        {/* Action Link */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link
            href="/connect"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              borderRadius: 999,
              background: C.greenBright,
              color: "#06230C",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: `0 4px 16px rgba(34, 197, 94, 0.3)`,
            }}
          >
            <span>Ready to Pair? Go to Connect Page</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
