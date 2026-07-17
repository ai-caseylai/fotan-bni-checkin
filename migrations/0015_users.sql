-- User accounts for registration/login
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('staff', 'manager')),
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
