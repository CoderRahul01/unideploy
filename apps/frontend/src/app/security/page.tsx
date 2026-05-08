import type { Metadata } from "next";
import { Shield, Lock, Eye, AlertTriangle, Server } from "lucide-react";

export const metadata: Metadata = {
  title: "Security — UniDeploy",
};

const section: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-display), Sora, sans-serif",
  fontSize: 18,
  fontWeight: 600,
  color: "#e8f0d8",
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
};
const p: React.CSSProperties = {
  fontSize: 14,
  color: "#6a7a5a",
  lineHeight: 1.8,
  marginBottom: 12,
};

const ICONS = [Shield, Lock, Eye, AlertTriangle, Server];

const SECTIONS = [
  {
    title: "How scans work",
    body: [
      "When you submit a repository, the code is fetched and processed inside an isolated, ephemeral sandbox. Each sandbox is a separate environment with no access to the internet, no access to other users' data, and no persistence beyond the current session.",
      "At the end of every scan — whether it completes successfully or fails — the sandbox is destroyed. Your source code never touches our production infrastructure and is never written to any persistent storage.",
    ],
  },
  {
    title: "Data handling",
    body: [
      "Scan results (findings, severity levels, remediation plans) are stored encrypted at rest. We use industry-standard encryption for data in transit and at rest.",
      "Source code is never persisted. The only artefact of a scan that we store is the structured findings report — the list of issues found, their locations, and suggested remediations. The actual file contents are never retained.",
    ],
  },
  {
    title: "What we never do",
    body: [
      "We never execute your code outside of the isolated sandbox environment. We never access your production environment, your secrets manager, your database, or any infrastructure connected to your repository.",
      "We never share your scan results with third parties, and we never use your findings data to train external models.",
    ],
  },
  {
    title: "What we scan for",
    body: [
      "UniDeploy checks for issues in the OWASP Top 10, including broken access control, cryptographic failures, injection vulnerabilities, and security misconfiguration. It also checks specifically for secrets exposure (hardcoded API keys, service role credentials), authentication logic errors, database access policy misconfigurations, and missing security headers.",
      "Our detection rules are deterministic — each finding is based on a specific pattern in your code, not a probabilistic model. This means low false-positive rates and reproducible results.",
    ],
  },
  {
    title: "Responsible disclosure",
    body: [
      "If you discover a security vulnerability in UniDeploy itself — not in a scanned repository, but in our own product — please report it to us. We aim to respond within 48 hours and to remediate confirmed issues within 7 days.",
      "Contact us via: cal.com/rahulpandey187/unideploy-demo. Please include a description of the vulnerability, steps to reproduce it, and your assessment of the potential impact. We do not currently offer a bug bounty, but we will credit you in our changelog if you consent.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f1410",
        padding: "64px 24px",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            fontSize: 11,
            color: "#1D9E75",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Trust &amp; Safety
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display), Sora, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#e8f0d8",
            lineHeight: 1.25,
            marginBottom: 8,
          }}
        >
          Security
        </h1>
        <time
          dateTime="2026-05"
          style={{ fontSize: 12, color: "#3a4a2a", display: "block", marginBottom: 48 }}
        >
          Last updated: May 2026
        </time>

        {SECTIONS.map((s, i) => {
          const Icon = ICONS[i] ?? Shield;
          return (
            <div key={s.title} style={section}>
              <h2 style={h2Style}>
                <Icon size={16} strokeWidth={1.5} style={{ color: "#1D9E75", flexShrink: 0 }} />
                {s.title}
              </h2>
              {s.body.map((text, j) => (
                <p key={j} style={p}>
                  {text.includes("cal.com") ? (
                    <>
                      Contact us via:{" "}
                      <a
                        href="https://cal.com/rahulpandey187/unideploy-demo"
                        style={{ color: "#1D9E75", textDecoration: "none" }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        cal.com/rahulpandey187/unideploy-demo
                      </a>
                      . {text.split(". ").slice(1).join(". ")}
                    </>
                  ) : (
                    text
                  )}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
