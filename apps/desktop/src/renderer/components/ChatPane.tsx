import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "agent" | "tool";
  text: string;
}

declare global {
  interface Window {
    uni: {
      agent: {
        prompt: (opts: { prompt: string; cwd?: string }) => Promise<{ ok: boolean }>;
        onChunk: (cb: (text: string) => void) => () => void;
        onTool: (cb: (text: string) => void) => () => void;
        onDone: (cb: (r: { code: number | null; error?: string }) => void) => () => void;
      };
      scan: {
        run: (opts: { repoPath: string; type?: string }) => Promise<{ ok: boolean }>;
      };
      settings: {
        get: () => Promise<Record<string, string>>;
        set: (d: Record<string, string>) => Promise<{ ok: boolean }>;
      };
    };
  }
}

export default function ChatPane() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: "Hello! I'm UniDeploy. Enter a project path and ask me to scan, fix, or harden it." },
  ]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState(window.location?.href ? "." : ".");
  const [running, setRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const agentMsgRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendAgentChunk = useCallback((chunk: string) => {
    agentMsgRef.current += chunk;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "agent") {
        return [...prev.slice(0, -1), { role: "agent", text: agentMsgRef.current }];
      }
      return [...prev, { role: "agent", text: agentMsgRef.current }];
    });
  }, []);

  const appendTool = useCallback((text: string) => {
    const clean = text.replace(/\x1b\[[0-9;]*m/g, "").trim();
    if (!clean) return;
    setMessages((prev) => [...prev, { role: "tool", text: clean }]);
  }, []);

  const submit = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || running) return;

    setInput("");
    setRunning(true);
    agentMsgRef.current = "";
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);

    const unsubChunk = window.uni.agent.onChunk(appendAgentChunk);
    const unsubTool = window.uni.agent.onTool(appendTool);
    const unsubDone = window.uni.agent.onDone(({ error }) => {
      if (error) {
        setMessages((prev) => [
          ...prev,
          { role: "tool", text: `Error: ${error}` },
        ]);
      }
      unsubChunk();
      unsubTool();
      unsubDone();
      setRunning(false);
    });

    await window.uni.agent.prompt({ prompt, cwd });
  }, [input, running, cwd, appendAgentChunk, appendTool]);

  return (
    <div className="chat-pane">
      {/* Project path bar */}
      <div className="path-bar">
        <span className="path-label">Project path</span>
        <input
          className="path-input"
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          placeholder="/Users/you/my-project"
          spellCheck={false}
        />
        <div className="quick-scans">
          {[
            { label: "Scan all", prompt: "scan this project" },
            { label: "Secrets", prompt: "scan for secrets" },
            { label: "RLS", prompt: "check RLS" },
            { label: "Deploy", prompt: "check deploy readiness" },
          ].map(({ label, prompt }) => (
            <button
              key={label}
              className="quick-btn"
              disabled={running}
              onClick={() => {
                setInput(prompt);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Message list */}
      <div className="message-list">
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            {msg.role === "tool" ? (
              <span className="tool-badge">⚙ tool</span>
            ) : msg.role === "user" ? (
              <span className="user-badge">you</span>
            ) : (
              <span className="agent-badge">unideploy</span>
            )}
            <pre className="message-text">{msg.text}</pre>
          </div>
        ))}
        {running && (
          <div className="message message-agent">
            <span className="agent-badge">unideploy</span>
            <span className="thinking-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="input-bar">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask UniDeploy anything — scan, fix, explain..."
          disabled={running}
        />
        <button
          className="send-btn"
          onClick={() => void submit()}
          disabled={running || !input.trim()}
        >
          {running ? "..." : "↑"}
        </button>
      </div>
    </div>
  );
}
