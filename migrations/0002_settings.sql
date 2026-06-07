CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Default labels
INSERT OR IGNORE INTO settings (key, value) VALUES ('title', 'BNI Galaxy ST');
INSERT OR IGNORE INTO settings (key, value) VALUES ('loading', '載入中...');
INSERT OR IGNORE INTO settings (key, value) VALUES ('checkin', '簽到');
INSERT OR IGNORE INTO settings (key, value) VALUES ('noMeeting', '今日未有會議');
INSERT OR IGNORE INTO settings (key, value) VALUES ('noMeetingHint', '請到後台建立今日會議');
INSERT OR IGNORE INTO settings (key, value) VALUES ('allPeople', '全部名單');
INSERT OR IGNORE INTO settings (key, value) VALUES ('confirmTitle', '確認簽到？');
INSERT OR IGNORE INTO settings (key, value) VALUES ('cancel', '取消');
INSERT OR IGNORE INTO settings (key, value) VALUES ('confirm', '✓ 確認');
INSERT OR IGNORE INTO settings (key, value) VALUES ('paid', '已繳費');
INSERT OR IGNORE INTO settings (key, value) VALUES ('unpaid', '還未繳費');
INSERT OR IGNORE INTO settings (key, value) VALUES ('paidTri', '已繳費 / 已缴费 / Paid');
INSERT OR IGNORE INTO settings (key, value) VALUES ('unpaidTri', '還未繳費 / 还未缴费 / Unpaid');
INSERT OR IGNORE INTO settings (key, value) VALUES ('checkedInTri', '已簽到 / 已签到 / Checked In');
INSERT OR IGNORE INTO settings (key, value) VALUES ('memberLabel', '會員');
INSERT OR IGNORE INTO settings (key, value) VALUES ('guestLabel', '來賓');
INSERT OR IGNORE INTO settings (key, value) VALUES ('observerLabel', '觀察員');
INSERT OR IGNORE INTO settings (key, value) VALUES ('regular', '例會');
INSERT OR IGNORE INTO settings (key, value) VALUES ('special', '特別會議');
