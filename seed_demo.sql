-- Seed data for SeatingPlan Demo
-- 1 demo meeting + 5 committee + 10 members + 5 VIP guests + 10 regular guests = 30 people

-- Update settings for demo
INSERT OR REPLACE INTO settings (key, value) VALUES ('title', '座位表示範');
INSERT OR REPLACE INTO settings (key, value) VALUES ('loading', '載入中...');
INSERT OR REPLACE INTO settings (key, value) VALUES ('checkin', '簽到');
INSERT OR REPLACE INTO settings (key, value) VALUES ('noMeeting', '今日未有會議');
INSERT OR REPLACE INTO settings (key, value) VALUES ('noMeetingHint', '請到後台建立今日會議');
INSERT OR REPLACE INTO settings (key, value) VALUES ('allPeople', '全部名單');
INSERT OR REPLACE INTO settings (key, value) VALUES ('confirmTitle', '確認簽到？');
INSERT OR REPLACE INTO settings (key, value) VALUES ('cancel', '取消');
INSERT OR REPLACE INTO settings (key, value) VALUES ('confirm', '✓ 確認');
INSERT OR REPLACE INTO settings (key, value) VALUES ('paid', '已繳費');
INSERT OR REPLACE INTO settings (key, value) VALUES ('unpaid', '還未繳費');
INSERT OR REPLACE INTO settings (key, value) VALUES ('paidTri', '已繳費 / 已缴费 / Paid');
INSERT OR REPLACE INTO settings (key, value) VALUES ('unpaidTri', '還未繳費 / 还未缴费 / Unpaid');
INSERT OR REPLACE INTO settings (key, value) VALUES ('checkedInTri', '已簽到 / 已签到 / Checked In');
INSERT OR REPLACE INTO settings (key, value) VALUES ('memberLabel', '會員');
INSERT OR REPLACE INTO settings (key, value) VALUES ('guestLabel', '來賓');
INSERT OR REPLACE INTO settings (key, value) VALUES ('observerLabel', '觀察員');
INSERT OR REPLACE INTO settings (key, value) VALUES ('regular', '例會');
INSERT OR REPLACE INTO settings (key, value) VALUES ('special', '特別會議');
INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', 'admin888');

-- Demo meeting (#1) — set to a future Friday
INSERT INTO meetings (id, date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee)
VALUES (1, '2026-07-10', 'regular', 'Mabel Lam', 398, 398, 220, 398, 398);

-- =====================
-- Committee (5 people, role=主席/副主席/秘書長/幹事, all paid $220)
-- =====================
INSERT INTO members (id, name, tel, professional, role, fee_paid_date, active) VALUES
(1,  '陳大明 Daniel Chan',    '91234567', '家加洗衣服務',     '主席',   '2026-07-01', 1),
(2,  '黃建明 Dean Huang',     '92345678', '香港印俠',         '副主席', '2026-07-02', 1),
(3,  '賴志偉 Joey Lai',       '93456789', '麵包供應商',       '副主席', '2026-07-01', 1),
(4,  '蘇敏儀 Jane So',        '94567890', '西裝服飾',         '秘書長', '2026-07-03', 1),
(5,  '林美寶 Mabel Lam',      '95678901', '會計師事務所',     '幹事',   '2026-07-02', 1);

-- =====================
-- Members (10 people, some paid some unpaid)
-- =====================
INSERT INTO members (id, name, tel, professional, role, fee_paid_date, active) VALUES
(6,  '鍾志明 Michael Chung',  '96789012', '物聯網方案',       '會員',   '2026-07-05', 1),
(7,  '陳志強 Jacky Chan',     '97890123', '裝修工程',         '會員',   '2026-07-04', 1),
(8,  '李志豪 Jones Li',       '98901234', '室內設計',         '會員',   '2026-07-05', 1),
(9,  '王偉文 Steven Wong',    '99012345', '顏色管理顧問',     '會員',   '',           1),
(10, '羅榮輝 Law Wing Fung',  '90123456', '廣告安裝工程',     '會員',   '',           1),
(11, '張雅詩 Ada Cheung',     '91230987', '歐洲木地板',       '會員',   '2026-07-06', 1),
(12, '何淑儀 Emily Ho',       '92340987', '保險顧問',         '會員',   '2026-07-06', 1),
(13, '劉俊傑 David Lau',      '93450987', '網頁設計',         '會員',   '',           1),
(14, '鄭嘉欣 Karen Cheng',    '94560987', '市場推廣',         '會員',   '2026-07-05', 1),
(15, '馮國強 Ken Fung',       '95670987', '移動屏風租賃',     '會員',   '2026-07-04', 1);

-- =====================
-- VIP Guests (5 people, vip=1, free — no charge)
-- =====================
INSERT INTO guests (id, name, professional, tel, meeting_id, vip, active) VALUES
(1, '梁子穎 MH',              '立法會議員',         '91000001', 1, 1, 1),
(2, '姚嘉俊',                 '沙田區議員',         '91000002', 1, 1, 1),
(3, '何紹倫會長',             '商會會長',           '91000003', 1, 1, 1),
(4, '劉麗斯總監',             '企業總監',           '91000004', 1, 1, 1),
(5, '時景恒',                 '時昌迷你倉創辦人',   '91000005', 1, 1, 1);

-- =====================
-- Regular Guests (10 people, vip=0, some paid some unpaid)
-- =====================
INSERT INTO guests (id, name, professional, tel, meeting_id, vip, active) VALUES
(6,  '陳偉明 Chris Chan',     '餐飲業',             '92000001', 1, 0, 1),
(7,  '黃美玲 Amy Wong',       '零售業',             '92000002', 1, 0, 1),
(8,  '張志強 Ray Cheung',     '物流運輸',           '92000003', 1, 0, 1),
(9,  '李麗華 Lily Lee',       '教育顧問',           '92000004', 1, 0, 1),
(10, '劉家傑 Peter Lau',      '金融投資',           '92000005', 1, 0, 1),
(11, '林慧敏 Vivian Lam',     '美容護膚',           '92000006', 1, 0, 1),
(12, '吳國華 Alex Ng',        '資訊科技',           '92000007', 1, 0, 1),
(13, '馬俊傑 Eric Ma',        '建築工程',           '92000008', 1, 0, 1),
(14, '周美詩 Macy Chow',      '公共關係',           '92000009', 1, 0, 1),
(15, '謝志邦 Ben Tse',        '法律顧問',           '92000010', 1, 0, 1);

-- =====================
-- Attendance: mix of checked-in (with arrival_time) and not checked in
-- Committee: all paid + all checked in
-- =====================
INSERT INTO attendance (meeting_id, person_type, person_id, payment, payment_method, arrival_time, price_tier) VALUES
(1, 'member', 1,  'paid', 'FPS',     '09:15', 'committee'),
(1, 'member', 2,  'paid', 'PayMe',   '09:20', 'committee'),
(1, 'member', 3,  'paid', 'FPS',     '09:18', 'committee'),
(1, 'member', 4,  'paid', 'Alipay',  '09:22', 'committee'),
(1, 'member', 5,  'paid', 'PayMe',   '09:10', 'committee');

-- Members: some checked in (paid), some not yet
INSERT INTO attendance (meeting_id, person_type, person_id, payment, payment_method, arrival_time, price_tier) VALUES
(1, 'member', 6,  'paid', 'FPS',     '09:25', 'member'),
(1, 'member', 7,  'paid', 'PayMe',   '09:30', 'member'),
(1, 'member', 8,  'paid', 'FPS',     '09:28', 'member'),
(1, 'member', 9,  '',     '',        '',       'member'),
(1, 'member', 10, '',     '',        '',       'member'),
(1, 'member', 11, 'paid', 'Alipay',  '09:35', 'member'),
(1, 'member', 12, 'paid', 'FPS',     '09:32', 'member'),
(1, 'member', 13, '',     '',        '',       'member'),
(1, 'member', 14, 'paid', 'PayMe',   '09:40', 'member'),
(1, 'member', 15, 'paid', 'FPS',     '09:38', 'member');

-- VIP guests: all free + all checked in
INSERT INTO attendance (meeting_id, person_type, person_id, payment, payment_method, arrival_time, price_tier) VALUES
(1, 'guest', 1,  'free', '', '09:45', 'guest'),
(1, 'guest', 2,  'free', '', '09:48', 'guest'),
(1, 'guest', 3,  'free', '', '09:50', 'guest'),
(1, 'guest', 4,  'free', '', '09:52', 'guest'),
(1, 'guest', 5,  'free', '', '09:55', 'guest');

-- Regular guests: some paid + checked in, some not yet
INSERT INTO attendance (meeting_id, person_type, person_id, payment, payment_method, arrival_time, price_tier) VALUES
(1, 'guest', 6,  'paid', 'FPS',     '10:00', 'guest'),
(1, 'guest', 7,  'paid', 'PayMe',   '10:05', 'guest'),
(1, 'guest', 8,  '',     '',        '',       'guest'),
(1, 'guest', 9,  'paid', 'FPS',     '10:10', 'guest'),
(1, 'guest', 10, '',     '',        '',       'guest'),
(1, 'guest', 11, 'paid', 'Alipay',  '10:12', 'guest'),
(1, 'guest', 12, '',     '',        '',       'guest'),
(1, 'guest', 13, 'paid', 'FPS',     '10:15', 'guest'),
(1, 'guest', 14, '',     '',        '',       'guest'),
(1, 'guest', 15, 'paid', 'PayMe',   '10:18', 'guest');
