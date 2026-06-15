CREATE TABLE IF NOT EXISTS telegram_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  filename TEXT,
  r2_key TEXT NOT NULL,
  content_type TEXT,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
