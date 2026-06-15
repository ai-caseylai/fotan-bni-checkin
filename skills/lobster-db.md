---
name: fotan-skill
description: 火炭會聚會簽到系統完整 Skill — D1 查詢、匯入、付款、會議、統計、枱號
---

# 🦞 火炭會 Skill

直接調用火炭會 Cloudflare D1 資料庫，支援查詢、匯入、統計、更新。

## Token 驗證

必須提供有效 Token。在後台「火炭會 Skill」頁面管理 Token（有效期三個月）。
```bash
curl -s "https://fotan.techforliving.net/api/skill-tokens?action=verify&token=YOUR_TOKEN"
```
返回 `{"ok":true}` 表示有效。

## 資料庫連線

- **D1**: fotan-db (96baaebb-c825-4dcc-8229-e55abab0d474)
- **指令**: `npx wrangler d1 execute fotan-db --remote --command "<SQL>"`
- **目錄**: `/Users/perry/Documents/fotan`

---

## 全部資料表

### members（75 會員）
| 欄位 | 說明 |
|------|------|
| id | 會員編號 |
| name | 姓名 |
| tel | 電話 |
| email | 電郵 |
| professional | 專業領域 |
| role | 會員 / 委員 / 主席 / 副主席 / 財務 / 秘書 |
| fee_paid_date | 會費付費日 |
| table_number | 枱號（舊欄位，現用 attendance.table_number） |
| bio | 會員簡介 |
| active | 1=啟用 |

### guests（來賓）
| 欄位 | 說明 |
|------|------|
| id | 來賓編號 |
| name | 姓名 |
| professional | 專業 |
| tel | 電話 |
| invited_by | 邀請人 |
| meeting_id | 所屬會議 ID |
| active | 1=啟用 |

### meetings（會議）
| 欄位 | 說明 |
|------|------|
| id | 會議編號 |
| date | YYYY-MM-DD |
| type | regular / special / anniversary |
| collector | 收款人 |
| guest_fee | 來賓費 |

### attendance（出席 — 核心表）
| 欄位 | 說明 |
|------|------|
| id | 記錄編號 |
| meeting_id | 會議 ID |
| person_type | member / guest |
| person_id | 人員 ID |
| arrival_time | 到達時間（空=未簽到） |
| payment | paid / free / 空=未付 |
| payment_method | 付款方式 |
| table_number | **每人每次會議枱號** |
| substitute | 替代人 |
| remark | 備註 |

### settings（系統設定）
key-value 表。重要 key：`admin_password`, `schedule`, `chairmanMsg`, `skipCheckin`（1=可跳過付款）, `telegram_whitelist`, `productIntro`, `aboutUs`, `joinLink`

### telegram_messages
id, chat_id, username, first_name, role(user/bot), content, created_at

### telegram_files
id, chat_id, filename, r2_key, content_type, file_size, created_at

### skill_tokens
id, token, name, created_at, expires_at, active

---

## 常用 SQL

### 付款追蹤
```sql
-- 某會議未付款來賓（含電話）
SELECT g.name, g.professional, g.tel FROM attendance a
JOIN guests g ON a.person_id=g.id
WHERE a.meeting_id=10 AND (a.payment='' OR a.payment IS NULL) AND a.arrival_time!='absent';

-- 付款摘要（paid / free / unpaid）
SELECT payment, COUNT(*) FROM attendance WHERE meeting_id=10 GROUP BY payment;

-- 會員付款狀態（A-Z排序）
SELECT m.name, m.tel, a.payment, a.table_number FROM attendance a
JOIN members m ON a.person_id=m.id
WHERE a.meeting_id=10 AND a.person_type='member' ORDER BY m.name;
```

### 會議統計（含人數）
```sql
SELECT m.*, COUNT(a.id) as total,
  SUM(CASE WHEN a.person_type='member' THEN 1 ELSE 0 END) as members,
  SUM(CASE WHEN a.person_type='guest' THEN 1 ELSE 0 END) as guests,
  SUM(CASE WHEN a.payment='paid' THEN 1 ELSE 0 END) as paid,
  SUM(CASE WHEN a.payment='free' THEN 1 ELSE 0 END) as free,
  SUM(CASE WHEN (a.payment='' OR a.payment IS NULL) THEN 1 ELSE 0 END) as unpaid
FROM meetings m LEFT JOIN attendance a ON m.id=a.meeting_id
GROUP BY m.id ORDER BY m.date DESC;
```

### 搜尋
```sql
SELECT 'member' as type, id, name, tel, professional FROM members WHERE name LIKE '%關鍵字%' AND active=1
UNION ALL
SELECT 'guest', id, name, tel, professional FROM guests WHERE name LIKE '%關鍵字%' AND active=1;
```

### 批量新增來賓（跳過重複）
```sql
INSERT INTO guests (name, professional, tel, invited_by, meeting_id)
SELECT '姓名','專業','電話','邀請人',<meeting_id>
WHERE NOT EXISTS (SELECT 1 FROM guests WHERE name='姓名' AND active=1)
AND NOT EXISTS (SELECT 1 FROM members WHERE name='姓名' AND active=1);
```

### 更新付款
```sql
UPDATE attendance SET payment='paid' WHERE id=<id>;
UPDATE attendance SET payment='free' WHERE id=<id>;  -- VIP免付
```

### 枱號
```sql
-- 設枱號
UPDATE attendance SET table_number='5' WHERE meeting_id=10 AND person_type='member' AND person_id=26;
-- 枱號分配表
SELECT a.table_number, m.name FROM attendance a
JOIN members m ON a.person_id=m.id WHERE a.meeting_id=10 AND a.person_type='member'
ORDER BY a.table_number, m.name;
```

### 新增會議 + 複製上次會員
```sql
INSERT INTO meetings (date, type, collector, guest_fee) VALUES ('2026-07-15','regular','',0);
-- 取得新 ID，複製上次會議會員：
INSERT INTO attendance (meeting_id, person_type, person_id)
SELECT <new_id>, 'member', person_id FROM attendance
WHERE meeting_id=(SELECT id FROM meetings ORDER BY date DESC LIMIT 1 OFFSET 1) AND person_type='member';
```

---

## 6/20 四週年聚餐現況
- 會議 ID: 10，17 會員 + 62 來賓 = 79 人
- 付款：已付 ~35 人，免費 12 人（VIP），未付 ~32 人

## 回覆規則
- 繁體中文，簡潔直接，數據明確
- 直接執行 SQL 回報結果
