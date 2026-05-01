# UniDeploy Agent Architecture

## Agent Graph

UniDeploy uses Google's Agent Development Kit (ADK) to define a directed graph of specialized agents.

```
User triggers scan
       │
       ▼
[AnalyzerAgent] ──Flash──► structured findings JSON
       │
       ▼
[BuildAgent] ──Flash + E2B──► build success/fail + errors
       │
       ├─── if build fails ──► return build errors as findings
       │
       ▼
[AutoFixAgent] ──Pro/Flash (routed)──► verified patches
       │
       ▼
[PatchAgent] ──Composio──► PR opened on GitHub
       │
       ▼
[MemoryAgent] ──Supermemory──► store scan context for next run
```

## Agent Details

### 1. AnalyzerAgent
- **Model:** `gemini-2.5-flash` (pattern matching, not reasoning — 10x cheaper)
- **Input:** Project manifest, file contents, previous scan context from Supermemory
- **Output:** Structured JSON with findings per the 13 check categories
- **Why Flash:** I/O-bound pattern matching against known rules, not creative reasoning

### 2. BuildAgent
- **Model:** `gemini-2.5-flash` (orchestrator) + E2B Firecracker sandbox (executor)
- **Input:** Project files
- **Output:** Build success/fail, errors, missing env vars
- **Purpose:** 40%+ of vibe-coded projects don't build cleanly. Catch this before wasting Pro tokens on fixes.

### 3. AutoFixAgent
- **Model:** Routes by fix type:
  - `gemini-2.5-flash` for mechanical fixes (move secret to .env, add security header)
  - `gemini-2.5-pro` for logic-heavy fixes (auth middleware, RLS policies, CORS config)
- **Input:** Finding + relevant file contents
- **Output:** Unified diff patch, verified against BuildAgent

### 4. PatchAgent
- **Model:** None. Pure execution — no LLM needed.
- **Tools:** Composio GitHub toolkit (`GITHUB_CREATE_BRANCH`, `GITHUB_CREATE_COMMIT`, `GITHUB_CREATE_PULL_REQUEST`)
- **Input:** Approved patches
- **Output:** PR URL

### 5. MemoryAgent
- **Model:** None. Pure retrieval/storage via Supermemory API.
- **Stores:** Previous scan findings, user dismissals, project fingerprint, false positives
- **Purpose:** Makes each scan faster and more personalized (incremental)

## Gemini Platform Pillar Mapping

| Pillar | Google Component | UniDeploy Usage |
|---|---|---|
| **Build** | ADK, Agent Studio, Model Garden | Agent graph definition, model selection |
| **Scale** | Agent Runtime, Sessions, Memory Bank | Each scan = one session, Memory Bank persists cross-scan state |
| **Govern** | Model Armor, Agent Identity, Agent Gateway | Anti-prompt-injection, audit trail, per-tenant policy |
| **Optimize** | Agent Simulation, Evaluation, Observability | Test rules against sample corpus, latency tracking |

## Model Routing Logic

```python
def select_model(finding):
    mechanical_fixes = ["move_to_env", "add_gitignore", "add_security_header", "add_missing_index"]
    if finding["fix_type"] in mechanical_fixes:
        return "gemini-2.5-flash"  # Cheap, deterministic
    else:
        return "gemini-2.5-pro"    # Complex reasoning needed
```

## Security Grade Calculation

```
Grade A: 0 Critical, 0 High, ≤ 2 Medium
Grade B: 0 Critical, ≤ 2 High, ≤ 5 Medium
Grade C: 0 Critical, ≤ 5 High, any Medium
Grade D: 1–2 Critical, any High/Medium
Grade F: 3+ Critical, OR secrets in client bundle, OR RLS disabled on user tables
```
