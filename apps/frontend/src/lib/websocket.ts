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

  sendApplyFix(findingIds: string[]) {
    this.ws?.send(JSON.stringify({ type: 'apply_fix', finding_ids: findingIds }))
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }
}
