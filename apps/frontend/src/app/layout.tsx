import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniDeploy — From idea to deployed product",
  description: "Describe what you want to build. Our AI writes the code, runs it in a real sandbox, and ships it to production — in minutes.",
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased dark">
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
