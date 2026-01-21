import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniDeploy | One-Click Automated Deployment",
  description: "Deploy your apps instantly with UniDeploy.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased dark`}>
        {children}
        <div className="fixed bottom-4 right-4 z-50 opacity-80 hover:opacity-100 transition-opacity">
          <a href="https://e2b.dev" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/e2b-logo.png" alt="Powered by E2B" className="h-8 w-auto" />
          </a>
        </div>
      </body>
    </html>
  );
}
