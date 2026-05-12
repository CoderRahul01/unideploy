// Google Analytics 4 — gtag.js
// Measurement ID is public (appears in page source) so safe to hardcode.
// Can still be overridden via NEXT_PUBLIC_GA_ID env var.
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-4E71KF4DXD";

export default function GoogleAnalytics() {
  return (
    <>
      {/* Load gtag.js after page is interactive — no render blocking */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GA_ID}', {
            // Track all page views across the full site (public + dashboard).
            // /dashboard and /connect are excluded from Google *crawling* via
            // robots.ts, but we DO want to count real user sessions there.
            send_page_view: true,

            // Redact PII from URLs (e.g. strip email query params)
            redact_email: true,

            // Anonymise IPs for GDPR compliance
            anonymize_ip: true,
          });
        `}
      </Script>
    </>
  );
}
