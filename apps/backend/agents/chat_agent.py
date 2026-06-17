from typing import Dict, Any, List
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from agents.llm import get_llm
from agents.mcp_client import LocalMCPClient
import asyncio

try:
    from langchain.agents import AgentExecutor
except ImportError:
    from langchain_classic.agents import AgentExecutor

def create_mcp_tools(session_id: str):
    client = LocalMCPClient(session_id)

    @tool
    async def list_files(directory: str = ".") -> str:
        """List all files in the current workspace recursively, respecting ignore configurations."""
        try:
            files = await client.list_files(directory)
            return "\n".join(files) if files else "No files found."
        except Exception as e:
            return f"Error listing files: {str(e)}"

    @tool
    async def read_file(filePath: str) -> str:
        """Read the full content of a file. The content is automatically sanitized and redacted locally to remove secrets before leaving the client machine."""
        try:
            content = await client.read_file(filePath)
            return content if content else "File is empty or could not be read."
        except Exception as e:
            return f"Error reading file: {str(e)}"

    return [list_files, read_file]

async def answer_chat_query(message: str, session_id: str) -> str:
    """Uses a tool-calling LLM agent to inspect the local repository (via MCP) and answer the user query."""
    llm = get_llm()
    tools = create_mcp_tools(session_id)
    
    # Bind tools to OpenAI tools compatible LLM (Gemini via LiteLLM/direct supports this)
    llm_with_tools = llm.bind_tools(tools)

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are the UniDeploy Conversational Agent. You help developers check their projects for production-readiness, "
            "security vulnerabilities, configuration mistakes, and structural errors.\n"
            "You have access to the local codebase through tools list_files and read_file. "
            "Note that all secret keys, credentials, and sensitive tokens are automatically redacted locally on the developer's "
            "machine before they reach you (appearing as [REDACTED_...]). If you see redacted placeholders, acknowledge that the "
            "secrets are correctly sanitized on disk but should be migrated to a secure vault like 1Claw.\n"
            "Be concise, clear, and direct. Support markdown formatting in your response."
        )),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # We run a simple tool-calling agent executor
    try:
        from langchain.agents.format_scratchpad.openai_tools import format_to_openai_tool_messages
        from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
    except ImportError:
        from langchain_classic.agents.format_scratchpad.openai_tools import format_to_openai_tool_messages
        from langchain_classic.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser

    agent = (
        {
            "input": lambda x: x["input"],
            "agent_scratchpad": lambda x: format_to_openai_tool_messages(x["intermediate_steps"]),
        }
        | prompt
        | llm_with_tools
        | OpenAIToolsAgentOutputParser()
    )

    executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    # Run the executor natively async
    result = await executor.ainvoke({"input": message})
    return result.get("output", "Could not produce an answer.")
