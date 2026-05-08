import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — UniDeploy",
};

const section: React.CSSProperties = { marginBottom: 36 };
const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-display), Sora, sans-serif",
  fontSize: 18,
  fontWeight: 600,
  color: "#e8f0d8",
  marginBottom: 12,
};
const p: React.CSSProperties = {
  fontSize: 14,
  color: "#6a7a5a",
  lineHeight: 1.8,
  marginBottom: 12,
};

export default function TermsPage() {
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
          Legal
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
          Terms of Service
        </h1>
        <time
          dateTime="2026-05"
          style={{ fontSize: 12, color: "#3a4a2a", display: "block", marginBottom: 48 }}
        >
          Last updated: May 2026
        </time>

        <div style={section}>
          <h2 style={h2Style}>What UniDeploy is</h2>
          <p style={p}>
            UniDeploy is a security scanning and automated remediation tool for
            codebases. It analyses your repository for common vulnerabilities and
            misconfigurations, generates detailed findings reports, and — on paid
            plans — can automatically create pull requests with suggested fixes.
          </p>
          <p style={p}>
            UniDeploy is a tool to help you improve your security posture. It is
            not a guarantee of security. No automated scanner catches every
            vulnerability, and the absence of findings in a UniDeploy report does
            not mean your application is free of security issues.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Acceptable use</h2>
          <p style={p}>
            You may only submit repositories that you own or have explicit
            written permission to scan. Scanning repositories without
            authorisation is prohibited and may constitute a violation of
            applicable law.
          </p>
          <p style={p}>
            You may not use UniDeploy to attempt to gain unauthorised access to
            any system, to conduct denial-of-service attacks, or to generate
            findings reports for the purpose of exploiting the vulnerabilities
            you discover.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Liability</h2>
          <p style={p}>
            UniDeploy provides findings and remediation recommendations. The
            decision to implement any recommendation is entirely yours. We are
            not liable for any loss, damage, or security incident that arises
            from your use or non-use of our recommendations.
          </p>
          <p style={p}>
            To the maximum extent permitted by applicable law, UniDeploy&apos;s
            total liability to you for any claim arising out of or related to
            these terms or your use of the service shall not exceed the amount
            you paid to UniDeploy in the 12 months preceding the claim.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Payments and refunds</h2>
          <p style={p}>
            Payments are processed by a third-party payment processor. By
            subscribing, you authorise recurring charges at the rate and
            frequency you selected at checkout. Prices are shown in USD and
            exclude any applicable taxes, which are your responsibility.
          </p>
          <p style={p}>
            If you have not run any scans on a paid plan, you may request a full
            refund within 7 days of your first payment. After that period, or
            after your first scan is completed, refunds are at our discretion.
            To request a refund, contact us at{" "}
            <a
              href="https://cal.com/rahulpandey187/unideploy-demo"
              style={{ color: "#1D9E75", textDecoration: "none" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              cal.com/rahulpandey187/unideploy-demo
            </a>
            .
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Termination</h2>
          <p style={p}>
            You may cancel your subscription at any time from your account
            settings. Cancellation takes effect at the end of your current
            billing period.
          </p>
          <p style={p}>
            We reserve the right to suspend or terminate your account without
            notice if you violate these terms, particularly the acceptable use
            provisions. In such cases, no refund will be issued.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Changes to these terms</h2>
          <p style={p}>
            We may update these terms from time to time. Material changes will
            be communicated by email at least 14 days before they take effect.
            Continued use of the service after that date constitutes your
            acceptance of the revised terms.
          </p>
        </div>
      </div>
    </main>
  );
}
