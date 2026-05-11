import type { Metadata } from "next";
import { Sora, DM_Sans, JetBrains_Mono } from "next/font/google";
import AnnouncementBar from "@/components/AnnouncementBar";
import FloatingDemoButton from "@/components/FloatingDemoButton";
import CalScript from "@/components/CalScript";
import Footer from "@/components/Footer";
import { PostHogProvider } from "@/providers/PostHogProvider";
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
  title: "UniDeploy — Production-readiness for vibe-coded apps",
  description:
    "Scan, harden, and deploy your AI-generated app in seconds.",
  keywords: [
    "security scanner",
    "vibe coding",
    "production readiness",
    "AI code review",
    "AI-generated apps",
    "RLS checker",
    "Next.js security",
    "secrets detection",
  ],
  verification: {
    google: "IdmvhsfXd8y0B4C7toMdLj28KF-4ykVU587BLDKLkJo",
  },
  openGraph: {
    title: "UniDeploy — Production-readiness for vibe-coded apps",
    description:
      "Scan, harden, and deploy your AI-generated app in seconds.",
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
