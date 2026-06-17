import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { redis } from "../services/redis.js";
import type { WsServerMessage, WsClientMessage, AuthSession } from "../types/index.js";

// In-memory session map: sessionId → { cli, browser, queue }
// For a single-process deployment this is sufficient. For multi-instance, replace with Redis.
interface SessionSockets {
  cli: WebSocket | null;
  browser: WebSocket | null;
  queue: WsServerMessage[];         // messages buffered before both sides connect
  userId: string | null;
}

const sessions = new Map<string, SessionSockets>();

function getOrCreate(sessionId: string): SessionSockets {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { cli: null, browser: null, queue: [], userId: null };
    sessions.set(sessionId, s);
  }
  return s;
}

function send(ws: WebSocket, msg: WsServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(session: SessionSockets, msg: WsServerMessage): void {
  if (session.cli) send(session.cli, msg);
  if (session.browser) send(session.browser, msg);
}

function parseToken(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? "", "http://localhost");
  return url.searchParams.get("token");
}

async function validateToken(token: string): Promise<{ userId: string } | null> {
  try {
    const s = await redis.jsonGet<{ user_id: string }>(`session:${token}`);
    return s?.user_id ? { userId: s.user_id } : null;
  } catch {
    return null;
  }
}

export function attachWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const role = url.searchParams.get("role") as "cli" | "browser" | null;
    const sessionId = url.searchParams.get("session") ?? "";
    const token = parseToken(req);

    if (!token) {
      ws.close(4001, "token required");
      return;
    }

    const auth = await validateToken(token);
    if (!auth) {
      ws.close(4003, "invalid or expired token");
      return;
    }

    if (!sessionId) {
      ws.close(4002, "session id required");
      return;
    }

    const session = getOrCreate(sessionId);

    if (role === "cli") {
      session.cli = ws;
      session.userId = auth.userId;

      // Drain queued messages
      for (const msg of session.queue) send(ws, msg);
      session.queue = [];

      if (session.browser) {
        send(ws, { type: "browser_connected", sessionId });
      }

      // Subscribe to Redis pub/sub channel for this session
      // Upstash REST does not support subscribe; we poll the verify endpoint instead.
      // Real pub/sub messages are delivered via the /poll fallback endpoints.

      ws.on("message", (raw) => {
        let msg: WsClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as WsClientMessage;
        } catch {
          return;
        }

        if (msg.type === "scan_progress" && session.browser) {
          send(session.browser, msg as unknown as WsServerMessage);
        } else if (msg.type === "fix_applied" && session.browser) {
          send(session.browser, msg as unknown as WsServerMessage);
        }
      });

      ws.on("close", () => {
        if (sessions.get(sessionId)?.cli === ws) {
          const s = sessions.get(sessionId);
          if (s) s.cli = null;
        }
      });
    } else if (role === "browser") {
      session.browser = ws;

      if (session.cli) {
        send(session.cli, { type: "browser_connected", sessionId });
      }

      ws.on("message", (raw) => {
        let msg: WsClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as WsClientMessage;
        } catch {
          return;
        }

        if (msg.type === "apply_fix") {
          if (!session.cli) {
            send(ws, {
              type: "error",
              message: "CLI is no longer connected. Run `unideploy init` again.",
            });
            return;
          }
          // Relay to CLI
          send(session.cli, {
            type: "apply_fix",
            findings: [],   // will be resolved by scan record lookup on CLI side
            sessionId,
          });
        }
      });

      ws.on("close", () => {
        if (sessions.get(sessionId)?.browser === ws) {
          const s = sessions.get(sessionId);
          if (s) s.browser = null;
        }
      });
    } else {
      ws.close(4000, "role must be cli or browser");
    }
  });

  return wss;
}

// Called by the Redis pub/sub relay (poll endpoints) to push a message into a session
export function relayToSession(sessionId: string, msg: WsServerMessage): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (session.cli || session.browser) {
    broadcast(session, msg);
  } else {
    // Buffer up to 50 messages
    if (session.queue.length < 50) session.queue.push(msg);
  }
}
