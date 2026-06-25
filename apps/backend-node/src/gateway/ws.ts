import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { redis } from "../services/redis.js";
import type { WsServerMessage, WsClientMessage, AuthSession } from "../types/index.js";

const MAX_MESSAGE_SIZE = 16 * 1024; // 16KB
const MAX_CONNECTIONS_PER_IP = 5;
const HEARTBEAT_INTERVAL_MS = 30_000;
const SESSION_CLEANUP_INTERVAL_MS = 30 * 60_000; // 30 minutes

// In-memory session map: sessionId → { cli, browser, queue }
// For a single-process deployment this is sufficient. For multi-instance, replace with Redis.
interface SessionSockets {
  cli: WebSocket | null;
  browser: WebSocket | null;
  queue: WsServerMessage[];         // messages buffered before both sides connect
  userId: string | null;
  lastActivity: number;
}

const sessions = new Map<string, SessionSockets>();
const ipConnections = new Map<string, number>();

function getOrCreate(sessionId: string): SessionSockets {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { cli: null, browser: null, queue: [], userId: null, lastActivity: Date.now() };
    sessions.set(sessionId, s);
  }
  s.lastActivity = Date.now();
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
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: MAX_MESSAGE_SIZE,
  });

  // Heartbeat: detect stale connections
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const ext = ws as WebSocket & { isAlive?: boolean };
      if (ext.isAlive === false) {
        ws.terminate();
        continue;
      }
      ext.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Session memory cleanup: remove sessions idle for 30+ minutes
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - SESSION_CLEANUP_INTERVAL_MS;
    for (const [id, s] of sessions) {
      if (!s.cli && !s.browser && s.lastActivity < cutoff) {
        sessions.delete(id);
      }
    }
  }, SESSION_CLEANUP_INTERVAL_MS);

  wss.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(cleanup);
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    // Heartbeat tracking
    const ext = ws as WebSocket & { isAlive?: boolean };
    ext.isAlive = true;
    ws.on("pong", () => { ext.isAlive = true; });

    // Per-IP connection limiting
    const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
      ?? req.socket.remoteAddress ?? "unknown";
    const currentCount = ipConnections.get(clientIp) ?? 0;
    if (currentCount >= MAX_CONNECTIONS_PER_IP) {
      ws.close(4029, "Too many connections from this IP");
      return;
    }
    ipConnections.set(clientIp, currentCount + 1);
    ws.on("close", () => {
      const c = ipConnections.get(clientIp) ?? 1;
      if (c <= 1) ipConnections.delete(clientIp);
      else ipConnections.set(clientIp, c - 1);
    });

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

      ws.on("message", (raw) => {
        if (Buffer.byteLength(raw as Buffer) > MAX_MESSAGE_SIZE) return;
        let msg: WsClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as WsClientMessage;
        } catch {
          return;
        }

        session.lastActivity = Date.now();

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
        if (Buffer.byteLength(raw as Buffer) > MAX_MESSAGE_SIZE) return;
        let msg: WsClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as WsClientMessage;
        } catch {
          return;
        }

        session.lastActivity = Date.now();

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
