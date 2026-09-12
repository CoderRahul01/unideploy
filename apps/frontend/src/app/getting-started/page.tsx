"use client";

import Link from "next/link";
import { useState } from "react";
import posthog from "posthog-js";
import { Terminal, Download, Play, Zap, Shield, Cpu, Key, ArrowRight, Check, Copy } from "lucide-react";

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

export default function GettingStartedPage() {
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedNpm, setCopiedNpm] = useState(false);

  const handleCopyCurl = () => {
    navigator.clipboard.writeText("curl -fsSL https://unideploy.in/install.sh | bash");
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    posthog.capture("copy_install_command", { method: "curl" });
  };

  const handleCopyNpm = () => {
    navigator.clipboard.writeText("npm install -g unideploy");
    setCopiedNpm(true);
    setTimeout(() => setCopiedNpm(false), 2000);
    posthog.capture("copy_install_command", { method: "npm" });
  };

  const commands = [
    { cmd: "unideploy auth", desc: "Authenticate your terminal with your unideploy.in account" },
    { cmd: "unideploy run script.py", desc: "Execute any Python script in a fresh, isolated cloud microVM (< 2s boot)" },
    { cmd: "unideploy deploy app.py", desc: "Deploy your script as a live HTTPS endpoint with a secure API key" },
    { cmd: "unideploy sandboxes", desc: "List all active, running, or persistent cloud microVM sessions" },
    { cmd: "unideploy tokens", desc: "Check remaining compute tokens and your active plan tier" },
    { cmd: "unideploy whoami", desc: "Display current login status and account details" },
    { cmd: "unideploy logout", desc: "Log out and clear stored local credentials" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.font, padding: "56px 24px 100px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        
        {/* Navigation Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 56 }}>
          <Link href="/" style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: C.text, textDecoration: "none" }}>
            unideploy
          </Link>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link href="/sandbox" style={{ fontSize: 13, color: C.greenLight, textDecoration: "none", fontWeight: 600 }}>
              Web Sandbox →
            </Link>
            <Link href="/pricing" style={{ fontSize: 13, color: C.textSecondary, textDecoration: "none" }}>
              Pricing
            </Link>
            <Link href="/download" style={{ fontSize: 13, color: C.textSecondary, textDecoration: "none" }}>
              Download
            </Link>
            <Link href="/dashboard" style={{ fontSize: 13, color: C.textSecondary, textDecoration: "none" }}>
              Dashboard
            </Link>
          </div>
        </div>

        {/* Header Title */}
        <div style={{ marginBottom: 44 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: C.greenLight,
            fontFamily: C.mono,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: "rgba(109, 184, 74, 0.12)",
            padding: "4px 12px",
            borderRadius: 999,
            border: "1px solid rgba(109, 184, 74, 0.25)",
            marginBottom: 16
          }}>
            Quickstart Guide
          </div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(32px, 5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "#FFFFFF", lineHeight: 1.15 }}>
            Getting Started with UniDeploy
          </h1>
          <p style={{ fontSize: 16, color: C.textSecondary, lineHeight: 1.6, maxWidth: 680 }}>
            UniDeploy gives you instant, isolated cloud microVMs in under 2 seconds. Run Python data science notebooks, execute untrusted AI agent code safely, and deploy scripts as live REST APIs with instant API keys.
          </p>
        </div>

        {/* 3 Main Ways to Use */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 52 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(109, 184, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: C.greenLight, marginBottom: 16 }}>
              <Play size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>1. Web Sandbox (Zero Setup)</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>
              Test Python 3.13, NumPy, and Pandas right in your browser. Generates base64 Matplotlib charts instantly.
            </p>
            <Link href="/sandbox" style={{ fontSize: 12, color: C.greenLight, fontFamily: C.mono, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              Open Web Sandbox <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(109, 184, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: C.greenLight, marginBottom: 16 }}>
              <Download size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>2. Native Mac Desktop (.dmg)</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>
              Dock app for macOS Apple Silicon and Intel. Launch persistent microVMs and manage API endpoints in 1 click.
            </p>
            <Link href="/download" style={{ fontSize: 12, color: C.greenLight, fontFamily: C.mono, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              Download macOS App <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(109, 184, 74, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: C.greenLight, marginBottom: 16 }}>
              <Terminal size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>3. Lightweight Terminal CLI</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>
              Run local scripts inside cloud microVMs with <code>unideploy run</code> or deploy via <code>unideploy deploy</code>.
            </p>
            <Link href="#cli-section" style={{ fontSize: 12, color: C.greenLight, fontFamily: C.mono, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              View CLI Commands <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Step 1: Install Section */}
        <section id="cli-section" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <Terminal size={18} color={C.greenLight} />
            <span>1. Install the CLI</span>
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, fontWeight: 600 }}>
                Option A: Install via Curl (macOS &amp; Linux)
              </p>
              <div style={{
                background: C.surfaceInput, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
                fontFamily: C.mono, fontSize: 13
              }}>
                <div>
                  <span style={{ color: C.green }}>$ </span>
                  <span style={{ color: "#DDF4CE" }}>curl -fsSL https://unideploy.in/install.sh | bash</span>
                </div>
                <button
                  onClick={handleCopyCurl}
                  style={{
                    color: copiedCurl ? C.greenBright : C.textMuted, border: `1px solid ${C.border}`, background: C.surfaceCard,
                    padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: C.mono,
                    display: "inline-flex", alignItems: "center", gap: 6
                  }}
                >
                  {copiedCurl ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, fontWeight: 600 }}>
                Option B: Install via npm (All Platforms)
              </p>
              <div style={{
                background: C.surfaceInput, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
                fontFamily: C.mono, fontSize: 13
              }}>
                <div>
                  <span style={{ color: C.green }}>$ </span>
                  <span style={{ color: "#DDF4CE" }}>npm install -g unideploy</span>
                </div>
                <button
                  onClick={handleCopyNpm}
                  style={{
                    color: copiedNpm ? C.greenBright : C.textMuted, border: `1px solid ${C.border}`, background: C.surfaceCard,
                    padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: C.mono,
                    display: "inline-flex", alignItems: "center", gap: 6
                  }}
                >
                  {copiedNpm ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Authentication */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <Key size={18} color={C.greenLight} />
            <span>2. Connect Your Device</span>
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>
            Run the authentication command in your terminal. It generates a 6-digit session code to link your terminal with your UniDeploy account.
          </p>
          <div style={{
            background: C.surfaceInput, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "14px 18px", fontFamily: C.mono, fontSize: 13, marginBottom: 16
          }}>
            <span style={{ color: C.green }}>$ </span>
            <span style={{ color: "#DDF4CE" }}>unideploy auth</span>
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
            Open <Link href="/connect" style={{ color: C.greenLight }}>unideploy.in/connect</Link>, enter your 6-digit code, and your device is authenticated instantly.
          </p>
        </section>

        {/* Step 3: Run Script or Deploy API */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={18} color={C.greenLight} />
            <span>3. Run Scripts &amp; Deploy APIs</span>
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>
            Execute any local script in an isolated Debian microVM or deploy it as a production REST API endpoint:
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: C.surfaceInput, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px", fontFamily: C.mono, fontSize: 13 }}>
              <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}># Execute script in isolated cloud sandbox</div>
              <span style={{ color: C.green }}>$ </span>
              <span style={{ color: "#DDF4CE" }}>unideploy run data_analysis.py</span>
            </div>

            <div style={{ background: C.surfaceInput, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px", fontFamily: C.mono, fontSize: 13 }}>
              <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}># Deploy script as live API with instant API key</div>
              <span style={{ color: C.green }}>$ </span>
              <span style={{ color: "#DDF4CE" }}>unideploy deploy app.py</span>
            </div>
          </div>
        </section>

        {/* Command Reference Section */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <Cpu size={18} color={C.greenLight} />
            <span>Command Reference</span>
          </h2>
          <div style={{ overflowX: "auto", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surfaceCard }}>
                  <th style={{ padding: "14px 18px", fontWeight: 700, color: "#FFFFFF", fontFamily: C.mono, fontSize: 12 }}>Command</th>
                  <th style={{ padding: "14px 18px", fontWeight: 700, color: "#FFFFFF", fontSize: 12 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((cmd, i) => (
                  <tr key={i} style={{ borderBottom: i < commands.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "14px 18px", fontFamily: C.mono, color: C.greenLight, whiteSpace: "nowrap" }}>
                      {cmd.cmd}
                    </td>
                    <td style={{ padding: "14px 18px", color: C.textSecondary, lineHeight: 1.5 }}>
                      {cmd.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 30, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, fontSize: 12, color: C.textMuted }}>
          <span>&copy; {new Date().getFullYear()} UniDeploy (unideploy.in). All rights reserved.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/pricing" style={{ color: C.textMuted, textDecoration: "none" }}>Pricing</Link>
            <Link href="/sandbox" style={{ color: C.textMuted, textDecoration: "none" }}>Web Sandbox</Link>
            <Link href="/terms" style={{ color: C.textMuted, textDecoration: "none" }}>Terms</Link>
            <Link href="/privacy" style={{ color: C.textMuted, textDecoration: "none" }}>Privacy</Link>
          </div>
        </div>

      </div>
    </div>
  );
}

