import { useState, useEffect } from "react";

const API_KEYS = [
  { key: "ANTHROPIC_API_KEY", label: "Anthropic", placeholder: "sk-ant-..." },
  { key: "GEMINI_API_KEY",    label: "Gemini",    placeholder: "AIza..." },
  { key: "GROQ_API_KEY",      label: "Groq",      placeholder: "gsk_..." },
  { key: "TINYFISH_API_KEY",  label: "Tinyfish",  placeholder: "tf-..." },
] as const;

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.uni.settings.get().then((data) => {
      setValues(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await window.uni.settings.set(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="settings-loading">Loading...</div>;

  return (
    <div className="settings-pane">
      <h1 className="settings-title">Settings</h1>
      <p className="settings-desc">
        API keys are stored locally on this Mac and never leave your device.
        At least one LLM key is required for the agent to work.
      </p>

      <div className="settings-section">
        <h2 className="settings-section-title">API Keys</h2>

        {API_KEYS.map(({ key, label, placeholder }) => (
          <div key={key} className="settings-row">
            <label className="settings-label" htmlFor={key}>
              {label}
              <span className="settings-key-name">{key}</span>
            </label>
            <input
              id={key}
              type="password"
              className="settings-input"
              placeholder={placeholder}
              value={values[key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>

      <div className="settings-info">
        <p>
          <strong>Tinyfish</strong> — web search. Used when the agent needs live docs, CVE details, or package info.
          Get a key at{" "}
          <a href="https://tinyfish.io" target="_blank" rel="noreferrer">
            tinyfish.io
          </a>
        </p>
        <p>
          <strong>1Claw</strong> — migrate discovered secrets to a secure vault.{" "}
          <a href="https://1claw.xyz" target="_blank" rel="noreferrer">
            1claw.xyz
          </a>
        </p>
      </div>

      <button className="save-btn" onClick={() => void handleSave()}>
        {saved ? "✓ Saved" : "Save"}
      </button>
    </div>
  );
}
