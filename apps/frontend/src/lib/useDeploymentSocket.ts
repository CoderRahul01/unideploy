import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

interface DeploymentSocketState {
  logs: string[];
  status: string;
  sandboxUrl: string | null;
}

export function useDeploymentSocket(deploymentId: string | null): DeploymentSocketState {
  const [state, setState] = useState<DeploymentSocketState>({
    logs: [],
    status: "idle",
    sandboxUrl: null,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!deploymentId) return;

    setState({ logs: [], status: "connecting", sandboxUrl: null });

    const ws = new WebSocket(`${WS_URL}/ws/deploy/${deploymentId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, status: "queued" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setState((prev) => {
          const next = { ...prev };

          if (data.log) {
            next.logs = [...prev.logs, data.log];
          }
          if (data.message) {
            next.logs = [...next.logs, `[System] ${data.message}`];
          }
          if (data.status) {
            next.status = data.status;
          }
          if (data.sandboxUrl) {
            next.sandboxUrl = data.sandboxUrl;
          }

          return next;
        });
      } catch {
        setState((prev) => ({ ...prev, logs: [...prev.logs, event.data] }));
      }
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, status: "error", logs: [...prev.logs, "[ERR] WebSocket connection failed"] }));
    };

    ws.onclose = () => {
      setState((prev) =>
        prev.status !== "live" && prev.status !== "failed"
          ? { ...prev, status: "disconnected" }
          : prev
      );
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [deploymentId]);

  return state;
}
