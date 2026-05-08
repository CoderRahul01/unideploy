"use client";
import { usePathname } from "next/navigation";
import { Calendar } from "lucide-react";

export default function FloatingDemoButton() {
  const pathname = usePathname();
  if (pathname === "/demo") return null;

  return (
    <button
      data-cal-link="rahulpandey187/unideploy-demo"
      data-cal-namespace="unideploy-demo"
      data-cal-config='{"layout":"month_view"}'
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 50,
        background: "#1D9E75",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 4px 16px rgba(29,158,117,0.25)",
      }}
    >
      <Calendar size={15} strokeWidth={2} />
      Book Demo
    </button>
  );
}
