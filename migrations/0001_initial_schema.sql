PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  nickname_normalized TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE oauth_states (
  state TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX oauth_states_expires_at_idx ON oauth_states(expires_at);

CREATE TABLE banned_names (
  id TEXT PRIMARY KEY,
  phrase TEXT NOT NULL,
  phrase_normalized TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  canonical_url TEXT NOT NULL UNIQUE,
  publisher TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  topic TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'drafted', 'skipped'))
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source2_title TEXT,
  source2_url TEXT,
  requires_second_source INTEGER NOT NULL DEFAULT 0 CHECK (requires_second_source IN (0, 1)),
  source_published_at TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'rejected', 'retired')),
  suggested_by TEXT NOT NULL DEFAULT 'manual',
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  stale_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX questions_status_idx ON questions(status, source_published_at);
CREATE INDEX questions_story_id_idx ON questions(story_id);

CREATE TABLE quiz_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  question_count INTEGER NOT NULL CHECK (question_count IN (3, 5, 10)),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0 AND correct_count <= question_count),
  completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX quiz_runs_user_completed_idx ON quiz_runs(user_id, completed_at DESC);
CREATE INDEX quiz_runs_global_score_idx ON quiz_runs(correct_count DESC, question_count, completed_at DESC);

CREATE TABLE user_best_scores (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  best_percent INTEGER NOT NULL CHECK (best_percent >= 0 AND best_percent <= 100),
  best_correct INTEGER NOT NULL,
  best_question_count INTEGER NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
