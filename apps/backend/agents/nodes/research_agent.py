import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
import json
from agents.llm import get_llm

logger = logging.getLogger("unideploy.research_agent")

from agents.mcp_client import LocalMCPClient

async def research_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Research Agent: Dynamically queries the local codebase via MCP to build deep context.
    """
    logger.info("Research Agent starting MCP context ingestion...")
    session_id = state.get("session_id")
    
    if not session_id:
        return {"current_agent": "research_agent", "error": "No session_id in state"}
        
    try:
        mcp = LocalMCPClient(session_id)
        
        # 1. Fetch the file list
        files = await mcp.list_files(".")
        
        # Filter for important files to read completely
        important_extensions = (".js", ".ts", ".tsx", ".py", ".json", ".md", ".env.example")
        critical_files = [f for f in files if f.endswith(important_extensions) and "node_modules" not in f][:30]
        
        # 2. Ingest contents of critical files
        code_context = []
        for file_path in critical_files:
            try:
                content = await mcp.read_file(file_path)
                # Truncate if insanely large just to be safe
                if len(content) > 20000:
                    content = content[:20000] + "\n...[TRUNCATED]"
                code_context.append(f"--- {file_path} ---\n{content}\n")
            except Exception as e:
                logger.warning(f"MCP failed to read {file_path}: {e}")
        
        full_context = "\n".join(code_context)
        
        llm = get_llm()
        
        system_msg = SystemMessage(
            content="You are a senior AppSec researcher. Analyze the following codebase context and summarize the key architectural components, authentication flows, and potential security vulnerabilities. Create a comprehensive markdown summary."
        )
        human_msg = HumanMessage(
            content=f"Here is the local codebase context pulled via MCP:\n{full_context}"
        )
        
        response = await llm.ainvoke([system_msg, human_msg])
        research_context = response.content
        
        logger.info("Research Agent completed context ingestion.")
        
        # Return the state update
        return {
            "current_agent": "research_agent",
            "messages": [{"role": "researcher", "content": research_context}]
        }
    except Exception as e:
        logger.error(f"Research agent failed: {e}")
        return {"current_agent": "research_agent", "error": str(e)}
