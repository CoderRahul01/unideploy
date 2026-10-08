# Security Policy

UniDeploy is committed to maintaining the highest security and isolation standards across our cloud microVMs, edge gateway, desktop application, and developer tooling.

---

## 🔒 Supported Versions

We actively release security patches and updates for the following versions:

| Component | Supported Versions | Status |
|---|---|---|
| CLI (`unideploy`) | `>= 0.2.0` | Supported |
| Web Platform (`apps/frontend`) | Latest production deploy | Supported |
| Edge API (`apps/worker`) | Latest Cloudflare Worker release | Supported |
| macOS Desktop (`apps/desktop`) | `>= 0.2.0` | Supported |
| MCP Server (`apps/mcp`) | `>= 0.1.0` | Supported |

---

## 🛡️ Security Architecture & Isolation Guarantees

1. **Firecracker MicroVM Virtualization**: Every sandbox session runs inside an isolated Amazon Firecracker lightweight microVM. Sandboxed code cannot inspect other tenant processes, escape the hypervisor, or mutate host environments.
2. **Credential Redaction**: The CLI and web platforms actively redact potential API keys, passwords, and tokens from terminal and telemetry outputs.
3. **Local Filesystem Permissions**: Local tokens in `~/.unideploy/auth.json` are written with strict `0600` permissions (readable only by the local user process).
4. **Edge Gateway TLS**: All external traffic is routed through Cloudflare Workers with strict TLS 1.3 encryption and automated DDoS protection.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in UniDeploy, please report it responsibly:

- **Do NOT** open a public GitHub issue.
- **Email**: Send your findings directly to [security@unideploy.in](mailto:security@unideploy.in).
- **Include**:
  - Detailed description of the vulnerability.
  - Steps to reproduce or proof-of-concept (PoC).
  - Potential impact and affected surfaces.

### Our Commitment
- We will acknowledge receipt of your vulnerability report within **24 hours**.
- We will provide an estimated triage and fix timeline within **48 hours**.
- We will coordinate public disclosure with you once a patch is verified and deployed.
