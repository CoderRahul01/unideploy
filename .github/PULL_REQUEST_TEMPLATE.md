## Description

Please describe the changes proposed in this pull request and the rationale behind them.

- Resolves: #[issue-number]

---

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] ⚡ Performance optimization or refactor
- [ ] 🧪 Tests or CI workflow enhancement

---

## Workspaces Affected

- [ ] `packages/cli` — CLI client (`unideploy`)
- [ ] `apps/frontend` — Next.js web application & dashboard
- [ ] `apps/worker` — Cloudflare Worker edge gateway & API
- [ ] `apps/desktop` — Native macOS desktop application (.dmg)
- [ ] `apps/mcp` — Model Context Protocol server
- [ ] `packages/ai` or `packages/agent` — AI engine & agent harness
- [ ] Root / Documentation

---

## 7EDGE Code Standards & Quality Checklist

- [ ] **TypeScript Strict Mode**: Code compiles cleanly with zero `any` types (`npm run check`).
- [ ] **British English**: All user-facing strings, comments, and documentation adhere to British English spelling (e.g. *optimised*, *visualisation*).
- [ ] **Actionable Error Messaging**: Any new error conditions return clear guidance on next steps.
- [ ] **Local Validation**: Tested locally across target surfaces.
- [ ] **PR Discipline**: Created from a feature/bugfix branch; target branch is `main`.
