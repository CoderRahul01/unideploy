#!/bin/bash
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-manifest-design-484007-m8}"
REGION="us-central1"

echo "Deploying UniDeploy agents to Gemini Agent Runtime..."
echo "Project: $PROJECT_ID"
echo ""

cd apps/backend

# Verify ADK is installed
pip show google-adk > /dev/null 2>&1 || pip install google-adk

# Verify adk_app.py loads correctly
python -c "from adk_app import root_agent; print(f'Agent: {root_agent.name}')" || {
  echo "ERROR: adk_app.py failed to import — fix errors above before deploying"
  exit 1
}

# Enable observability (Telemetry + Prompt logging)
export GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY=true
export OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true

# Deploy to Agent Runtime
# Agents become visible in Agent Studio:
# console.cloud.google.com -> Vertex AI -> Agent Builder -> Agents
adk deploy agent_engine \
  --project=$PROJECT_ID \
  --region=$REGION \
  --display_name="UniDeploy Scanner" \
  --description="Production-readiness scanner for vibe-coded apps — AnalyzerAgent + AutoFixAgent" \
  --otel_to_cloud \
  .

echo ""
echo "Agents deployed to Agent Runtime"
echo ""
echo "View in Agent Studio:"
echo "  https://console.cloud.google.com/vertex-ai/agents?project=$PROJECT_ID"
