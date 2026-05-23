# Architecture Plan

## Phase 1: Tech Stack Migration
- Remove Google ADK
- Introduce LangGraph and LangChain
- Dockerize backend

## Phase 2: Multi-Agent Implementation
- Orchestrator (LangGraph)
- Planner Agent
- Coder Agent (E2B)
- Researcher Agent (Composio/MCP)
- Database Agent (InsForge)
- Memory Agent (Redis)

## Phase 3: Deployment
- Deploy to Railway/DigitalOcean using Docker
- Redis for Pub/Sub and Memory Checkpointing
