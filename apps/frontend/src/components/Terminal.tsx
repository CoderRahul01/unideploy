"use client";

import { useEffect, useState, useRef } from "react";

interface TerminalLine {
  text: string;
  color?: string;
  bold?: boolean;
  delay?: number; // ms before this line appears
}

interface TerminalProps {
  lines: TerminalLine[];
  title?: string;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Terminal({
  lines,
  title = "Terminal — zsh",
  animated = true,
  className = "",
  style = {},
}: TerminalProps) {
  const [visibleLines, setVisibleLines] = useState<number>(animated ? 0 : lines.length);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!animated || hasStarted.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          startAnimation();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animated]);

  const startAnimation = () => {
    let lineIndex = 0;

    const showNextLine = () => {
      if (lineIndex >= lines.length) return;

      const line = lines[lineIndex];
      const delay = line.delay ?? 400;
      lineIndex++;

      setTimeout(() => {
        setVisibleLines(lineIndex);
        showNextLine();
      }, delay);
    };

    showNextLine();
  };

  return (
    <div
      ref={containerRef}
      className={`terminal-block ${className}`}
      style={{ position: "relative", ...style }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div className="terminal-dots">
          <div className="terminal-dot-red" />
          <div className="terminal-dot-amber" />
          <div className="terminal-dot-green" />
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginLeft: 12,
            fontFamily: "var(--font-mono), JetBrains Mono, monospace",
            opacity: 0.5,
          }}
        >
          {title}
        </span>
      </div>

      {/* Lines */}
      <div style={{ minHeight: lines.length * 22 }}>
        {lines.slice(0, visibleLines).map((line, i) => {
          if (line.text === "---") {
            return (
              <div
                key={i}
                style={{
                  color: "rgba(200,216,176,0.2)",
                  letterSpacing: "0.5px",
                  userSelect: "none",
                  lineHeight: "1.7",
                }}
              >
                ─────────────────────────────────────────
              </div>
            );
          }

          return (
            <div
              key={i}
              style={{
                color: line.color || "var(--bg-terminal-text)",
                fontWeight: line.bold ? 700 : 400,
                lineHeight: "1.7",
                whiteSpace: "pre",
              }}
            >
              {line.text}
            </div>
          );
        })}
        {/* Blinking cursor on last visible line */}
        {animated && visibleLines > 0 && visibleLines < lines.length && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 16,
              background: "var(--accent-live)",
              animation: "cursor-blink 0.8s step-end infinite",
              verticalAlign: "text-bottom",
              marginLeft: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
