ALTER TABLE questions ADD COLUMN ai_review_due_at TEXT;
ALTER TABLE questions ADD COLUMN ai_reviewed_at TEXT;
ALTER TABLE questions ADD COLUMN ai_review_action TEXT;
ALTER TABLE questions ADD COLUMN ai_review_note TEXT;

CREATE INDEX questions_ai_review_due_idx ON questions(status, ai_review_due_at);
