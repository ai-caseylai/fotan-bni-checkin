-- WhatsApp 憑證上傳

CREATE TABLE IF NOT EXISTS whatsapp_cert (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_number TEXT NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  comment TEXT DEFAULT '',
  note TEXT DEFAULT '',
  content_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
