-- BNI Galaxy ST Attendance Tracker Schema

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tel TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  professional TEXT DEFAULT '',
  tel TEXT DEFAULT '',
  invited_by TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS observers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  professional TEXT DEFAULT '',
  chapter TEXT DEFAULT '',
  invited_by TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'regular',
  collector TEXT DEFAULT '',
  guest_fee INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  person_type TEXT NOT NULL CHECK(person_type IN ('member','guest','observer')),
  person_id INTEGER NOT NULL,
  substitute TEXT DEFAULT '',
  payment TEXT DEFAULT '',
  payment_method TEXT DEFAULT '',
  arrival_time TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE INDEX idx_attendance_meeting ON attendance(meeting_id);
CREATE INDEX idx_attendance_person ON attendance(person_type, person_id);
CREATE INDEX idx_meetings_date ON meetings(date DESC);
