"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  MessageSquare,
  Terminal,
  Rocket,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { loginWithGithub, auth } from "@/lib/firebase";

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await loginWithGithub();
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Sign-in failed. Please try again.");
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) router.push("/dashboard");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs px-4 py-2.5 rounded-lg flex items-center gap-3 shadow-lg">
          {authError}
          <button onClick={() => setAuthError(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-12 transition-all ${
          scrolled ? "bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2A2A2A]" : "bg-transparent"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="UniDeploy" className="w-7 h-7 object-contain" />
          <span className="font-bold text-sm tracking-tight">UniDeploy</span>
        </div>
        <button
          onClick={handleSignIn}
          className="text-sm text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors px-4 py-1.5 border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A]"
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 md:px-12 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00DC82]/30 bg-[#00DC82]/5 text-[#00DC82] text-xs font-medium mb-8">
          <span>⬡</span>
          <span>Backed by E2B · $20K Infrastructure Credits</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-6 text-[#F5F5F5]">
          From idea to deployed product.
          <br />
          <span className="text-[#00DC82]">No DevOps required.</span>
        </h1>

        <p className="text-[#A1A1AA] text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
          Describe what you want to build. Our AI writes the code, runs it in a real sandbox, and
          ships it to production — in minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            onClick={handleSignIn}
            className="bg-[#00DC82] text-[#0A0A0A] font-bold px-6 py-3 rounded-xl hover:bg-[#00DC82]/90 transition-all text-sm w-full sm:w-auto"
          >
            Start building for free →
          </button>
          <a
            href="#how-it-works"
            className="border border-[#2A2A2A] text-[#A1A1AA] font-medium px-6 py-3 rounded-xl hover:border-[#3A3A3A] hover:text-[#F5F5F5] transition-all text-sm w-full sm:w-auto text-center"
          >
            Watch it work
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#52525B]">
          {["✦ 100 concurrent sandboxes", "✦ Real Linux VMs, not emulation", "✦ Deploys to production, not just localhost"].map(
            (item) => (
              <span key={item}>{item}</span>
            ),
          )}
        </div>

        {/* Hero Visual — CSS-only split panel mockup */}
        <div className="mt-16 rounded-2xl border border-[#2A2A2A] overflow-hidden bg-[#111111] text-left max-w-3xl mx-auto shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2A2A2A] bg-[#0A0A0A]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
              <div className="w-3 h-3 rounded-full bg-[#00DC82]/60" />
            </div>
            <span className="text-[10px] text-[#52525B] ml-2">unideploy — project workspace</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#2A2A2A]">
            {/* Chat panel */}
            <div className="p-4 space-y-3 font-mono text-xs">
              <div className="flex gap-2">
                <span className="text-[#52525B]">you</span>
                <span className="text-[#A1A1AA]">Build me a REST API with FastAPI</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#00DC82]">ai</span>
                <span className="text-[#F5F5F5]">Creating project structure...</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#00DC82]">ai</span>
                <span className="text-[#F5F5F5]">Writing main.py with CRUD endpoints</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#00DC82]">ai</span>
                <span className="text-[#F5F5F5]">Installing dependencies...</span>
              </div>
            </div>
            {/* Terminal panel */}
            <div className="p-4 space-y-1 font-mono text-xs bg-[#0A0A0A]">
              <div className="text-[#00DC82]">[00:01] Installing fastapi...</div>
              <div className="text-[#00DC82]">[00:08] Running tests...</div>
              <div className="text-[#00DC82]">[00:15] All 3 tests passed</div>
              <div className="text-[#00DC82]">[00:20] Building Docker image...</div>
              <div className="text-[#00DC82]">[01:05] Deploying to sandbox...</div>
              <div className="text-[#00DC82] font-bold">[01:23] ✓ Live at api.e2b.dev</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-center mb-4">
          How it works
        </h2>
        <p className="text-[#A1A1AA] text-center mb-14 max-w-xl mx-auto">
          Three steps from idea to production. No YAML. No Kubernetes. No expertise required.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MessageSquare,
              num: "01",
              title: "Describe",
              desc: "Tell the AI what you want to build in plain English. It understands requirements, tech stacks, and constraints.",
            },
            {
              icon: Terminal,
              num: "02",
              title: "Build & Run",
              desc: "The AI writes code, installs dependencies, runs tests, and iterates — all inside a real E2B sandbox environment.",
            },
            {
              icon: Rocket,
              num: "03",
              title: "Deploy",
              desc: "One click and your project is live with a real domain, TLS, and auto-scaling. No infrastructure knowledge needed.",
            },
          ].map(({ icon: Icon, num, title, desc }) => (
            <div
              key={num}
              className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#3A3A3A] transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="text-xs font-black text-[#0A0A0A] bg-[#00DC82] px-2 py-1 rounded-md">
                  {num}
                </span>
                <Icon className="w-5 h-5 text-[#00DC82] mt-0.5" />
              </div>
              <h3 className="font-bold text-[#F5F5F5] mb-2">{title}</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sandbox Specs */}
      <section className="py-24 px-6 md:px-12 bg-[#111111] border-y border-[#2A2A2A]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
              Real infrastructure.
            </h2>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6 text-[#00DC82]">
              Not a toy.
            </h2>
            <ul className="space-y-3">
              {[
                ["Real Linux VMs", "Firecracker microVMs, not Docker-in-browser emulation"],
                ["Full terminal access", "PTY with ANSI colour support, persistent sessions"],
                ["20 GB disk per sandbox", "Full filesystem, read/write, file watching"],
                ["8 vCPU / 8 GB RAM", "Enough to run real workloads, ML inference, databases"],
                ["24-hour sessions", "Your sandbox persists while you work"],
                ["Git integration", "Clone, push, pull to GitHub directly from the sandbox"],
              ].map(([title, desc]) => (
                <li key={title} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#00DC82] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[#F5F5F5] font-medium">{title}</span>
                    <span className="text-[#52525B]"> — {desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 font-mono text-xs">
            <p className="text-[#52525B] text-[10px] uppercase tracking-widest mb-4">Sandbox Profile</p>
            <div className="border-b border-[#2A2A2A] mb-4" />
            <div className="space-y-2.5">
              {[
                ["Runtime", "Linux (Ubuntu 22.04)"],
                ["CPU", "8 vCPU (Firecracker)"],
                ["Memory", "8 GB RAM"],
                ["Disk", "20 GB NVMe"],
                ["Session", "24h with pause/resume"],
                ["Network", "Full egress + MCP tools"],
              ].map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-[#52525B]">{key}</span>
                  <span className="text-[#A1A1AA]">{val}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-[#2A2A2A] mt-2">
                <span className="text-[#52525B]">Status</span>
                <span className="text-[#00DC82] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00DC82] inline-block animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-center mb-4">
          UniDeploy vs. the alternatives
        </h2>
        <p className="text-[#A1A1AA] text-center mb-14 text-sm max-w-xl mx-auto">
          Other tools stop at prototype. UniDeploy goes all the way to production.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium w-[40%]">Feature</th>
                <th className="py-3 px-4 text-center bg-[#00DC82]/5 text-[#00DC82] font-bold">
                  UniDeploy
                </th>
                <th className="py-3 px-4 text-center text-[#A1A1AA] font-medium">Replit</th>
                <th className="py-3 px-4 text-center text-[#A1A1AA] font-medium">Bolt.new</th>
                <th className="py-3 px-4 text-center text-[#A1A1AA] font-medium">Lovable</th>
              </tr>
            </thead>
            <tbody>
              {[
                // [feature, uni, replit, bolt, lovable]  — true=✓ false=✗ null=~
                ["Deploys to production", true, null, false, false],
                ["Real VM sandbox", true, false, false, false],
                ["AI fixes its own errors", true, false, false, false],
                ["Git integration", true, true, false, false],
                ["Transparent pricing", true, false, null, null],
                ["No credit burn surprises", true, false, false, false],
              ].map(([feature, uni, replit, bolt, lovable]) => (
                <tr key={feature as string} className="border-b border-[#2A2A2A]">
                  <td className="py-3 px-4 text-[#A1A1AA]">{feature as string}</td>
                  {[uni, replit, bolt, lovable].map((val, i) => (
                    <td
                      key={i}
                      className={`py-3 px-4 text-center ${i === 0 ? "bg-[#00DC82]/5" : ""}`}
                    >
                      {val === true ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00DC82] mx-auto" />
                      ) : val === null ? (
                        <MinusCircle className="w-4 h-4 text-[#F59E0B] mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#EF4444]/60 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 md:px-12 bg-[#111111] border-y border-[#2A2A2A]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-center mb-4">
            Simple pricing
          </h2>
          <p className="text-[#A1A1AA] text-center mb-14 max-w-xl mx-auto">
            Start for free, scale when you're ready.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "$0",
                period: "/month",
                features: [
                  "10 sandbox hours / month",
                  "1 concurrent sandbox",
                  "3 deployments / month",
                  "Community support",
                ],
                cta: "Get started free",
                highlighted: false,
              },
              {
                name: "Pro",
                price: "$29",
                period: "/month",
                features: [
                  "100 sandbox hours / month",
                  "5 concurrent sandboxes",
                  "Unlimited deployments",
                  "Custom domains",
                  "Priority support",
                ],
                cta: "Start Pro trial",
                highlighted: true,
              },
              {
                name: "Team",
                price: "$99",
                period: "/month",
                features: [
                  "500 sandbox hours / month",
                  "20 concurrent sandboxes",
                  "Unlimited everything",
                  "Team collaboration",
                  "Audit logs",
                ],
                cta: "Talk to us",
                highlighted: false,
              },
            ].map(({ name, price, period, features, cta, highlighted }) => (
              <div
                key={name}
                className={`rounded-xl p-6 flex flex-col ${
                  highlighted
                    ? "bg-[#0A0A0A] border-2 border-[#00DC82] shadow-[0_0_40px_-12px_#00DC82]"
                    : "bg-[#0A0A0A] border border-[#2A2A2A]"
                }`}
              >
                {highlighted && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00DC82] mb-3">
                    Most popular
                  </span>
                )}
                <h3 className="font-bold text-lg mb-1 text-[#F5F5F5]">{name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-[#F5F5F5]">{price}</span>
                  <span className="text-[#A1A1AA] text-sm">{period}</span>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#A1A1AA]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00DC82] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleSignIn}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    highlighted
                      ? "bg-[#00DC82] text-[#0A0A0A] hover:bg-[#00DC82]/90"
                      : "border border-[#2A2A2A] text-[#A1A1AA] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] border-t border-[#2A2A2A] py-8 px-6 md:px-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="UniDeploy" className="w-6 h-6 object-contain" />
            <span className="font-bold text-sm text-[#F5F5F5]">UniDeploy</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#52525B]">
            <a href="/docs" className="hover:text-[#A1A1AA] transition-colors">Docs</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#A1A1AA] transition-colors">GitHub</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-[#A1A1AA] transition-colors">Twitter / X</a>
            <a href="https://discord.gg" target="_blank" rel="noreferrer" className="hover:text-[#A1A1AA] transition-colors">Discord</a>
          </div>
          <p className="text-xs text-[#52525B]">Built with ❤️ by Rahul Pandey</p>
        </div>
      </footer>
    </div>
  );
}
