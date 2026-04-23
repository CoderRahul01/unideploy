import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { auth } from "@/lib/firebase";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3001";

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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!deploymentId) return;

    setState({ logs: [], status: "connecting", sandboxUrl: null });

    let cancelled = false;
    let socket: Socket;

    (async () => {
      if (!auth.currentUser) {
        setState((prev) => ({
          ...prev,
          status: "error",
          logs: [...prev.logs, "[ERR] Not authenticated — sign in to stream logs"],
        }));
        return;
      }
      const token = await auth.currentUser.getIdToken();
      if (cancelled) return;

      socket = io(GATEWAY_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setState((prev) => ({ ...prev, status: "connected" }));
        socket.emit("subscribe_build", deploymentId);
      });

      socket.on("log", (data: any) => {
        let parsedData = data;
        if (typeof data === "string") {
          try {
            if (data.startsWith("{")) {
              parsedData = JSON.parse(data.replace(/'/g, '"'));
            }
          } catch (e) {
            // fallback to literal string
          }
        }

        setState((prev) => {
          const next = { ...prev };
          if (typeof parsedData === "string") {
            next.logs = [...prev.logs, parsedData];
          } else {
            if (parsedData.log) next.logs = [...next.logs, parsedData.log];
            if (parsedData.message) next.logs = [...next.logs, `[System] ${parsedData.message}`];
            if (parsedData.status) next.status = parsedData.status;
            if (parsedData.sandbox_url) next.sandboxUrl = parsedData.sandbox_url;
          }
          return next;
        });
      });

      socket.on("connect_error", (err) => {
        setState((prev) => ({
          ...prev,
          status: "error",
          logs: [...prev.logs, `[ERR] Gateway connection failed: ${err.message}`],
        }));
      });

      socket.on("disconnect", () => {
        setState((prev) => ({ ...prev, status: "disconnected" }));
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [deploymentId]);

  return state;
}
