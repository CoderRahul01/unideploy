import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — UniDeploy",
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

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <time
          dateTime="2026-05"
          style={{ fontSize: 12, color: "#3a4a2a", display: "block", marginBottom: 48 }}
        >
          Last updated: May 2026
        </time>

        <div style={section}>
          <h2 style={h2Style}>What we collect</h2>
          <p style={p}>
            When you create an account, we collect your email address. When you
            use UniDeploy to scan a repository, we collect the GitHub repository
            URL you submit and the scan results (findings, severity levels, and
            remediation suggestions) generated from that scan.
          </p>
          <p style={p}>
            We do not collect passwords — authentication is handled by a
            third-party identity provider using industry-standard OAuth flows.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>What we do not collect</h2>
          <p style={p}>
            Your source code is never stored. When you submit a repository for
            scanning, the code is fetched and processed inside an isolated,
            ephemeral sandbox that is destroyed at the end of the session.
            Nothing from your repository persists on our infrastructure after
            the scan completes.
          </p>
          <p style={p}>
            We do not collect payment card details. Payment processing is
            handled entirely by a third-party processor — we receive only a
            transaction reference, never your card number or billing details.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>How we use your data</h2>
          <p style={p}>
            We use your email address to send you account-related communications
            (scan reports, billing receipts, service updates). We use scan
            results to display findings in your dashboard and, if you are on a
            paid plan, to generate auto-fix pull requests on your behalf.
          </p>
          <p style={p}>
            We use aggregated, anonymised scan data to improve our detection
            rules and agent accuracy. No data used for this purpose can be
            traced back to you or your repository.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Third-party services</h2>
          <p style={p}>
            UniDeploy relies on third-party infrastructure providers to deliver
            the service — including cloud hosting, AI inference, and identity
            management. These providers process data only to the extent
            necessary to perform their services, under data processing agreements
            that bind them to strict confidentiality and security obligations.
          </p>
          <p style={p}>
            We do not sell, rent, or share your personal data with any third
            party for advertising or marketing purposes.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Your rights</h2>
          <p style={p}>
            You can delete your account and all associated data at any time by
            contacting us. On deletion, we remove your email address, scan
            history, and all linked data from our systems within 30 days.
          </p>
          <p style={p}>
            You also have the right to request a copy of the data we hold about
            you. To exercise either right, reach us at{" "}
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
          <h2 style={h2Style}>Cookies</h2>
          <p style={p}>
            We use session cookies to keep you logged in. We may also use
            analytics cookies to understand how the product is used — these are
            anonymised and do not track individuals across other websites.
          </p>
          <p style={p}>
            You can opt out of analytics cookies at any time by contacting us.
            Disabling session cookies will require you to log in on every visit.
          </p>
        </div>

        <div style={section}>
          <h2 style={h2Style}>Changes to this policy</h2>
          <p style={p}>
            If we make material changes to this policy, we will notify you by
            email at least 14 days before the changes take effect. Continued use
            of the service after that date constitutes acceptance of the updated
            policy.
          </p>
        </div>
      </div>
    </main>
  );
}
