---
name: fotan-skill
description: 火炭會聚會簽到系統完整 Skill — 查詢、匯入、付款、會議、統計、枱號
---

# 火炭會 Skill

## Token 驗證

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "list_meetings"}'
```

## 全部 API

所有請求格式：`POST https://fotan.techforliving.net/api/skill` + JSON body，必須帶 `token` 同 `action`。

---

## 🌟 嘉賓名單匯入

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "action": "import_guests",
    "guests": [
      {"name": "陳大文", "professional": "律師", "payment": "paid"},
      {"name": "李小華", "professional": "會計師", "payment": "unpaid"},
      {"name": "張三", "professional": "工程師", "payment": "free"}
    ]
  }'
```

| 欄位 | 說明 |
|------|------|
| `name` | 姓名（必填） |
| `professional` | 專業（可選） |
| `payment` | `paid` / `unpaid` / `free` |
| `tel` | 電話（可選） |
| `invited_by` | 邀請人（可選） |

**規則：** 自動用最新會議、跳過會員/來賓重複、如係會員會更新其 attendance 付款狀態。

### 格式辨識（貼名單文字時）
```
號碼. 姓名 專業 💰（已付款）   → paid
號碼. 姓名 專業 （未付款）     → unpaid
號碼. 姓名 專業 （免付款）     → free
```

跳過「後補」「❌重複報名」條目。「Daniel guest (12位)」只新增一筆。

---

## 💰 更新付款狀態

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "update_payment", "attendance_id": 123, "payment": "paid"}'
```

`payment` 值：`paid` / `free` / `unpaid`

---

## 🍽️ 更新枱號

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "update_table", "meeting_id": 10, "person_type": "member", "person_id": 26, "table_number": "5"}'
```

---

## ✅ 標記出席

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "mark_arrival", "attendance_id": 123, "arrival_time": "12:30"}'
```

`arrival_time` 值：`HH:MM` 或 `absent`（缺席）

---

## 🔍 搜尋

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "search", "q": "陳"}'
```

---

## 📊 會議統計

```bash
# 最新會議
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "meeting_stats"}'

# 指定會議
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "meeting_stats", "meeting_id": 10}'
```

回傳：`total`, `members`, `guests`, `paid`, `free`, `unpaid`, `arrived`, `absent`

---

## 💳 付款摘要

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "payment_summary", "meeting_id": 10}'
```

---

## 📋 會議列表

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "list_meetings"}'
```

---

## 👥 出席名單

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "list_attendance", "meeting_id": 10}'
```

回傳每人：`id`, `name`, `person_type`, `payment`, `table_number`, `arrival_time`, `professional`

---

## 🛠️ 手動 SQL（需要 Wrangler + Node.js）

資料庫：D1 `fotan-db` (96baaebb-c825-4dcc-8229-e55abab0d474)

```bash
npx wrangler d1 execute fotan-db --remote --command "<SQL>"
```

### 資料表
`members`, `guests`, `meetings`, `attendance`(payment: paid/free/unpaid), `settings`, `telegram_messages`, `skill_tokens`
