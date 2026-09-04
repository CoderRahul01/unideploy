import { NextResponse } from "next/server";

export const runtime = "nodejs";

export interface SandboxTemplate {
  id: string;
  name: string;
  badge: string;
  category: "data" | "fullstack" | "terminal" | "security" | "automation";
  language: "python" | "js" | "bash";
  description: string;
  specs: {
    cpu: string;
    ram: string;
    os: string;
  };
  starterCode: string;
  outputType: "chart" | "text" | "json";
}

export const TEMPLATES: SandboxTemplate[] = [
  {
    id: "data-science",
    name: "Data Science & Plot Engine",
    badge: "Most Popular",
    category: "data",
    language: "python",
    description:
      "Python 3.11 with Pandas, NumPy, and Matplotlib. Automatically renders charts & plots directly in your browser or returns base64 images.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "chart",
    starterCode: `import matplotlib.pyplot as plt
import numpy as np

# Generate sample growth trajectory
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
active_users = [1200, 2400, 4800, 9100, 16200, 28500, 47000, 72000, 105000]
api_calls = [x * 14 for x in active_users]

plt.style.use('dark_background')
fig, ax1 = plt.subplots(figsize=(7, 3.5), dpi=120)

color = '#10b981'
ax1.set_xlabel('Timeline (2026)', color='#9ca3af', fontsize=10)
ax1.set_ylabel('Active Agents', color=color, fontsize=10)
line1 = ax1.plot(months, active_users, color=color, marker='o', linewidth=2.5, label='Active Agents')
ax1.tick_params(axis='y', labelcolor=color)

ax2 = ax1.twinx()
color2 = '#60a5fa'
ax2.set_ylabel('Sandbox Runs (x1000)', color=color2, fontsize=10)
line2 = ax2.plot(months, [x / 1000 for x in api_calls], color=color2, marker='s', linestyle='--', linewidth=2, label='Runs (k)')
ax2.tick_params(axis='y', labelcolor=color2)

plt.title('UniDeploy Cloud Sandbox Growth', color='#f3f4f6', fontsize=12, pad=12, fontweight='bold')
fig.tight_layout()
plt.show()

print(f"Total simulated runs: {sum(api_calls):,}")
print(f"Peak monthly active agents: {max(active_users):,}")
`,
  },
  {
    id: "node-runtime",
    name: "Node.js 20 & Modern JS",
    badge: "Fastest",
    category: "fullstack",
    language: "js",
    description:
      "Modern JavaScript engine with async/await, crypto, and ES modules for data pipelines and backend algorithms.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "text",
    starterCode: `// High-performance token and signature generation
const crypto = require('crypto');

function generateSecureSession(tenantId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const hash = crypto.createHmac('sha256', 'unideploy_e2b_secret')
                     .update(\`\${tenantId}:\${nonce}:\${timestamp}\`)
                     .digest('hex');

  return {
    tenantId,
    token: \`uni_sbx_\${hash.slice(0, 24)}\`,
    issuedAt: new Date(timestamp).toISOString(),
    sandboxRegion: 'us-east-firecracker',
    status: 'allocated'
  };
}

const sessions = ['acme-corp', 'fintech-agent', 'vibe-deployer'].map(generateSecureSession);
console.log('Allocated MicroVM Sessions:');
console.table(sessions);
`,
  },
  {
    id: "cloud-terminal",
    name: "Linux Cloud Terminal (Bash)",
    badge: "Root Shell",
    category: "terminal",
    language: "bash",
    description:
      "Disposable Ubuntu/Debian microVM bash terminal with curl, git, python, and node pre-installed.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "text",
    starterCode: `# Inspect the microVM environment
echo "=== System & Kernel ==="
uname -a
echo ""
echo "=== CPU & Memory Info ==="
lscpu | grep "Model name\|CPU(s):"
free -h
echo ""
echo "=== Installed Runtimes ==="
python3 --version
node --version
git --version
curl --version | head -n 1
`,
  },
  {
    id: "security-audit",
    name: "UniDeploy Vulnerability Scan",
    badge: "DevSecOps",
    category: "security",
    language: "python",
    description:
      "Security scanner engine searching for hardcoded API keys, JWT secrets, AWS tokens, and unauthenticated endpoints.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "json",
    starterCode: `import re
import json

SAMPLE_CONFIG = """
const config = {
  dbUrl: "postgres://admin:superSecretPassword123@db.prod.internal:5432/main",
  stripeKey: "PLACEHOLDER_STRIPE_SECRET_KEY_EXPOSED_9999",
  awsSecret: "AKIA_SAMPLE_AWS_ACCESS_KEY_DO_NOT_USE",
  supabaseAnon: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature",
  enableDebug: true
};
"""

PATTERNS = {
  "Stripe Secret Key (Exposed)": r"PLACEHOLDER_STRIPE_[0-9A-Z_]+",
  "PostgreSQL URI Password": r"postgres://[^:]+:([^@]+)@",
  "AWS Key (Exposed)": r"AKIA_[0-9A-Z_]+",
}

findings = []
for name, regex in PATTERNS.items():
    matches = re.finditer(regex, SAMPLE_CONFIG)
    for m in matches:
        findings.append({
            "severity": "CRITICAL",
            "type": name,
            "match": m.group(0)[:8] + "..." + m.group(0)[-4:],
            "remediation": "Move credential into secret store (e.g. Doppler, Infisical, or GCP Secret Manager)"
        })

report = {
    "status": "COMPLETED",
    "scanned_lines": len(SAMPLE_CONFIG.splitlines()),
    "critical_findings": len(findings),
    "findings": findings
}

print(json.dumps(report, indent=2))
`,
  },
  {
    id: "web-scraper",
    name: "Web Scraper & Metadata Extractor",
    badge: "Automation",
    category: "automation",
    language: "python",
    description:
      "Scrapes remote web endpoints, parses meta tags, open graph metadata, and security headers.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "text",
    starterCode: `import urllib.request
import re

url = "https://news.ycombinator.com"
req = urllib.request.Request(url, headers={'User-Agent': 'UniDeploySandbox/1.0'})

with urllib.request.urlopen(req) as response:
    html = response.read().decode('utf-8')
    headers = dict(response.info())

# Extract titles from Hacker News frontpage
titles = re.findall(r'<span class="titleline"><a [^>]*>([^<]+)</a>', html)

print(f"Target: {url}")
print(f"HTTP Status: 200 OK | Content Length: {len(html):,} bytes")
print(f"Server: {headers.get('Server', 'Unknown')}")
print("\\nTop 5 Stories:")
for i, title in enumerate(titles[:5], 1):
    print(f" {i}. {title}")
`,
  },
];

export async function GET() {
  return NextResponse.json(
    {
      service: "UniDeploy Sandbox Marketplace",
      provider: "E2B Firecracker microVMs",
      templates: TEMPLATES,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
