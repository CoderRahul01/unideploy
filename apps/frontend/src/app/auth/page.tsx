"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginUser, registerUser, verifySession } from "@/lib/api";

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={styles.page}>
        <div style={{ fontSize: 16, color: "#6A7A5A" }}>Loading...</div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}

type Step = "login" | "verify" | "done" | "error";

function AuthPageContent() {
  const searchParams  = useSearchParams();
  const rawCode       = searchParams.get("code") ?? "";
  const sessionCode   = rawCode.replace(/-/g, "").toUpperCase();
  const displayCode   = sessionCode.length === 6
    ? `${sessionCode.slice(0, 3)}-${sessionCode.slice(3)}`
    : rawCode;

  const [step, setStep]       = useState<Step>("login");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading]   = useState(false);

  // If already logged in, skip to verify
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("unideploy_token")) {
      setStep("verify");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(email, password);
      }
      setStep("verify");
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!sessionCode) {
      setErrorMsg("No session code in URL. Go back to your terminal.");
      setStep("error");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await verifySession(sessionCode);
      setStep("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={styles.logo}>UniDeploy</div>
          <p style={{ color: "#6A7A5A", fontSize: 13, marginTop: 4 }}>
            CLI Authentication
          </p>
        </div>

        {/* Session code display */}
        {displayCode && (
          <div style={styles.codeBox}>
            <span style={{ fontSize: 11, color: "#6A7A5A", display: "block", marginBottom: 6 }}>
              SESSION CODE
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 700, letterSpacing: 6, color: "#4ADE80" }}>
              {displayCode}
            </span>
          </div>
        )}

        {/* Step: login */}
        {step === "login" && (
          <>
            <p style={{ color: "#a8b89a", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
              {isLogin ? "Sign in to link your CLI session" : "Create an account to get started"}
            </p>

            {errorMsg && <div style={styles.error}>{errorMsg}</div>}

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} style={{ ...styles.btn, marginTop: 6 }}>
                {loading ? "Please wait…" : (isLogin ? "Sign In" : "Sign Up")}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#6A7A5A" }}>
              {isLogin ? "No account?" : "Have an account?"}{" "}
              <button
                onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }}
                style={styles.link}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </>
        )}

        {/* Step: verify */}
        {step === "verify" && (
          <>
            <p style={{ color: "#a8b89a", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
              You&apos;re signed in. Click below to link your terminal session.
            </p>

            {errorMsg && <div style={styles.error}>{errorMsg}</div>}

            <button onClick={handleVerify} disabled={loading} style={styles.btn}>
              {loading ? "Connecting…" : "Connect CLI Session"}
            </button>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#6A7A5A" }}>
              Wrong account?{" "}
              <button
                onClick={() => {
                  localStorage.removeItem("unideploy_token");
                  setStep("login");
                  setErrorMsg("");
                }}
                style={styles.link}
              >
                Sign in with another account
              </button>
            </div>
          </>
        )}

        {/* Step: done */}
        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ color: "#4ADE80", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
              CLI Connected!
            </h2>
            <p style={{ color: "#a8b89a", fontSize: 13 }}>
              Go back to your terminal — UniDeploy is ready.
            </p>
          </div>
        )}

        {/* Step: error */}
        {step === "error" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
            <p style={{ color: "#FF6B6B", fontSize: 14 }}>{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0F1410",
    color: "#E8F0D8",
    fontFamily: "DM Sans, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  } as React.CSSProperties,
  card: {
    maxWidth: 420,
    width: "100%",
    background: "#161D16",
    padding: 36,
    borderRadius: 14,
    border: "1px solid #2A3A2A",
  } as React.CSSProperties,
  logo: {
    fontFamily: "Sora, sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#E8F0D8",
    letterSpacing: -0.5,
  } as React.CSSProperties,
  codeBox: {
    background: "#0F1410",
    border: "1px solid #2A3A2A",
    borderRadius: 10,
    padding: "14px 20px",
    textAlign: "center" as const,
    marginBottom: 24,
  } as React.CSSProperties,
  label: {
    display: "block",
    fontSize: 11,
    color: "#a8b89a",
    marginBottom: 5,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "10px 14px",
    background: "#0F1410",
    border: "1px solid #2A3A2A",
    borderRadius: 8,
    color: "#E8F0D8",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  btn: {
    width: "100%",
    padding: "12px",
    background: "#1D9E75",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  } as React.CSSProperties,
  error: {
    background: "#3A1A1A",
    border: "1px solid #5A2A2A",
    color: "#FF6B6B",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  } as React.CSSProperties,
  link: {
    background: "none",
    border: "none",
    color: "#1D9E75",
    cursor: "pointer",
    fontWeight: 500,
    padding: 0,
    fontSize: "inherit",
  } as React.CSSProperties,
};
