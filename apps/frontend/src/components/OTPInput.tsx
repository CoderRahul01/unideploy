"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface OTPInputProps {
  onComplete: (code: string) => void;
  error?: boolean;
  loading?: boolean;
  onShakeComplete?: () => void;
}

export default function OTPInput({
  onComplete,
  error = false,
  loading = false,
  onShakeComplete,
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(6).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Reset shake class after animation completes so it can replay
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        onShakeComplete?.();
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [error, onShakeComplete]);

  const handleChange = useCallback(
    (index: number, char: string) => {
      // Allow only digits — codes are always 6-digit numeric
      const sanitized = char.replace(/[^0-9]/g, "");
      if (!sanitized) return;

      const next = [...values];
      next[index] = sanitized[0];
      setValues(next);

      // Advance to next
      if (index < 5) {
        inputsRef.current[index + 1]?.focus();
      }

      // Check if all filled
      const joined = next.join("");
      if (joined.length === 6 && next.every((v) => v !== "")) {
        onComplete(joined);
      }
    },
    [values, onComplete]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const next = [...values];
        if (values[index]) {
          // Clear current
          next[index] = "";
          setValues(next);
        } else if (index > 0) {
          // Retreat to previous
          next[index - 1] = "";
          setValues(next);
          inputsRef.current[index - 1]?.focus();
        }
      }
      if (e.key === "ArrowLeft" && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
      if (e.key === "ArrowRight" && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [values]
  );

  // Handle both "483291" and "483-291" paste formats
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/[-\s]/g, "")
        .replace(/[^0-9]/g, "")
        .slice(0, 6);

      if (pasted.length === 6) {
        const next = pasted.split("");
        setValues(next);
        inputsRef.current[5]?.focus();
        onComplete(pasted);
      }
    },
    [onComplete]
  );

  const firstEmpty = values.findIndex((v) => v === "");

  const boxStyle = (index: number): React.CSSProperties => ({
    width: 72,
    height: 84,
    border: `2px solid ${
      loading
        ? "var(--accent-green)"
        : values[index]
          ? "var(--border-focus)"
          : index === firstEmpty
            ? "var(--border-focus)"
            : "var(--border)"
    }`,
    borderRadius: 12,
    background: "#FFFFFF",
    fontFamily: "var(--font-mono), JetBrains Mono, monospace",
    fontSize: 32,
    fontWeight: 600,
    textAlign: "center" as const,
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease",
    boxShadow:
      !loading && index === firstEmpty
        ? "0 0 0 3px rgba(92,122,62,0.15)"
        : "none",
    caretColor: "transparent",
  });

  return (
    <div
      className={error ? "shake" : ""}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: loading ? 0.7 : 1,
        transition: "opacity 0.2s ease",
      }}
      onPaste={handlePaste}
    >
      {values.map((val, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            style={boxStyle(i)}
            autoComplete="off"
            aria-label={`Code digit ${i + 1}`}
            disabled={loading}
          />
          {/* Dash separator between box 3 and 4 */}
          {i === 2 && (
            <span
              style={{
                fontSize: 28,
                color: "var(--text-muted)",
                fontWeight: 300,
                margin: "0 4px",
                userSelect: "none",
              }}
            >
              –
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
