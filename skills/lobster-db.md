---
name: fotan-skill
description: 火炭會聚會簽到系統完整 Skill — 15 種 REST API 操作，100% GUI 對應
---

# 火炭會 Skill

## Token 驗證 + 全部操作

所有請求：`POST https://fotan.techforliving.net/api/skill` + JSON body，必須帶 `token` + `action`。

---

## 👥 人員管理

### 匯入嘉賓 `import_guests`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"import_guests","guests":[{"name":"陳大文","professional":"律師","payment":"paid"}]}'
```
規則：自動用最新會議、跳過重複、會員會更新 attendance 付款狀態。

### 新增會員 `create_member`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"create_member","name":"陳大文","tel":"12345678","email":"a@b.com","professional":"律師","role":"會員"}'
```

### 更新會員 `update_member`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_member","member_id":1,"tel":"87654321","professional":"大律師"}'
```

### 更新來賓 `update_guest`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_guest","guest_id":1,"professional":"會計師","invited_by":"Perry"}'
```

### 刪除人員 `delete_person`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"delete_person","person_type":"guest","person_id":1}'
```

### 搜尋 `search`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"search","q":"陳"}'
```

---

## 💰 付款與出席

### 更新付款 `update_payment`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_payment","attendance_id":123,"payment":"paid"}'
```
`payment`: `paid` / `free` / `unpaid`

### 更新枱號 `update_table`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_table","meeting_id":10,"person_type":"member","person_id":26,"table_number":"5"}'
```

### 標記出席 `mark_arrival`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"mark_arrival","attendance_id":123,"arrival_time":"12:30"}'
```
`arrival_time`: `HH:MM` 或 `absent`

---

## 📊 查詢

### 會議列表 `list_meetings`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_meetings"}'
```

### 會議統計 `meeting_stats`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"meeting_stats","meeting_id":10}'
```
回傳：total, members, guests, paid, free, unpaid, arrived, absent

### 付款摘要 `payment_summary`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"payment_summary"}'
```

### 出席名單 `list_attendance`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_attendance"}'
```
回傳每人：id, name, person_type, payment, table_number, arrival_time, professional

### 系統設定 `get_settings`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"get_settings"}'
```

### 綜合統計 `export_stats`
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"export_stats"}'
```
回傳：member_count, guest_count, 所有會議連統計

---

## 🛠️ 手動 SQL（需要 Wrangler）

資料庫：D1 `fotan-db` (96baaebb-c825-4dcc-8229-e55abab0d474)
```bash
npx wrangler d1 execute fotan-db --remote --command "<SQL>"
```

### 資料表
members, guests, meetings, attendance(payment: paid/free/unpaid), settings, member_receipts, telegram_messages, skill_tokens
