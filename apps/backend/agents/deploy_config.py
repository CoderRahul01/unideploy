"""
Gemini Enterprise Agent Platform deployment configuration.

Deploy with:
  adk deploy agent_engine --project=$GOOGLE_CLOUD_PROJECT --region=us-central1 .

This deploys UniDeploy's agents to Agent Runtime (managed, serverless).
Each scan job becomes an isolated Agent Runtime session.
"""

import os

DEPLOYMENT_CONFIG = {
    # BUILD — agent definitions
    "agents": {
        "analyzer": {
            "name": "UniDeployAnalyzer",
            "model": "gemini-2.5-flash",
            "description": "Scans project files for production-readiness issues",
            "max_tokens": 8192,
        },
        "autofix": {
            "name": "UniDeployAutoFix",
            "model": "gemini-2.5-pro",
            "description": "Generates verified patches for identified issues",
            "max_tokens": 4096,
        },
    },

    # SCALE — Agent Runtime settings
    "runtime": {
        "min_instances": 0,
        "max_instances": 10,
        "timeout_seconds": 300,
        "memory": "2Gi",
        "cpu": "1",
        "region": os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
    },

    # GOVERN — Model Armor protects against prompt injection from user repos
    "model_armor": {
        "enabled": True,
        "block_prompt_injection": True,
        "block_data_exfiltration": True,
        "sanitize_inputs": True,
    },

    # OPTIMIZE — observability
    "observability": {
        "cloud_trace_enabled": True,
        "cloud_logging_enabled": True,
        "log_level": "INFO",
        "metrics_prefix": "unideploy/agents",
    },
}

LOCAL_CONFIG = {
    "use_vertex_ai": os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "FALSE") == "TRUE",
    "project": os.getenv("GOOGLE_CLOUD_PROJECT", "manifest-design-484007-m8"),
    "location": os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
    "api_key": os.getenv("GEMINI_API_KEY", ""),
}
