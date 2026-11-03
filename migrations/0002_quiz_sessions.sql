CREATE TABLE quiz_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  question_count INTEGER NOT NULL CHECK (question_count IN (3, 5, 10)),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= question_count),
  answered_count INTEGER NOT NULL DEFAULT 0 CHECK (answered_count >= 0 AND answered_count <= question_count),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);
CREATE INDEX quiz_sessions_expires_at_idx ON quiz_sessions(expires_at);
CREATE INDEX quiz_sessions_user_id_idx ON quiz_sessions(user_id, created_at DESC);

CREATE TABLE quiz_session_questions (
  session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  position INTEGER NOT NULL CHECK (position >= 0),
  answered INTEGER NOT NULL DEFAULT 0 CHECK (answered IN (0, 1)),
  was_correct INTEGER CHECK (was_correct IN (0, 1)),
  PRIMARY KEY (session_id, question_id),
  UNIQUE (session_id, position)
);

ALTER TABLE quiz_runs ADD COLUMN session_id TEXT REFERENCES quiz_sessions(id);
CREATE UNIQUE INDEX quiz_runs_session_id_idx ON quiz_runs(session_id) WHERE session_id IS NOT NULL;
