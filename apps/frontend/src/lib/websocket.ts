/**
 * UniDeploy messaging client — HTTP polling replacement for WebSocket.
 * Polls the Cloudflare Worker's /poll/browser/:sessionId endpoint
 * for messages from the CLI, and sends messages via /send/browser/:sessionId.
 */

export interface WSReportFinding {
  id: string
  file_path: string
  line_number?: number | null
  severity: string
  category: string
  title: string
  description: string
  fix_guideline: string
  evidence: string
  auto_fixable: boolean
}

export type WSMessage =
  | { type: 'cli_ready'; machine_name: string; project_manifest: Record<string, unknown> }
  | { type: 'finding'; finding: Finding }
  | { type: 'scan_complete'; grade: string; total_issues: number; auto_fixable: number; critical: number; high: number; medium: number; low: number }
  | { type: 'scan_progress'; files_scanned: number; total_files: number }
  | { type: 'session_authenticated'; session_id: string }
  | { type: 'browser_connected'; session_id: string }
  | { type: 'fix_applied'; finding_id: string; diff: string }
  | { type: 'fix_started'; finding_ids: string[]; count: number }
  | { type: 'fix_patches_applied'; fixed_ids: string[]; failed_ids: string[]; diff_summaries: string[] }
  | { type: 'rescan_done'; grade: string; total_issues: number; auto_fixable: number; critical: number; high: number; medium: number; low: number; fixed_ids: string[]; findings: WSReportFinding[] }
  | { type: 'pipeline_progress'; phase: string; message: string }
  | { type: 'deploy_configs_ready'; configs: Array<{ path: string; content: string; description: string }> }
  | { type: 'error'; message: string }

export interface Finding {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  title: string
  file: string
  line: number
  description: string
  auto_fixable: boolean
}

export interface ScanSummary {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  total: number
  auto_fixable: number
  critical: number
  high: number
  medium: number
  low: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/**
 * UniDeploySocket — HTTP polling client that mimics the WebSocket API.
 * Polls every 1.5s for new messages from the CLI via the worker.
 */
export class UniDeploySocket {
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private sessionId: string
  private onMessage: (msg: WSMessage) => void
  private onOpen?: () => void
  private onClose?: () => void
  private lastId = 0
  private connected = false

  constructor(
    sessionId: string,
    onMessage: (msg: WSMessage) => void,
    onOpen?: () => void,
    onClose?: () => void
  ) {
    this.sessionId = sessionId
    this.onMessage = onMessage
    this.onOpen = onOpen
    this.onClose = onClose
  }

  connect() {
    this.connected = true
    this.onOpen?.()

    // Start polling for messages from CLI
    this.pollInterval = setInterval(() => this.poll(), 1500)
    // Immediate first poll
    this.poll()
  }

  private async poll() {
    if (!this.connected) return

    try {
      const url = `${API_BASE}/poll/browser/${this.sessionId}${this.lastId ? `?since=${this.lastId}` : ''}`
      const res = await fetch(url)
      if (!res.ok) return

      const data = await res.json() as { messages: WSMessage[]; last_id: number }
      if (data.last_id) {
        this.lastId = data.last_id
      }

      for (const msg of data.messages) {
        this.onMessage(msg)
      }
    } catch {
      // Non-fatal — just retry on next interval
    }
  }

  sendApplyFix(findingIds: string[]) {
    fetch(`${API_BASE}/send/browser/${this.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'apply_fix', finding_ids: findingIds }),
    }).catch(err => console.error('Failed to send apply_fix:', err))
  }

  disconnect() {
    this.connected = false
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.onClose?.()
  }
}
