import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { stream } from 'hono/streaming'
import { Sandbox } from '@e2b/code-interpreter'

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  AI_BASE_URL: string;
  AI_MODEL: string;
  AI_API_KEY?: string;
  E2B_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type', 'X-Api-Key'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

// ── AI Helper ───────────────────────────────────────────────────────────────

async function callAI(env: Env, messages: { role: string; content: string }[], options: { json?: boolean } = {}) {
  const baseUrl = env.AI_BASE_URL || "https://api.groq.com/openai/v1";
  const model = env.AI_MODEL || "llama-3.3-70b-versatile";
  const apiKey = env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("AI_API_KEY environment secret is not configured. Please add it via 'wrangler secret put AI_API_KEY'.");
  }

  const body: any = {
    model,
    messages,
    temperature: 0.1,
  };

  if (options.json) {
    if (baseUrl.includes("groq.com") || baseUrl.includes("openai.com")) {
      body.response_format = { type: "json_object" };
    }
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI completions request failed: ${res.status} - ${errorText}`);
  }

  const data: any = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  return content;
}

// ── Heuristic Utilities ──────────────────────────────────────────────────────

function computeGrade(findings: any[]): string {
  const critical = findings.filter(f => f.severity?.toUpperCase() === 'CRITICAL').length;
  const high = findings.filter(f => f.severity?.toUpperCase() === 'HIGH').length;
  const medium = findings.filter(f => f.severity?.toUpperCase() === 'MEDIUM').length;

  if (critical >= 1) return 'F';
  if (high >= 3) return 'D';
  if (high >= 1 || medium >= 5) return 'C';
  if (medium > 0) return 'B';
  return 'A';
}

// ── Health Check ─────────────────────────────────────────────────────────────

app.get('/', (c) => c.json({ service: "UniDeploy API (Cloudflare Worker)", version: "0.1.0", health: "/health" }))

app.get('/health', (c) => c.json({
  status: "healthy",
  version: "0.1.0",
  env: "production",
  database: "configured",
  ai: c.env.AI_API_KEY ? "configured" : "missing",
}))

// ── API status (consumed by frontend) ────────────────────────────────────────

app.get('/api/v1/status', (c) => c.json({
  user_id: "anonymous",
  plan_tier: "free",
  scans_remaining: 999,
  last_scan: null,
}))

// ── E2B Cloud Sandbox Hub & Marketplace (Cloudflare Worker) ──────────────────

const BLOCKED_PATTERNS = [
  /stratum\+tcp/i,
  /xmrig/i,
  /minerd/i,
  /cryptonight/i,
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
  /rm\s+-rf\s+(\/|--no-preserve-root)/i,
  /dd\s+if=\/dev\/zero\s+of=\/dev\/[sh]da/i,
  /mkfs\./i,
];

app.get('/api/sandbox/templates', (c) => {
  return c.json({
    service: "UniDeploy Sandbox Marketplace (Cloudflare Worker)",
    provider: "E2B Firecracker microVMs",
    templates: [
      {
        id: "data-science",
        name: "Data Science & Plot Engine",
        badge: "Most Popular",
        category: "data",
        language: "python",
        description: "Python 3.11 with Pandas, NumPy, and Matplotlib. Automatically renders charts & plots directly.",
        specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
        outputType: "chart",
      },
      {
        id: "node-runtime",
        name: "Node.js 20 & Modern JS",
        badge: "Fastest",
        category: "fullstack",
        language: "js",
        description: "Modern JavaScript engine with async/await, crypto, and ES modules.",
        specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
        outputType: "text",
      },
      {
        id: "cloud-terminal",
        name: "Linux Cloud Terminal (Bash)",
        badge: "Root Shell",
        category: "terminal",
        language: "bash",
        description: "Disposable Ubuntu/Debian microVM bash terminal with curl, git, python, and node.",
        specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
        outputType: "text",
      },
      {
        id: "security-audit",
        name: "UniDeploy Vulnerability Scan",
        badge: "DevSecOps",
        category: "security",
        language: "python",
        description: "Security scanner engine searching for hardcoded API keys, JWT secrets, and AWS tokens.",
        specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
        outputType: "json",
      },
      {
        id: "web-scraper",
        name: "Web Scraper & Metadata Extractor",
        badge: "Automation",
        category: "automation",
        language: "python",
        description: "Scrapes remote web endpoints, parses meta tags, open graph metadata, and headers.",
        specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
        outputType: "text",
      },
    ],
  });
});

async function handleSandboxRun(c: any) {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body || !body.code) {
      return c.json({ success: false, error: "Missing or invalid 'code' in request body." }, 400);
    }

    const { language = "python", code, timeoutMs = 30000 } = body;

    // Safety validation
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(code)) {
        return c.json({
          success: false,
          error: "Security violation: execution payload matched restricted safety policy.",
        }, 400);
      }
    }

    const apiKey = c.env.E2B_API_KEY;
    if (!apiKey) {
      return c.json({
        success: false,
        error: "E2B_API_KEY is not configured on Cloudflare worker environment.",
      }, 500);
    }
    const startTime = Date.now();
    let sbx: any = null;

    try {
      sbx = await Sandbox.create({
        apiKey,
        timeoutMs: Math.min(Number(timeoutMs) || 30000, 60000),
      });

      const sandboxId = sbx.sandboxId;

      if (language === "bash") {
        const cmdResult = await sbx.commands.run(code, {
          timeoutMs: Math.min(Number(timeoutMs) || 30000, 30000),
        });
        const durationMs = Date.now() - startTime;
        const isSuccess = cmdResult.exitCode === 0;

        return c.json({
          success: isSuccess,
          stdout: cmdResult.stdout || "",
          stderr: cmdResult.stderr || (isSuccess ? "" : `Process exited with code ${cmdResult.exitCode}`),
          durationMs,
          sandboxId,
        });
      } else {
        const lang = language === "python" ? "python" : "js";
        const execution = await sbx.runCode(code, { language: lang });
        const durationMs = Date.now() - startTime;

        const stdoutPieces: string[] = [];
        if (execution.logs?.stdout?.length) stdoutPieces.push(execution.logs.stdout.join(""));
        if (execution.text) stdoutPieces.push(execution.text);

        const stderrPieces: string[] = [];
        if (execution.logs?.stderr?.length) stderrPieces.push(execution.logs.stderr.join(""));
        if (execution.error) {
          stderrPieces.push(`${execution.error.name}: ${execution.error.value}\n${execution.error.traceback || ""}`);
        }

        const results: Array<{ type: string; data: string }> = [];
        if (execution.results?.length) {
          for (const item of execution.results) {
            if (item.png) results.push({ type: "image/png", data: item.png });
            else if (item.svg) results.push({ type: "image/svg+xml", data: item.svg });
            else if (item.text) results.push({ type: "text/plain", data: item.text });
          }
        }

        return c.json({
          success: !execution.error,
          stdout: stdoutPieces.join("\n").trim(),
          stderr: stderrPieces.join("\n").trim(),
          results,
          durationMs,
          sandboxId,
        });
      }
    } catch (err: any) {
      return c.json({
        success: false,
        stdout: "",
        stderr: err?.message || String(err),
        durationMs: Date.now() - startTime,
        error: err?.message || "Execution error",
      }, 500);
    } finally {
      if (sbx) {
        try {
          await sbx.kill();
        } catch {}
      }
    }
  } catch (outerErr: any) {
    return c.json({ success: false, error: outerErr?.message || "Internal server error" }, 500);
  }
}

app.post('/api/sandbox/run', handleSandboxRun);
app.post('/v1/sandbox/execute', handleSandboxRun);

// ── Password Hashing Helper ──────────────────────────────────────────────────

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(`${salt}:${password}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ── Auth & Account Endpoints ──────────────────────────────────────────────────

app.post('/auth/register', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const email = (body.email || "").trim().toLowerCase()
    const password = body.password || ""

    if (!email || !email.includes("@")) {
      return c.json({ error: "Please provide a valid email address", detail: "Please provide a valid email address" }, 400)
    }
    if (!password || password.length < 6) {
      return c.json({ error: "Password must be at least 6 characters long", detail: "Password must be at least 6 characters long" }, 400)
    }

    // Check if user already exists
    try {
      const existing = await c.env.DB.prepare("SELECT id FROM app_users WHERE email = ?").bind(email).first()
      if (existing) {
        return c.json({ error: "User already exists with this email", detail: "User already exists with this email" }, 400)
      }
    } catch (dbErr) {
      console.warn("D1 select check warning:", dbErr)
    }

    const userId = crypto.randomUUID()
    const salt = crypto.randomUUID()
    const passwordHash = await hashPassword(password, salt)
    const now = new Date().toISOString()
    const token = `ud_tok_${crypto.randomUUID().replace(/-/g, "")}`

    const userData = {
      id: userId,
      user_id: userId,
      email,
      plan_tier: "Free",
      scans_remaining: 10,
      created_at: now,
    }

    // Insert into D1
    try {
      await c.env.DB.prepare(
        "INSERT INTO app_users (id, email, password_hash, salt, plan_tier, scans_remaining, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(userId, email, passwordHash, salt, "Free", 10, now).run()
    } catch (dbErr) {
      console.error("D1 app_users insert failed:", dbErr)
    }

    // Store session in KV (30-day TTL)
    await c.env.SESSIONS.put(`session:${token}`, JSON.stringify(userData), { expirationTtl: 86400 * 30 })

    return c.json({
      data: {
        token,
        user_id: userId,
        email,
        plan_tier: "Free",
        scans_remaining: 10,
      }
    }, 201)
  } catch (err: any) {
    console.error("Registration error:", err)
    return c.json({ error: err.message || "Registration failed", detail: err.message || "Registration failed" }, 500)
  }
})

app.post('/auth/login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const email = (body.email || "").trim().toLowerCase()
    const password = body.password || ""

    if (!email || !password) {
      return c.json({ error: "Email and password are required", detail: "Email and password are required" }, 400)
    }

    let user: any = null
    try {
      user = await c.env.DB.prepare(
        "SELECT id, email, password_hash, salt, plan_tier, scans_remaining FROM app_users WHERE email = ?"
      ).bind(email).first()
    } catch (dbErr) {
      console.error("D1 select user failed:", dbErr)
    }

    if (!user) {
      return c.json({ error: "Invalid email or password", detail: "Invalid email or password" }, 401)
    }

    const computedHash = await hashPassword(password, user.salt)
    if (computedHash !== user.password_hash) {
      return c.json({ error: "Invalid email or password", detail: "Invalid email or password" }, 401)
    }

    const token = `ud_tok_${crypto.randomUUID().replace(/-/g, "")}`
    const userData = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      plan_tier: user.plan_tier || "Free",
      scans_remaining: user.scans_remaining ?? 10,
    }

    // Store session in KV (30-day TTL)
    await c.env.SESSIONS.put(`session:${token}`, JSON.stringify(userData), { expirationTtl: 86400 * 30 })

    return c.json({
      data: {
        token,
        user_id: user.id,
        email: user.email,
        plan_tier: user.plan_tier || "Free",
        scans_remaining: user.scans_remaining ?? 10,
      }
    })
  } catch (err: any) {
    console.error("Login error:", err)
    return c.json({ error: err.message || "Login failed", detail: err.message || "Login failed" }, 500)
  }
})

app.get('/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization') || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim()

  if (!token) {
    return c.json({ error: "Unauthorized", detail: "Missing authentication token" }, 401)
  }

  // Look up in KV session
  const cached = await c.env.SESSIONS.get(`session:${token}`)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      return c.json({
        data: {
          user_id: parsed.id || parsed.user_id,
          email: parsed.email,
          plan_tier: parsed.plan_tier || "Free",
          scans_remaining: parsed.scans_remaining ?? 10,
        }
      })
    } catch {}
  }

  return c.json({ error: "Session expired or invalid", detail: "Session expired or invalid" }, 401)
})

app.get('/auth/session/:code', async (c) => {
  const rawCode = c.req.param('code') || ""
  const code = rawCode.trim().replace(/-/g, "").toUpperCase()

  const cached = await c.env.SESSIONS.get(`auth:${code}`)
  if (!cached) {
    return c.json({ error: "Session code not found or expired", detail: "Session code not found or expired" }, 404)
  }

  const session = JSON.parse(cached)
  return c.json({
    data: {
      status: session.status,
      session_id: session.session_id,
      ...(session.token ? { token: session.token } : {})
    }
  })
})

app.post('/payments/checkout', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const tier = body.tier || "indie"
  return c.json({
    checkout_url: `/dashboard?upgraded=${tier}`,
    message: "Checkout session generated"
  })
})

// ── Auth & Pairing Endpoints ──────────────────────────────────────────────────

app.post('/auth/session', async (c) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const sessionId = crypto.randomUUID()
  const now = new Date().toISOString()

  const data = {
    session_id: sessionId,
    session_code: code,
    status: "pending",
    created_at: now,
    machine_name: null,
    project_path: "",
    cli_version: "latest",
  }

  // Store in KV with 10-minute expiration
  await c.env.SESSIONS.put(`auth:${code}`, JSON.stringify(data), { expirationTtl: 600 })

  // Insert base record into scans table
  try {
    await c.env.DB.prepare(
      "INSERT INTO scans (id, session_id, code, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
    ).bind(sessionId, sessionId, code, now).run()
  } catch (err) {
    console.error("D1 scan insert failed:", err)
  }

  // Return polling URLs instead of WebSocket URLs
  const protocol = c.req.header("x-forwarded-proto") === "https" ? "https" : "http"
  const host = c.req.header("host") || "localhost:8787"
  const baseUrl = `${protocol}://${host}`

  return c.json({
    session_id: sessionId,
    session_code: code,
    expires_in: 600,
    // For backwards compatibility, still return websocket_url but also poll_url
    websocket_url: `${baseUrl}/poll/cli/${sessionId}`,
    poll_url: `${baseUrl}/poll/cli/${sessionId}`,
    send_url: `${baseUrl}/send/cli/${sessionId}`,
  })
})

app.post('/auth/verify', async (c) => {
  const req = await c.req.json()
  const code = (req.session_code || "").trim().replace(/-/g, "")

  const cached = await c.env.SESSIONS.get(`auth:${code}`)
  if (!cached) {
    return c.json({ error: "Session code not found or expired" }, 404)
  }

  const session = JSON.parse(cached)
  session.status = "authenticated"
  session.authenticated_at = new Date().toISOString()

  // One-time use: delete from KV
  await c.env.SESSIONS.delete(`auth:${code}`)

  // Update in DB
  try {
    await c.env.DB.prepare(
      "UPDATE scans SET status = 'authenticated' WHERE id = ?"
    ).bind(session.session_id).run()
  } catch (err) {
    console.error("D1 update scans failed:", err)
  }

  // Extract user token from Authorization header if present, else create one
  const authHeader = c.req.header("Authorization") || ""
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim()
  const userToken = bearerToken || `ud_tok_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`

  // Write authentication event to the CLI mailbox
  try {
    await c.env.DB.prepare(
      "INSERT INTO messages (session_id, sender, payload) VALUES (?, 'browser', ?)"
    ).bind(session.session_id, JSON.stringify({ type: "session_authenticated", session_id: session.session_id, token: userToken })).run()
  } catch (err) {
    console.error("D1 insert message failed:", err)
  }

  return c.json({
    session_id: session.session_id,
    status: "authenticated",
  })
})

// ── HTTP Polling Endpoints (replaces WebSocket) ───────────────────────────────
// These replace the WebSocket handlers. The D1 `messages` table acts as a
// mailbox: the CLI polls for 'browser' messages, the browser polls for 'cli'
// messages. Messages are deleted after delivery.

// CLI polls for messages from browser
app.get('/poll/cli/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM messages WHERE session_id = ? AND sender = 'browser' ORDER BY id ASC LIMIT 50"
    ).bind(sessionId).all()

    if (!results || results.length === 0) {
      return c.json({ messages: [] })
    }

    const msgs = results.map(r => JSON.parse(r.payload as string))

    // Delete delivered messages
    const ids = results.map(r => r.id)
    for (const id of ids) {
      await c.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run()
    }

    return c.json({ messages: msgs })
  } catch (err) {
    console.error("CLI poll error:", err)
    return c.json({ messages: [] })
  }
})

// Browser polls for messages from CLI
app.get('/poll/browser/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')

  try {
    // On first connect, check if scan is already complete and push findings
    const since = c.req.query('since') // message ID cursor
    let query = "SELECT * FROM messages WHERE session_id = ? AND sender = 'cli' ORDER BY id ASC LIMIT 50"
    let stmt = c.env.DB.prepare(query).bind(sessionId)

    if (since) {
      query = "SELECT * FROM messages WHERE session_id = ? AND sender = 'cli' AND id > ? ORDER BY id ASC LIMIT 50"
      stmt = c.env.DB.prepare(query).bind(sessionId, parseInt(since))
    }

    const { results } = await stmt.all()

    if (!results || results.length === 0) {
      return c.json({ messages: [], last_id: since ? parseInt(since) : 0 })
    }

    const msgs = results.map(r => JSON.parse(r.payload as string))
    const lastId = results[results.length - 1].id

    // Delete delivered messages
    for (const r of results) {
      await c.env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(r.id).run()
    }

    return c.json({ messages: msgs, last_id: lastId })
  } catch (err) {
    console.error("Browser poll error:", err)
    return c.json({ messages: [], last_id: 0 })
  }
})

// CLI sends a message to browser
app.post('/send/cli/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const body = await c.req.json()

  try {
    await c.env.DB.prepare(
      "INSERT INTO messages (session_id, sender, payload) VALUES (?, 'cli', ?)"
    ).bind(sessionId, JSON.stringify(body)).run()
  } catch (err) {
    console.error("CLI send error:", err)
    return c.json({ error: "Failed to send message" }, 500)
  }

  return c.json({ ok: true })
})

// Browser sends a message to CLI (e.g. apply_fix)
app.post('/send/browser/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const body = await c.req.json()

  try {
    // Special handling for apply_fix — resolve finding IDs from DB
    if (body.type === "apply_fix") {
      const findingIds: string[] = body.finding_ids || (body.finding_id ? [body.finding_id] : [])
      if (findingIds.length > 0) {
        const placeholders = findingIds.map(() => "?").join(",")
        const query = `SELECT * FROM findings WHERE scan_id = ? AND id IN (${placeholders})`
        const { results: findings } = await c.env.DB.prepare(query).bind(sessionId, ...findingIds).all()

        if (findings && findings.length > 0) {
          // Send fix_started acknowledgment back to browser
          await c.env.DB.prepare(
            "INSERT INTO messages (session_id, sender, payload) VALUES (?, 'cli', ?)"
          ).bind(sessionId, JSON.stringify({
            type: "fix_started",
            finding_ids: findingIds,
            count: findings.length,
          })).run()

          // Enqueue the apply_fix message for CLI
          await c.env.DB.prepare(
            "INSERT INTO messages (session_id, sender, payload) VALUES (?, 'browser', ?)"
          ).bind(sessionId, JSON.stringify({
            type: "apply_fix",
            findings,
            session_id: sessionId,
          })).run()

          return c.json({ ok: true, findings_queued: findings.length })
        }
      }
    }

    // Generic message forwarding
    await c.env.DB.prepare(
      "INSERT INTO messages (session_id, sender, payload) VALUES (?, 'browser', ?)"
    ).bind(sessionId, JSON.stringify(body)).run()
  } catch (err) {
    console.error("Browser send error:", err)
    return c.json({ error: "Failed to send message" }, 500)
  }

  return c.json({ ok: true })
})

// Browser first-connect — get existing scan data if available
app.get('/poll/browser/:sessionId/init', async (c) => {
  const sessionId = c.req.param('sessionId')

  try {
    const scan = await c.env.DB.prepare("SELECT * FROM scans WHERE id = ?").bind(sessionId).first<any>()
    if (!scan) {
      return c.json({ scan: null, findings: [] })
    }

    const { results: findings } = await c.env.DB.prepare(
      "SELECT * FROM findings WHERE scan_id = ?"
    ).bind(sessionId).all()

    return c.json({
      scan: {
        id: scan.id,
        status: scan.status,
        grade: scan.grade,
        total_issues: scan.total_issues,
        auto_fixable: scan.auto_fixable,
        files_scanned: scan.files_scanned,
        project_name: scan.project_name,
        framework: scan.framework,
      },
      findings: findings || [],
    })
  } catch (err) {
    console.error("Browser init error:", err)
    return c.json({ scan: null, findings: [] })
  }
})

// ── Scan Results Endpoints ────────────────────────────────────────────────────

app.post('/scans/:sessionId/results', async (c) => {
  const sessionId = c.req.param('sessionId')
  const req = await c.req.json()

  if (req.session_id !== sessionId) {
    return c.json({ error: "session_id mismatch in body vs URL" }, 400)
  }

  const grade = req.grade || computeGrade(req.findings || [])
  const now = new Date().toISOString()

  // Update scan in D1
  try {
    await c.env.DB.prepare(
      `UPDATE scans SET
        project_name = ?,
        framework = ?,
        status = 'complete',
        grade = ?,
        total_issues = ?,
        auto_fixable = ?,
        files_scanned = ?,
        completed_at = ?
      WHERE id = ?`
    ).bind(
      req.project_name,
      req.framework,
      grade,
      req.total_issues,
      req.auto_fixable,
      req.files_scanned,
      now,
      sessionId
    ).run()
  } catch (err) {
    console.error("Failed to update scan results in D1:", err)
  }

  // Insert findings to D1
  if (req.findings && Array.isArray(req.findings)) {
    for (const f of req.findings) {
      try {
        await c.env.DB.prepare(
          `INSERT OR REPLACE INTO findings (id, scan_id, file_path, line_number, severity, category, title, description, fix_guideline, evidence, auto_fixable)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          f.id,
          sessionId,
          f.file_path || f.file || "",
          f.line_number ?? null,
          f.severity || "",
          f.category || "",
          f.title || "",
          f.description || "",
          f.fix_guideline || f.fix_hint || "",
          f.evidence || f.snippet || "",
          f.auto_fixable ? 1 : 0
        ).run()
      } catch (err) {
        console.error("Failed to insert finding in D1:", err)
      }
    }
  }

  // Save full report to KV for 1 hour cache
  const report = {
    session_id: sessionId,
    project_name: req.project_name,
    framework: req.framework,
    scanned_at: req.scanned_at || now,
    files_scanned: req.files_scanned,
    total_issues: req.total_issues,
    auto_fixable: req.auto_fixable,
    grade: grade,
    findings: req.findings || [],
  }
  await c.env.SESSIONS.put(`report:${sessionId}`, JSON.stringify(report), { expirationTtl: 3600 })

  // Notify browser via message broker
  const critical = (req.findings || []).filter((f: any) => f.severity?.toUpperCase() === "CRITICAL").length
  const high = (req.findings || []).filter((f: any) => f.severity?.toUpperCase() === "HIGH").length
  const medium = (req.findings || []).filter((f: any) => f.severity?.toUpperCase() === "MEDIUM").length

  const completeMsg = {
    type: "scan_complete",
    session_id: sessionId,
    grade: grade,
    total_issues: req.total_issues,
    auto_fixable: req.auto_fixable,
    critical,
    high,
    medium,
    low: req.total_issues - critical - high - medium,
    report_url: `/dashboard?session_id=${sessionId}`,
  }

  try {
    await c.env.DB.prepare(
      "INSERT INTO messages (session_id, sender, payload) VALUES (?, 'cli', ?)"
    ).bind(sessionId, JSON.stringify(completeMsg)).run()
  } catch (err) {
    console.error("D1 write scan_complete message failed:", err)
  }

  return c.json({ accepted: true, session_id: sessionId, grade })
})

app.post('/scans/:sessionId/fix-complete', async (c) => {
  const sessionId = c.req.param('sessionId')
  const req = await c.req.json()

  if (req.session_id !== sessionId) {
    return c.json({ error: "session_id mismatch in body vs URL" }, 400)
  }

  const grade = computeGrade(req.updated_findings || [])
  const autoFixable = (req.updated_findings || []).filter((f: any) => f.auto_fixable).length

  // Update DB
  try {
    await c.env.DB.prepare(
      `UPDATE scans SET
        grade = ?,
        total_issues = ?,
        auto_fixable = ?
      WHERE id = ?`
    ).bind(grade, (req.updated_findings || []).length, autoFixable, sessionId).run()
  } catch (err) {
    console.error("Failed to update scans on fix-complete in D1:", err)
  }

  // Re-write findings
  try {
    await c.env.DB.prepare("DELETE FROM findings WHERE scan_id = ?").bind(sessionId).run()
    if (req.updated_findings && Array.isArray(req.updated_findings)) {
      for (const f of req.updated_findings) {
        await c.env.DB.prepare(
          `INSERT OR REPLACE INTO findings (id, scan_id, file_path, line_number, severity, category, title, description, fix_guideline, evidence, auto_fixable)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          f.id,
          sessionId,
          f.file_path || f.file || "",
          f.line_number ?? null,
          f.severity || "",
          f.category || "",
          f.title || "",
          f.description || "",
          f.fix_guideline || f.fix_hint || "",
          f.evidence || f.snippet || "",
          f.auto_fixable ? 1 : 0
        ).run()
      }
    }
  } catch (err) {
    console.error("Failed to sync updated findings in D1:", err)
  }

  // Update cached report in KV
  const report = {
    session_id: sessionId,
    findings: req.updated_findings || [],
    total_issues: (req.updated_findings || []).length,
    auto_fixable: autoFixable,
    grade: grade,
  }
  await c.env.SESSIONS.put(`report:${sessionId}`, JSON.stringify(report), { expirationTtl: 3600 })

  // Send message to browser
  const critical = (req.updated_findings || []).filter((f: any) => f.severity?.toUpperCase() === "CRITICAL").length
  const high = (req.updated_findings || []).filter((f: any) => f.severity?.toUpperCase() === "HIGH").length
  const medium = (req.updated_findings || []).filter((f: any) => f.severity?.toUpperCase() === "MEDIUM").length

  const rescanMsg = {
    type: "rescan_done",
    grade: grade,
    total_issues: (req.updated_findings || []).length,
    auto_fixable: autoFixable,
    critical,
    high,
    medium,
    low: (req.updated_findings || []).length - critical - high - medium,
    fixed_ids: req.fixed_ids || [],
    diff_summaries: req.diff_summaries || [],
    findings: req.updated_findings || [],
  }

  try {
    await c.env.DB.prepare(
      "INSERT INTO messages (session_id, sender, payload) VALUES (?, 'cli', ?)"
    ).bind(sessionId, JSON.stringify(rescanMsg)).run()
  } catch (err) {
    console.error("D1 write rescan_done message failed:", err)
  }

  return c.json({ ok: true, grade, total_issues: (req.updated_findings || []).length })
})

app.get('/scans/:sessionId/report', async (c) => {
  const sessionId = c.req.param('sessionId')

  const cached = await c.env.SESSIONS.get(`report:${sessionId}`)
  if (cached) {
    return c.json(JSON.parse(cached))
  }

  // Fallback: Query D1 database
  try {
    const scan = await c.env.DB.prepare("SELECT * FROM scans WHERE id = ?").bind(sessionId).first<any>()
    if (!scan) {
      return c.json({ error: "Report not found" }, 404)
    }

    const { results: findings } = await c.env.DB.prepare(
      "SELECT * FROM findings WHERE scan_id = ?"
    ).bind(sessionId).all()

    const report = {
      session_id: sessionId,
      project_name: scan.project_name || "",
      framework: scan.framework || "",
      scanned_at: scan.created_at || "",
      files_scanned: scan.files_scanned || 0,
      total_issues: scan.total_issues || 0,
      auto_fixable: scan.auto_fixable || 0,
      grade: scan.grade || "?",
      findings: findings || [],
    }

    return c.json(report)
  } catch (err: any) {
    return c.json({ error: `Failed to load report: ${err.message}` }, 500)
  }
})

// ── Agent AI Endpoints ────────────────────────────────────────────────────────

app.post('/api/v1/ai/patch', async (c) => {
  const req = await c.req.json()
  const finding = req.finding || {}
  const fileContent = req.file_content || ""

  const systemInstruction = `You are UniDeploy's FixAgent. Generate a minimal, targeted patch to fix a security finding.`
  const prompt = `Finding:
${JSON.stringify(finding, null, 2)}

Remediation plan:
${JSON.stringify({
    summary: finding.fix_guideline || finding.fix_hint || "Fix the security issue described in the finding.",
    steps: []
  }, null, 2)}

Current file content (${finding.file || finding.file_path || "unknown"}):
\`\`\`
${fileContent.slice(0, 8000)}
\`\`\`

Output: ONLY a JSON object with:
{
  "file_path": "${finding.file || finding.file_path || "unknown"}",
  "new_content": "<complete new file content with the fix applied>",
  "change_summary": "one sentence describing what was changed"
}

Rules:
- Make the SMALLEST possible change that fixes the finding
- Never remove functionality unrelated to the finding
- Preserve all existing comments and formatting style
- If you cannot safely patch this file, set new_content to null and explain in change_summary`

  try {
    const responseText = await callAI(c.env, [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ], { json: true })

    let text = responseText.trim()
    if (text.startsWith("```")) {
      text = text.split("```")[1]
      if (text.startsWith("json")) {
        text = text.substring(4)
      }
      text = text.substring(0, text.lastIndexOf("```"))
    }

    const result = JSON.parse(text)
    if (!result.new_content) {
      return c.json({ error: "FixAgent could not generate a safe patch." }, 422)
    }

    return c.json({
      file_path: result.file_path,
      new_content: result.new_content,
      change_summary: result.change_summary || ""
    })
  } catch (err: any) {
    return c.json({ error: `Patch generation failed: ${err.message}` }, 500)
  }
})

// ── Deploy Agent Conversations ────────────────────────────────────────────────

interface StackInfo {
  frontend: string;
  backend: string;
  db: string;
  runtime: string;
  inferred_targets: string[];
}

function detectStackFromManifest(manifest: any): StackInfo {
  const files: Record<string, string> = manifest.files || {}
  const stack: StackInfo = {
    frontend: "unknown",
    backend: "none",
    db: "none",
    runtime: "nodejs",
    inferred_targets: []
  }

  const pkgContent = files["package.json"]
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent)
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if ("next" in deps) {
        stack.frontend = "nextjs"
      } else if ("nuxt" in deps || "@nuxt/core" in deps) {
        stack.frontend = "nuxt"
      } else if ("@sveltejs/kit" in deps) {
        stack.frontend = "sveltekit"
      } else if ("vite" in deps) {
        stack.frontend = "vite"
      } else if (Object.keys(deps).length > 0) {
        stack.frontend = "nodejs"
      }

      if ("@nestjs/core" in deps) {
        stack.backend = "nestjs"
      } else if ("express" in deps) {
        stack.backend = "express"
      } else if ("fastify" in deps) {
        stack.backend = "fastify"
      } else if ("hono" in deps) {
        stack.backend = "hono"
      }
    } catch (e) {}
  }

  for (const fname of ["requirements.txt", "pyproject.toml", "Pipfile"]) {
    const content = (files[fname] || "").toLowerCase()
    if (content) {
      stack.runtime = "python"
      if (content.includes("fastapi")) {
        stack.backend = "fastapi"
      } else if (content.includes("django")) {
        stack.backend = "django"
      } else if (content.includes("flask")) {
        stack.backend = "flask"
      }
      break
    }
  }

  const allContent = Object.values(files).join(" ").toLowerCase()
  if (allContent.includes("supabase")) {
    stack.db = "supabase"
  } else if (allContent.includes("convex")) {
    stack.db = "convex"
  } else if (allContent.includes("neon")) {
    stack.db = "neon"
  } else if (allContent.includes("mongodb") || allContent.includes("mongoose")) {
    stack.db = "mongodb"
  } else if (allContent.includes("postgres") || allContent.includes("pg")) {
    stack.db = "postgres"
  } else if (allContent.includes("mysql")) {
    stack.db = "mysql"
  }

  if ("vercel.json" in files || ["nextjs", "nuxt", "sveltekit"].includes(stack.frontend)) {
    stack.inferred_targets.push("vercel")
  }
  if ("cloudbuild.yaml" in files || Object.values(files).some(v => v.includes("cloud_run") || v.includes("gcp"))) {
    stack.inferred_targets.push("gcp")
  }
  if ("railway.toml" in files || "railway.json" in files) {
    stack.inferred_targets.push("railway")
  }
  if ("wrangler.toml" in files || "wrangler.json" in files) {
    stack.inferred_targets.push("cloudflare")
  }
  if (Object.values(files).some(v => v.includes("amazonaws.com"))) {
    stack.inferred_targets.push("aws")
  }

  if (stack.inferred_targets.length === 0) {
    stack.inferred_targets = stack.backend === "none" ? ["vercel"] : ["vercel", "gcp"]
  }

  return stack
}

interface Question {
  key: string;
  question: string;
  options: string[];
  default: string | null;
}

function getClarifyingQuestions(stack: StackInfo, answers: Record<string, any> = {}): Question[] {
  const questions: Question[] = []

  if (stack.inferred_targets.includes("gcp") && !("gcp_project_id" in answers)) {
    questions.push({
      key: "gcp_project_id",
      question: "What is your Google Cloud project ID?",
      options: [],
      default: null
    })
  }

  if (stack.inferred_targets.length > 1 && !("targets" in answers)) {
    questions.push({
      key: "targets",
      question: `Detected multiple deployment targets (${stack.inferred_targets.join(", ")}). Which would you like configs for?`,
      options: [...stack.inferred_targets, "all"],
      default: "all"
    })
  }

  if (["supabase", "postgres", "neon"].includes(stack.db) && !("db_region" in answers)) {
    questions.push({
      key: "db_region",
      question: "Which region is your database in? (used to co-locate compute)",
      options: ["us-east-1", "eu-west-1", "ap-southeast-1", "us-central1"],
      default: "us-east-1"
    })
  }

  return questions
}

app.post('/api/v1/deploy/plan', async (c) => {
  const req = await c.req.json()
  const stack = detectStackFromManifest(req.manifest || {})
  const questions = getClarifyingQuestions(stack, req.answers || {})

  return c.json({
    stack,
    questions
  })
})

app.post('/api/v1/deploy/chat', async (c) => {
  const req = await c.req.json()
  const sessionId = req.session_id || crypto.randomUUID()
  
  let history = req.history
  if (!history) {
    const cached = await c.env.SESSIONS.get(`deploy_chat:${sessionId}`)
    history = cached ? JSON.parse(cached) : []
  }

  const systemPrompt = `You are a deployment configuration expert. Analyse the project manifest
and conversation history. Your job: gather exactly what you need to
generate correct deployment configs. Rules:
- Infer from manifest without asking: framework, package manager,
  monorepo layout, existing config files (vercel.json, cloudbuild.yaml,
  railway.toml, wrangler.toml)
- Ask ONLY what you cannot infer: target platform (if ambiguous),
  GCP project ID (if Cloud Run chosen), DB region (if managed Postgres)
- Ask ONE question per turn. Never ask two things at once.
- When you have: target platform, env var list, build command, output
  directory — return action=generate immediately.
- Be direct. No filler. No "Great choice!" responses.
Output JSON only: {action, question?, field?, reasoning}`

  let prompt = `Conversation history:\n${JSON.stringify(history, null, 2)}\n\n`
  
  if (req.manifest) {
    const files = req.manifest.files || {}
    const subset: Record<string, string> = {}
    const keys = Object.keys(files).slice(0, 15)
    for (const k of keys) {
      subset[k] = files[k].slice(0, 500)
    }
    prompt += `Project Manifest (subset):\n${JSON.stringify(subset, null, 2)}\n\n`
  }
  
  if (req.message) {
    history.push({ role: "user", content: req.message })
    prompt += `User Message: ${req.message}\n`
  }

  const responseText = await callAI(c.env, [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ], { json: true })

  let result: any
  try {
    let text = responseText.trim()
    if (text.startsWith("```")) {
      text = text.split("```")[1]
      if (text.startsWith("json")) {
        text = text.substring(4)
      }
    }
    result = JSON.parse(text)
  } catch (err) {
    result = { action: "clarify", question: "Could you please rephrase that?" }
  }

  if (result.question) {
    history.push({ role: "assistant", content: result.question })
  } else if (result.action === "generate") {
    history.push({ role: "assistant", content: "Generating deployment configurations now..." })
  }

  await c.env.SESSIONS.put(`deploy_chat:${sessionId}`, JSON.stringify(history), { expirationTtl: 1800 })

  result.session_id = sessionId
  return c.json(result)
})

app.post('/api/v1/deploy/generate', async (c) => {
  const req = await c.req.json()
  const manifest = req.manifest || {}
  const stack = req.stack || {}
  const answers = req.answers || {}

  return stream(c, async (streamWriter) => {
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('X-Accel-Buffering', 'no')

    const sse = (data: any) => `data: ${JSON.stringify(data)}\n\n`

    await streamWriter.write(sse({ type: "status", message: `Detected: ${stack.frontend} + ${stack.backend} + ${stack.db}` }))
    await streamWriter.write(sse({ type: "status", message: "Live documentation fetch bypassed (using built-in best practice templates)" }))
    await streamWriter.write(sse({ type: "status", message: "Generating config files..." }))

    try {
      const activeTargets = answers.targets === "all" ? stack.inferred_targets : [answers.targets || "vercel"]
      const prompt = `You are UniDeploy's DeployAgent. Generate production-ready deployment configuration files.

PROJECT STACK:
- Frontend: ${stack.frontend}
- Backend: ${stack.backend}
- Database: ${stack.db}
- Runtime: ${stack.runtime}
- Target platforms: ${activeTargets.join(", ")}

USER ANSWERS:
${JSON.stringify(answers, null, 2)}

SAMPLE PROJECT FILES (for context):
${JSON.stringify(Object.fromEntries(Object.entries(manifest.files || {}).slice(0, 10).map(([k, v]: any) => [k, v.slice(0, 500)])), null, 2)}

Generate ONLY the config files needed for the detected stack and targets. Output a JSON array:
[
  {
    "path": "vercel.json",
    "content": "...",
    "description": "Vercel deployment config"
  }
]

Rules:
- Only generate files for the active deployment targets
- Use environment variable placeholders (e.g. \${GCP_PROJECT_ID}) for secrets
- For vercel.json: include buildCommand, framework, regions, and any required rewrites
- For Cloud Run: generate cloudbuild.yaml with correct build + deploy steps
- For Railway: generate railway.toml
- For GitHub Actions: generate .github/workflows/deploy.yml
- Keep configs minimal — only what is required for the detected stack
- Never hardcode secrets, API keys, or project-specific values
- Output ONLY the JSON array, no markdown fences, no explanations`

      const responseText = await callAI(c.env, [
        { role: "system", content: "You are a deployment configuration generator. Generate ONLY JSON output." },
        { role: "user", content: prompt }
      ], { json: true })

      let text = responseText.trim()
      if (text.startsWith("```")) {
        text = text.split("```")[1]
        if (text.startsWith("json")) {
          text = text.substring(4)
        }
        text = text.substring(0, text.lastIndexOf("```"))
      }

      const configs = JSON.parse(text)
      for (const config of configs) {
        await streamWriter.write(sse({
          type: "config_file",
          path: config.path,
          content: config.content,
          description: config.description
        }))
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      await streamWriter.write(sse({ type: "complete", files_generated: configs.length }))
    } catch (err: any) {
      await streamWriter.write(sse({ type: "error", message: `Config generation failed: ${err.message}` }))
    }
  })
})

export default app
