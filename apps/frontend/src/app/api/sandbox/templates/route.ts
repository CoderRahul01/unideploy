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
    id: "colab-python",
    name: "Google Colab Alternative (Python 3.11)",
    badge: "Persistent MicroVM",
    category: "data",
    language: "python",
    description:
      "Persistent Python 3.11 data science stack with NumPy, Pandas, and Matplotlib. Never randomly disconnects or drops kernel state. Renders high-DPI charts directly in your browser.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "chart",
    starterCode: `import matplotlib.pyplot as plt
import numpy as np

# UniDeploy Cloud Sandbox - Persistent Python 3.11 Data Science Kernel
# Unlike Google Colab, your execution state never disconnects unexpectedly.

time_steps = np.linspace(0, 10, 100)
signal = np.sin(time_steps) * np.exp(-0.1 * time_steps)
noise = np.random.normal(0, 0.05, 100)
measured = signal + noise

plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(8, 4), dpi=130)

ax.plot(time_steps, signal, color='#22C55E', linewidth=2.5, label='Damped Wave (Ground Truth)')
ax.scatter(time_steps, measured, color='#60a5fa', s=16, alpha=0.7, label='Measured Data Points')

ax.set_title('UniDeploy Persistent Python Compute Engine', color='#f3f4f6', fontsize=12, pad=12, fontweight='bold')
ax.set_xlabel('Time (seconds)', color='#9ca3af', fontsize=10)
ax.set_ylabel('Amplitude', color='#9ca3af', fontsize=10)
ax.grid(True, linestyle='--', alpha=0.2)
ax.legend(facecolor='#161F16', edgecolor='#202E22')

fig.tight_layout()
plt.show()

print(f"Computed {len(time_steps)} steps with mean signal amplitude: {np.mean(signal):.4f}")
print("Status: Kernel session active and persistent across re-runs.")
`,
  },
  {
    id: "model-deploy",
    name: "AI Model & Agent Serverless Deployment",
    badge: "Instant API Key",
    category: "automation",
    language: "python",
    description:
      "Deploy custom AI agents, pipelines, or inference logic into an isolated microVM. Exposes a live HTTP endpoint with bearer API key authentication.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "json",
    starterCode: `import json
import uuid
from datetime import datetime

# Simulating a microVM agent endpoint deployment
def deploy_model_endpoint(model_name, framework="fastapi"):
    endpoint_id = f"mod_{uuid.uuid4().hex[:12]}"
    api_key = f"uni_live_{uuid.uuid4().hex}"
    
    deployment_record = {
        "status": "DEPLOYED",
        "model_id": endpoint_id,
        "model_name": model_name,
        "framework": framework,
        "api_key": api_key[:14] + "..." + api_key[-4:],
        "endpoint_url": f"https://api.unideploy.in/v1/models/{endpoint_id}/invoke",
        "compute_region": "in-mumbai-zone1",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "latency_sla_ms": 45,
        "supported_methods": ["POST"],
        "sample_curl": f"curl -X POST https://api.unideploy.in/v1/models/{endpoint_id}/invoke -H 'Authorization: Bearer {api_key}' -d '{\\"prompt\\": \\"Hello model\\"}'"
    }
    return deployment_record

deployment = deploy_model_endpoint("llama-3-agent-pipeline", framework="fastapi")
print(json.dumps(deployment, indent=2))
`,
  },
  {
    id: "node-runtime",
    name: "Node.js 20 & High-Concurrency Backend",
    badge: "Fastest Sub-Second",
    category: "fullstack",
    language: "js",
    description:
      "Modern JavaScript engine with async/await, crypto, and ES modules for microservices, webhooks, and backend algorithms.",
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
    sandboxRegion: 'in-mumbai-firecracker',
    status: 'allocated'
  };
}

const sessions = ['acme-corp', 'fintech-agent', 'model-service'].map(generateSecureSession);
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
lscpu | grep "Model name\\|CPU(s):"
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
    id: "agent-scraper",
    name: "Autonomous Web Scraper & Ingestion Pipeline",
    badge: "ETL / RAG",
    category: "automation",
    language: "python",
    description:
      "Scrapes remote web endpoints, parses meta tags, open graph metadata, and extracts clean markdown for LLM ingestion.",
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
