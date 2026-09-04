-- Scans telemetry
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  session_id TEXT UNIQUE,
  code TEXT,
  status TEXT NOT NULL,
  project_name TEXT,
  framework TEXT,
  grade TEXT,
  total_issues INTEGER,
  auto_fixable INTEGER,
  files_scanned INTEGER,
  github_url TEXT,
  branch TEXT,
  pr_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  browser_connected_at TEXT
);

-- Individual findings
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  fix_guideline TEXT,
  evidence TEXT,
  auto_fixable BOOLEAN NOT NULL CHECK (auto_fixable IN (0, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(scan_id) REFERENCES scans(id) ON DELETE CASCADE
);

-- WebSocket message broker mailbox
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'cli' | 'browser'
  payload TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- App users
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'Free',
  scans_remaining INTEGER NOT NULL DEFAULT 10,
  tokens_remaining INTEGER NOT NULL DEFAULT 50000,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Deployed AI Model & Agent Microservices
CREATE TABLE IF NOT EXISTS deployed_models (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  framework TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
