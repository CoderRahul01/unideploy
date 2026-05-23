from typing import TypedDict, Annotated, List, Any
import operator
from langgraph.graph import StateGraph, END
from pydantic import BaseModel

# --- Shared State ---
class AgentState(TypedDict):
    """The shared state between all agents in the graph."""
    session_id: str
    manifest: dict
    findings: List[dict]
    remediation_plans: List[dict]
    messages: Annotated[list, operator.add]
    current_agent: str
    error: str | None
    completed: bool

# We will implement the nodes separately and import them here.
from .nodes.research_agent import research_node
from .nodes.planning_agent import planning_node
from .nodes.coding_agent import coding_node
from .nodes.database_agent import database_node
from .nodes.memory_agent import memory_node

def route_next_agent(state: AgentState) -> str:
    """Determine the next step in the pipeline based on the current state."""
    if state.get("error"):
        return END
        
    current = state.get("current_agent")
    
    if current == "research_agent":
        return "planning_agent"
    elif current == "planning_agent":
        return "coding_agent"
    elif current == "coding_agent":
        return "database_agent"
    elif current == "database_agent":
        return "memory_agent"
    elif current == "memory_agent":
        return END
    
    # Default fallback
    return END

def build_graph() -> StateGraph:
    """Build and compile the multi-agent state graph."""
    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("research_agent", research_node)
    workflow.add_node("planning_agent", planning_node)
    workflow.add_node("coding_agent", coding_node)
    workflow.add_node("database_agent", database_node)
    workflow.add_node("memory_agent", memory_node)

    # Set Entry Point
    workflow.set_entry_point("research_agent")

    # Add Edges with dynamic routing
    workflow.add_conditional_edges("research_agent", route_next_agent)
    workflow.add_conditional_edges("planning_agent", route_next_agent)
    workflow.add_conditional_edges("coding_agent", route_next_agent)
    workflow.add_conditional_edges("database_agent", route_next_agent)
    workflow.add_conditional_edges("memory_agent", route_next_agent)

    # Compile the graph
    app = workflow.compile()
    return app
