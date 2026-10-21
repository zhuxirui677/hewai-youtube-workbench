CREATE TABLE IF NOT EXISTS ai_video_workflows (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_video_workflows_updated_at_idx
  ON ai_video_workflows(updated_at);
