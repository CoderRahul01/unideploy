"use client";
import { useState } from "react";
import { Check, Zap } from "lucide-react";
import posthog from "posthog-js";

type Tier = {
  name: string;
  monthly: number | null;
  annual: number | null;
  annualTotal: number | null;
  description: string;
  cta: string;
  ctaHref?: string;
  highlight?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    annualTotal: null,
    description: "Unlimited scans, zero commitment. The only free scanner that actually finds what matters.",
    cta: "Start free",
    features: [
      "Unlimited scans",
      "Full OWASP findings report",
      "Secrets detection",
      "1 project",
      "CLI access",
    ],
  },
  {
    name: "Builder",
    monthly: 15,
    annual: 12,
    annualTotal: 144,
    description: "For developers shipping to production. Auto-fixes critical issues before they become incidents.",
    cta: "Get started",
    features: [
      "Everything in Free",
      "Auto-fix PRs for critical issues",
      "RLS policy correctness (not just presence)",
      "Deploy configuration guidance",
      "4 projects in dashboard",
    ],
  },
  {
    name: "Pro",
    monthly: 49,
    annual: 39,
    annualTotal: 468,
    description: "For teams that can't afford a security incident. Unlimited fixes, agent memory, priority queue.",
    cta: "Get started",
    highlight: true,
    features: [
      "Everything in Builder",
      "Unlimited auto-fix PRs",
      "Agent memory across scans",
      "Unlimited projects",
      "Priority agent queue",
      "Cloud Run deploy config included",
    ],
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    annualTotal: null,
    description: "For regulated industries and teams with compliance requirements. Custom everything.",
    cta: "Talk to us",
    ctaHref: "https://cal.com/rahulpandey187/unideploy-demo",
    features: [
      "Everything in Pro",
      "SOC 2 / HIPAA compliance track",
      "Dedicated sandbox environment",
      "Custom rule packs",
      "SBOM + GDPR audit trail",
      "SLA + Slack/Teams alerts",
    ],
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f1410",
        padding: "64px 24px",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              fontSize: 11,
              color: "#1D9E75",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Pricing
          </span>
          <h1
            style={{
              fontFamily: "var(--font-display), Sora, sans-serif",
              fontSize: 36,
              fontWeight: 700,
              color: "#e8f0d8",
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            Start free. Pay when it matters.
          </h1>
          <p style={{ fontSize: 15, color: "#6a7a5a", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 28px" }}>
            The free tier runs unlimited scans and surfaces real findings.
            Upgrade when you&apos;re ready to fix them automatically.
          </p>

          {/* Toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: annual ? "#4a5a3a" : "#a8b89a" }}>Monthly</span>
            <button
              onClick={() => {
                const next = !annual;
                setAnnual(next);
                posthog.capture("pricing_billing_toggle_changed", { billing_period: next ? "annual" : "monthly" });
              }}
              aria-label="Toggle billing period"
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                background: annual ? "#1D9E75" : "#2a3a2a",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: annual ? 22 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </button>
            <span style={{ fontSize: 13, color: annual ? "#a8b89a" : "#4a5a3a" }}>Annual</span>
            {annual && (
              <span
                style={{
                  background: "rgba(29,158,117,0.15)",
                  color: "#1D9E75",
                  border: "0.5px solid rgba(29,158,117,0.3)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                Save 20%
              </span>
            )}
          </div>
        </div>

        {/* Tier cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16,
          }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                background: tier.highlight ? "#0d1a0e" : "#161d16",
                border: `0.5px solid ${tier.highlight ? "rgba(29,158,117,0.35)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 12,
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                position: "relative",
              }}
            >
              {tier.highlight && (
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#0f1410",
                    border: "0.5px solid rgba(29,158,117,0.4)",
                    color: "#1D9E75",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "3px 12px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  Most popular
                </span>
              )}

              {/* Name + price */}
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#6a7a5a",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                    fontFamily: "var(--font-mono), JetBrains Mono, monospace",
                  }}
                >
                  {tier.name}
                </p>
                {tier.monthly !== null ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 700,
                        color: "#e8f0d8",
                        fontFamily: "var(--font-display), Sora, sans-serif",
                        lineHeight: 1,
                      }}
                    >
                      ${annual && tier.annual !== null ? tier.annual : tier.monthly}
                    </span>
                    <span style={{ fontSize: 13, color: "#4a5a3a" }}>/mo</span>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#e8f0d8",
                      fontFamily: "var(--font-display), Sora, sans-serif",
                    }}
                  >
                    Custom
                  </span>
                )}
                {annual && tier.annualTotal && (
                  <p style={{ fontSize: 11, color: "#3a4a2a", marginTop: 4 }}>
                    billed ${tier.annualTotal}/yr
                  </p>
                )}
              </div>

              <p style={{ fontSize: 13, color: "#5a6a4a", lineHeight: 1.6 }}>
                {tier.description}
              </p>

              {/* CTA */}
              {tier.ctaHref ? (
                <a
                  href={tier.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => posthog.capture("pricing_cta_clicked", { tier: tier.name, billing_period: annual ? "annual" : "monthly" })}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 7,
                    border: "0.5px solid rgba(29,158,117,0.4)",
                    color: "#1D9E75",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                    background: "transparent",
                  }}
                >
                  {tier.cta}
                </a>
              ) : tier.monthly === 0 ? (
                <a
                  href="https://unideploy.vercel.app"
                  onClick={() => posthog.capture("pricing_cta_clicked", { tier: tier.name, billing_period: "free" })}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 7,
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    color: "#6a7a5a",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  {tier.cta}
                </a>
              ) : (
                <button
                  onClick={() => posthog.capture("pricing_cta_clicked", { tier: tier.name, billing_period: annual ? "annual" : "monthly" })}
                  style={{
                    background: tier.highlight ? "#1D9E75" : "transparent",
                    color: tier.highlight ? "#fff" : "#1D9E75",
                    border: "0.5px solid rgba(29,158,117,0.5)",
                    borderRadius: 7,
                    padding: "10px 0",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    width: "100%",
                  }}
                >
                  {tier.highlight && <Zap size={13} strokeWidth={2} />}
                  {tier.cta}
                </button>
              )}

              {/* Features */}
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Check size={13} strokeWidth={2.5} style={{ color: "#1D9E75", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: "#5a6a4a", lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p
          style={{
            textAlign: "center",
            marginTop: 40,
            fontSize: 12,
            color: "#3a4a2a",
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
          }}
        >
          All plans include unlimited team members · Cancel anytime · No credit card for Free
        </p>
      </div>
    </main>
  );
}
