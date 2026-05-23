# Research Notes

## Multi-Agent Frameworks
- **CrewAI**: Great for role-playing agents but less flexible for highly stateful, developer-driven workflows.
- **LangGraph**: Excellent for cyclic graphs, state management, and explicit routing. Better suited for production security scanning pipelines.

## Memory & Caching
- **Redis**: Will be used for fast internal communication, rate limiting, and session WebSockets. Can also be used as a LangGraph checkpointer (`langgraph-checkpoint-redis`).

## Deployment
- **Docker**: The backend will be containerized.
- **Railway/Render**: Simple PaaS options with native Docker support. Ideal for initial multi-agent rollout.
- **DigitalOcean Kubernetes**: Target for highly scalable "Real Production" later down the line.
