import Link from "next/link";
import { Twitter, Linkedin } from "lucide-react";
import ProgramBadge from "./ProgramBadge";

const PRODUCT_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Book a demo", href: "/demo" },
  { label: "Changelog", href: "/changelog" },
  { label: "Docs", href: "https://docs.unideploy.in" },
];

const RESOURCE_LINKS = [
  { label: "Documentation", href: "https://docs.unideploy.in" },
  { label: "CLI reference", href: "https://docs.unideploy.in/cli/init-command" },
  { label: "Security", href: "/security" },
  { label: "Changelog", href: "/changelog" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Contact", href: "https://cal.com/rahulpandey187/unideploy-demo" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const col: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const heading: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#4a5a3a",
  fontFamily: "var(--font-mono), JetBrains Mono, monospace",
  marginBottom: 4,
};

const linkStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6a7a5a",
  textDecoration: "none",
  fontFamily: "var(--font-body), DM Sans, sans-serif",
  lineHeight: 1.5,
};

export default function Footer() {
  return (
    <footer
      style={{
        background: "#0a0f0a",
        borderTop: "0.5px solid rgba(255,255,255,0.06)",
        padding: "48px 24px 24px",
        marginTop: 80,
      }}
    >
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes brandDot {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.3); }
        }
        .footer-link:hover { color: #c8d8b0 !important; }
      `}</style>

      {/* Four-column grid */}
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 40,
          paddingBottom: 40,
          borderBottom: "0.5px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Brand column */}
        <div style={{ ...col, gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-display), Sora, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#e8f0d8",
              }}
            >
              UniDeploy
            </span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#1D9E75",
                display: "inline-block",
                animation: "brandDot 2.5s ease-in-out infinite",
              }}
            />
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#5a6a4a",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
              lineHeight: 1.6,
              maxWidth: 200,
            }}
          >
            UniDeploy · unideploy.in · Production-readiness for vibe-coded apps.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a
              href="https://x.com/rahulpandey187"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4a5a3a" }}
              aria-label="X (Twitter)"
              title="X (Twitter)"
            >
              <Twitter size={15} strokeWidth={1.5} />
            </a>
            <a
              href="https://www.linkedin.com/in/rahulpandey187/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4a5a3a" }}
              aria-label="Rahul's LinkedIn"
              title="Rahul's LinkedIn"
            >
              <Linkedin size={15} strokeWidth={1.5} />
            </a>
            <a
              href="https://www.linkedin.com/company/unideployai/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4a5a3a" }}
              aria-label="UniDeploy LinkedIn"
              title="UniDeploy LinkedIn"
            >
              <Linkedin size={15} strokeWidth={1.5} />
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <ProgramBadge program="e2b" />
            <ProgramBadge program="devlabs" />
          </div>
        </div>

        {/* Product column */}
        <div style={col}>
          <p style={heading}>Product</p>
          {PRODUCT_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="footer-link" style={linkStyle}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Resources column */}
        <div style={col}>
          <p style={heading}>Resources</p>
          {RESOURCE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="footer-link" style={linkStyle}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Company column */}
        <div style={col}>
          <p style={heading}>Company</p>
          {COMPANY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="footer-link" style={linkStyle}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          paddingTop: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontSize: 12,
              color: "#3a4a2a",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            © 2026 UniDeploy
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                animation: "statusPulse 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "#3a4a2a",
                fontFamily: "var(--font-mono), JetBrains Mono, monospace",
              }}
            >
              All systems operational
            </span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Security", href: "/security" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="footer-link"
              style={{ ...linkStyle, fontSize: 11, color: "#3a4a2a" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
