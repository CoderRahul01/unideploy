"use client";

import Link from "next/link";
import { useState } from "react";
import posthog from "posthog-js";

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

export default function DocsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText("curl -fsSL https://unideploy.in/install.sh | bash");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    posthog.capture("copy_install_command", { method: "curl" });
  };

  const commands = [
    { cmd: "unideploy auth", desc: "Authenticate CLI with your unideploy.in account" },
    { cmd: "unideploy whoami", desc: "Check current login status and active account info" },
    { cmd: "unideploy logout", desc: "Log out and clear stored API tokens" },
    { cmd: 'unideploy "scan this project"', desc: "Audit the local project for security and deploy readiness" },
    { cmd: 'unideploy "scan for secrets"', desc: "Perform a deep scan for exposed API keys and credentials" },
    { cmd: 'unideploy "check RLS"', desc: "Verify Supabase RLS policies and identify exposure bugs" },
    { cmd: 'unideploy "check deploy readiness"', desc: "Run pre-deploy checks (CORS, CSP, helmet, vulnerable deps)" },
    { cmd: 'unideploy "fix the secrets issues"', desc: "Auto-fix detected security issues using agentic AI" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.font, padding: "60px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Header/Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 60 }}>
          <Link href="/" style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: C.text, textDecoration: "none" }}>
            unideploy
          </Link>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/dashboard" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
              Dashboard
            </Link>
            <Link href="/connect" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>
              Connect CLI
            </Link>
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(32px, 5vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
          Getting Started
        </h1>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.6, marginBottom: 40 }}>
          UniDeploy is a production-readiness agent that runs entirely on your local machine to audit, secure, and fix vulnerabilities.
        </p>

        {/* Installation Section */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
            1. Install the CLI
          </h2>
          
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: C.text, marginBottom: 12, fontWeight: 500 }}>
              Option A: Install via Curl (Recommended)
            </p>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: C.mono, fontSize: 13
            }}>
              <div>
                <span style={{ color: C.green }}>$ </span>
                <span>curl -fsSL https://unideploy.in/install.sh | bash</span>
              </div>
              <button
                onClick={handleCopyInstall}
                style={{
                  color: C.muted, border: `1px solid ${C.border}`, background: "transparent",
                  padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: C.mono,
                  transition: "all 0.2s"
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 14, color: C.text, marginBottom: 12, fontWeight: 500 }}>
              Option B: Download macOS DMG installer
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <a
                href="https://github.com/rahulpandey535/unideploy/releases/latest/download/UniDeploy-arm64.dmg"
                style={{
                  background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                  padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontSize: 13,
                  fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8
                }}
              >
                Download DMG (Apple Silicon)
              </a>
              <a
                href="https://github.com/rahulpandey535/unideploy/releases/latest/download/UniDeploy-x64.dmg"
                style={{
                  background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                  padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontSize: 13,
                  fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8
                }}
              >
                Download DMG (Intel)
              </a>
            </div>
          </div>
        </section>

        {/* Authentication Section */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
            2. Authenticate the CLI
          </h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
            Run the authentication command to link your terminal session with your UniDeploy dashboard. This allows the CLI to post findings securely.
          </p>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "16px 20px", fontFamily: C.mono, fontSize: 13, marginBottom: 16
          }}>
            <span style={{ color: C.green }}>$ </span>
            <span>unideploy auth</span>
          </div>
          <p style={{ fontSize: 13, color: C.muted }}>
            This will open your browser and prompt you to log in. Your credentials and tokens are stored locally at <code style={{ fontFamily: C.mono, color: C.text }}>~/.unideploy/auth.json</code>.
          </p>
        </section>

        {/* Command Reference Section */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
            Command Reference
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "12px 8px", fontWeight: 600, color: C.text }}>Command</th>
                  <th style={{ padding: "12px 8px", fontWeight: 600, color: C.text }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((cmd, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 8px", fontFamily: C.mono, color: C.green, whiteSpace: "nowrap" }}>
                      {cmd.cmd}
                    </td>
                    <td style={{ padding: "12px 8px", color: C.muted, lineHeight: 1.5 }}>
                      {cmd.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 30, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
          <span>&copy; {new Date().getFullYear()} UniDeploy. All rights reserved.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/terms" style={{ color: C.muted, textDecoration: "none" }}>Terms</Link>
            <Link href="/privacy" style={{ color: C.muted, textDecoration: "none" }}>Privacy</Link>
            <Link href="/security" style={{ color: C.muted, textDecoration: "none" }}>Security</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
