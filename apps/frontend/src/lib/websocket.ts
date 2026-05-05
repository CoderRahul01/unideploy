export type WSMessage =
  | { type: 'cli_ready'; machine_name: string; project_manifest: Record<string, unknown> }
  | { type: 'finding'; finding: Finding }
  | { type: 'scan_complete'; summary: ScanSummary }
  | { type: 'scan_progress'; files_scanned: number; total_files: number }
  | { type: 'session_authenticated'; session_id: string }
  | { type: 'browser_connected'; session_id: string }
  | { type: 'fix_applied'; finding_id: string; diff: string }
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

export class UniDeploySocket {
  private ws: WebSocket | null = null
  private sessionId: string
  private onMessage: (msg: WSMessage) => void
  private onOpen?: () => void
  private onClose?: () => void

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
    const base = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'
    this.ws = new WebSocket(`${base}/ws/browser/${this.sessionId}`)

    this.ws.onopen = () => this.onOpen?.()
    this.ws.onclose = () => this.onClose?.()
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage
        this.onMessage(msg)
      } catch {
        console.error('Failed to parse WS message', event.data)
      }
    }
  }

  sendApplyFix(findingId: string) {
    this.ws?.send(JSON.stringify({ type: 'apply_fix', finding_id: findingId }))
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }
}
