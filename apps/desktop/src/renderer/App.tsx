import { useState } from "react";
import ChatPane from "./components/ChatPane";
import Settings from "./components/Settings";

type View = "home" | "settings";

export default function App() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-mark">U</span>
          <span className="logo-text">UniDeploy</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${view === "home" ? "active" : ""}`}
            onClick={() => setView("home")}
          >
            <span className="nav-icon">⌂</span>
            Scan
          </button>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
          >
            <span className="nav-icon">⚙</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <a
            href="https://unideploy.in"
            className="sidebar-link"
            target="_blank"
            rel="noreferrer"
          >
            unideploy.in
          </a>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="main-content">
        {view === "home" && <ChatPane />}
        {view === "settings" && <Settings />}
      </main>
    </div>
  );
}
