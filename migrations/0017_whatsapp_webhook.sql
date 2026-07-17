-- WhatsApp webhook tables
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  profile_name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT DEFAULT '',
  wa_msg_id TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_chat ON whatsapp_messages(chat_id, created_at);

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  wa_id TEXT PRIMARY KEY,
  profile_name TEXT DEFAULT '',
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_id TEXT NOT NULL,
  filename TEXT DEFAULT '',
  r2_key TEXT DEFAULT '',
  content_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_files_waid ON whatsapp_files(wa_id, created_at);
