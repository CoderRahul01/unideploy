"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "ud_announcement_dismissed";

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        background: "#0f1410",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        padding: "9px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        position: "relative",
        zIndex: 40,
      }}
    >
      <span
        style={{
          color: "#9aa88a",
          fontSize: 13,
          fontFamily: "var(--font-body), DM Sans, sans-serif",
          letterSpacing: "0.01em",
        }}
      >
        Early access open · Book a free 30-min security audit
      </span>
      <button
        data-cal-link="rahulpandey187/unideploy-demo"
        data-cal-namespace="unideploy-demo"
        data-cal-config='{"layout":"month_view"}'
        style={{
          background: "#1D9E75",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "3px 12px",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "var(--font-body), DM Sans, sans-serif",
          flexShrink: 0,
        }}
      >
        Book now
      </button>
      <button
        onClick={() => {
          setVisible(false);
          localStorage.setItem(STORAGE_KEY, "1");
        }}
        aria-label="Dismiss announcement"
        style={{
          position: "absolute",
          right: 16,
          background: "none",
          border: "none",
          color: "#4a5a3a",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: "2px 6px",
          display: "flex",
          alignItems: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}
