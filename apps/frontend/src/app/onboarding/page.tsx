"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Globe, Server, Zap, Code2 } from "lucide-react";
import { auth } from "@/lib/firebase";

const TEMPLATES = [
  {
    id: "nextjs",
    icon: Globe,
    title: "Next.js App",
    description: "Full-stack React application with API routes and SSR",
  },
  {
    id: "fastapi",
    icon: Server,
    title: "FastAPI Backend",
    description: "Python REST API with automatic docs and validation",
  },
  {
    id: "express",
    icon: Zap,
    title: "Express API",
    description: "Node.js REST API, fast to set up and deploy",
  },
  {
    id: "static",
    icon: Code2,
    title: "Static Site",
    description: "HTML/CSS/JS project — no backend required",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/");
        return;
      }
      if (typeof window !== "undefined" && localStorage.getItem("unideploy_onboarded")) {
        router.push("/dashboard");
        return;
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleCreate = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("unideploy_onboarded", "1");
    }
    const query = selected ? `&template=${selected}` : "";
    router.push(`/dashboard?showCreate=true${query}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00DC82] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <img src="/logo.png" alt="UniDeploy" className="w-12 h-12 object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-black tracking-tight mb-3">Welcome to UniDeploy</h1>
          <p className="text-[#A1A1AA]">
            Pick a template to get started, or create a blank project.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {TEMPLATES.map(({ id, icon: Icon, title, description }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`text-left p-5 rounded-xl border transition-all ${
                selected === id
                  ? "border-[#00DC82] bg-[#00DC82]/5"
                  : "border-[#2A2A2A] bg-[#111111] hover:border-[#3A3A3A]"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon
                  className={`w-5 h-5 ${selected === id ? "text-[#00DC82]" : "text-[#A1A1AA]"}`}
                />
                <span className="font-semibold text-sm text-[#F5F5F5]">{title}</span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">{description}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-[#00DC82] text-[#0A0A0A] font-bold py-3 rounded-xl hover:bg-[#00DC82]/90 transition-all text-sm"
        >
          Create My First Project →
        </button>

        <button
          onClick={() => {
            if (typeof window !== "undefined") localStorage.setItem("unideploy_onboarded", "1");
            router.push("/dashboard");
          }}
          className="w-full text-center mt-4 text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
