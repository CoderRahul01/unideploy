import type { Metadata } from "next";
import { Sora, DM_Sans, JetBrains_Mono } from "next/font/google";
import AnnouncementBar from "@/components/AnnouncementBar";
import FloatingDemoButton from "@/components/FloatingDemoButton";
import CalScript from "@/components/CalScript";
import Footer from "@/components/Footer";
import { PostHogProvider } from "@/providers/PostHogProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "UniDeploy Cloud — Managed Cloud Sandboxes & AI Model Deployment",
  description:
    "Launch isolated cloud microVM sandboxes, run persistent Python data science environments, and deploy AI models with instant API keys.",
  keywords: [
    "cloud sandboxes",
    "Google Colab alternative",
    "AI model deployment",
    "microVM sandboxes",
    "E2B Firecracker",
    "Python data science",
    "serverless AI endpoints",
    "developer marketplace",
  ],
  verification: {
    google: "IdmvhsfXd8y0B4C7toMdLj28KF-4ykVU587BLDKLkJo",
  },
  openGraph: {
    title: "UniDeploy Cloud — Managed Cloud Sandboxes & AI Model Deployment",
    description:
      "Launch isolated cloud microVM sandboxes, run persistent Python data science environments, and deploy AI models with instant API keys.",
    url: "https://unideploy.in",
    siteName: "UniDeploy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
        style={{ background: "var(--bg-primary)" }}
      >
        <GoogleAnalytics />
        <PostHogProvider>
          <AnnouncementBar />
          {children}
          <Footer />
          <FloatingDemoButton />
          <CalScript />
        </PostHogProvider>
      </body>
    </html>
  );
}
