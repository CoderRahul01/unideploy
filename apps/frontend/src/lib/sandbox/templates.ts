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
    name: "Google Colab Alternative (Python Data Science)",
    badge: "Persistent MicroVM",
    category: "data",
    language: "python",
    description:
      "Persistent Python data science stack with NumPy, Pandas, and Matplotlib. Never randomly disconnects or drops kernel state. Renders high-DPI charts directly in your browser.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "chart",
    starterCode: `import matplotlib.pyplot as plt
import numpy as np

# UniDeploy Cloud Sandbox — Persistent Python Data Science Kernel
# Unlike Google Colab, your execution state never disconnects unexpectedly mid-analysis.

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
    id: "agent-code-interpreter",
    name: "AI Agent Code Interpreter (Tool Execution)",
    badge: "OpenAI / Claude Tool",
    category: "automation",
    language: "python",
    description:
      "Safe sandboxed code execution for AI agents built with LangChain, CrewAI, AutoGen, or OpenAI function calling. Executes arbitrary LLM code with 0 security risk to host servers.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "json",
    starterCode: `import json
import math

# AI Agent Code Interpreter Simulation
# Safe execution harness for LLM function calling and autonomous agents

def execute_agent_task(query: str, raw_data: list):
    """
    Computes statistical indicators and forecasts from dynamic agent queries.
    Safely executed inside an isolated UniDeploy microVM.
    """
    n = len(raw_data)
    mean_val = sum(raw_data) / n
    variance = sum((x - mean_val) ** 2 for x in raw_data) / n
    std_dev = math.sqrt(variance)
    
    # 3-period moving average forecast
    moving_avg = [sum(raw_data[i:i+3])/3 for i in range(len(raw_data)-2)]
    
    return {
        "query": query,
        "sample_size": n,
        "mean": round(mean_val, 2),
        "std_dev": round(std_dev, 2),
        "latest_forecast": round(moving_avg[-1], 2),
        "execution_status": "COMPLETED_ISOLATED",
        "sandbox_isolation": "MicroVM (Zero Host Access)"
    }

# Agent receives unstructured numbers from user prompt
sample_dataset = [1240, 1380, 1420, 1590, 1720, 1680, 1850, 1990, 2150]
result = execute_agent_task("Analyze Q3 token usage surge and project Q4 baseline", sample_dataset)

print(json.dumps(result, indent=2))
`,
  },
  {
    id: "agent-scraper",
    name: "Headless Web Scraper & RAG Ingestion",
    badge: "ETL / RAG Pipeline",
    category: "automation",
    language: "python",
    description:
      "Overcomes Vercel and Cloudflare Worker serverless timeouts. Scrapes dynamic web endpoints, parses meta tags, and outputs clean markdown for LLM ingestion.",
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
  {
    id: "model-deploy",
    name: "AI Model Deployment & Composio Hook",
    badge: "Instant REST API",
    category: "automation",
    language: "python",
    description:
      "Deploy lightweight AI models (PyTorch, ONNX, Scikit, small LLMs) into private Firecracker microVMs with sub-2s boots, edge rate limits, and Composio multi-platform tool actions.",
    specs: { cpu: "2 vCPUs", ram: "2 GB", os: "Debian 13 Firecracker" },
    outputType: "json",
    starterCode: `import json
import uuid
from datetime import datetime

# UniDeploy AI Model Deployment & Composio Action Hook
# Deploy lightweight models (PyTorch, ONNX, Scikit, small LLMs) into private Firecracker microVMs

def deploy_ai_model(model_name: str, framework: str = "onnx-runtime"):
    model_id = f"mod_{uuid.uuid4().hex[:10]}"
    api_key = f"uni_live_{uuid.uuid4().hex[:24]}"
    
    deployment = {
        "status": "HEALTHY_ACTIVE",
        "model_id": model_id,
        "model_name": model_name,
        "framework": framework,
        "isolation": "Debian 13 Firecracker MicroVM (Dedicated Kernel)",
        "endpoint_url": f"https://api.unideploy.in/v1/models/{model_id}/invoke",
        "rate_limit": {
            "algorithm": "token_bucket",
            "capacity": 100,
            "refill_rate_per_sec": 5,
            "burst_allowance": 20,
            "headers": ["X-RateLimit-Remaining", "Retry-After"]
        },
        "zero_downtime_hot_swap": True,
        "composio_integration": {
            "status": "READY",
            "connected_tools": ["slack", "github", "linear"],
            "action_trigger": "Automatic webhook on anomaly detection"
        },
        "api_key": api_key[:14] + "..." + api_key[-4:],
        "sample_curl": f"curl -X POST https://api.unideploy.in/v1/models/{model_id}/invoke -H 'Authorization: Bearer {api_key}' -d '{{\\"input\\": \\"High latency observed in payment gateway\\"}}'"
    }
    return deployment

result = deploy_ai_model("sentiment-anomaly-detector", framework="scikit-learn")
print(json.dumps(result, indent=2))
`,
  },
  {
    id: "cloud-terminal",
    name: "Linux Cloud Terminal (Root Bash)",
    badge: "Disposable Shell",
    category: "terminal",
    language: "bash",
    description:
      "Disposable Ubuntu/Debian microVM bash terminal with curl, git, python, and node. Completely isolated for testing untrusted scripts and curls.",
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
];
