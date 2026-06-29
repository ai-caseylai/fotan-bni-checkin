-- 憑證/文件上傳支援

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_type TEXT NOT NULL CHECK(person_type IN ('member','guest','observer','attendance')),
  person_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  label TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX idx_documents_person ON documents(person_type, person_id);
