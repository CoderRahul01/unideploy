"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser, registerUser } from "@/lib/api";
import posthog from "posthog-js";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0F1410", color: "#E8F0D8", fontFamily: "var(--font-body), sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 16 }}>Loading login...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await loginUser(email, password);
        posthog.capture("user_logged_in");
      } else {
        await registerUser(email, password);
        posthog.capture("user_registered");
      }
      // Redirect back to original route (or pricing/dashboard)
      router.push(redirectTarget);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F1410", color: "#E8F0D8", fontFamily: "var(--font-body), DM Sans, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%", background: "#161D16", padding: 32, borderRadius: 12, border: "1px solid #2A3A2A" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display), Sora, sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            {isLogin ? "Welcome back" : "Create an account"}
          </h1>
          <p style={{ color: "#6A7A5A", fontSize: 14 }}>
            {isLogin ? "Sign in to your unideploy account" : "Start scanning your vibe-coded apps"}
          </p>
        </div>

        {error && (
          <div style={{ background: "#3A1A1A", border: "1px solid #5A2A2A", color: "#FF6B6B", padding: "12px", borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#a8b89a", marginBottom: 6 }}>Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 14px", background: "#0F1410", border: "1px solid #2A3A2A", borderRadius: 8, color: "#E8F0D8", outline: "none", fontSize: 14 }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#a8b89a", marginBottom: 6 }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 14px", background: "#0F1410", border: "1px solid #2A3A2A", borderRadius: 8, color: "#E8F0D8", outline: "none", fontSize: 14 }}
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", marginTop: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#6A7A5A" }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={{ background: "none", border: "none", color: "#1D9E75", cursor: "pointer", fontWeight: 500, padding: 0 }}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
