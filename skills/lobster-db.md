---
name: fotan-skill
description: 火炭會聚會簽到系統 v3.7 — 17 REST API + 多層收費 + 100% GUI 對應
---

# 火炭會 Skill v3.6

## Token 驗證
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "list_meetings"}'
```

所有操作：`POST /api/skill` + `{"token":"lob_xxxx","action":"...","...":"..."}`

---

## 👥 人員管理

### import_guests — 批次匯入來賓
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"import_guests","guests":[{"name":"陳大文","professional":"律師","payment":"paid"}]}'
```
自動跳過重複、自動用最新會議。

### bulk_create_members — 批次匯入會員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"bulk_create_members","members":[{"name":"陳大文","tel":"12345678","email":"a@b.com","professional":"律師"}]}'
```

### create_member — 新增會員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"create_member","name":"陳大文","tel":"12345678","professional":"律師","role":"委員"}'
```

### update_member — 更新會員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_member","member_id":1,"tel":"99999999"}'
```
支援欄位：name, tel, email, professional, role, fee_paid_date, bio

### update_guest — 更新來賓
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_guest","guest_id":15,"professional":"會計師"}'
```
支援欄位：name, professional, tel, invited_by, meeting_id

### delete_person — 刪除人員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"delete_person","person_type":"guest","person_id":15}'
```

### search — 搜尋
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"search","q":"陳"}'
```

---

## 💰 付款與出席

### update_payment — 更新付款
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_payment","attendance_id":152,"payment":"paid"}'
```
payment: paid / free / unpaid。可選 price_tier: early_bird / walk_in

### update_table — 枱號
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_table","meeting_id":10,"person_type":"member","person_id":35,"table_number":"5"}'
```

### mark_arrival — 標記簽到
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"mark_arrival","attendance_id":152,"arrival_time":"12:30"}'
```
arrival_time: HH:MM 或 absent

---

## 📊 查詢

### list_meetings
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_meetings"}'
```

### update_meeting — 更新會議
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_meeting","meeting_id":10,"committee_fee":220}'
```
支援欄位：date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee, table_number

### meeting_stats — 會議統計（含 revenue）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"meeting_stats"}'
```
回傳：total, members, guests, paid, free, unpaid, arrived, absent, revenue + 全部 fee 欄位

### payment_summary
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"payment_summary"}'
```

### list_attendance — 出席名單
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_attendance"}'
```
回傳每人：id, name, person_type, payment, table_number, arrival_time, professional

### get_settings — 系統設定
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"get_settings"}'
```

### export_stats — 綜合統計
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"export_stats"}'
```

---

## 🖼️ 圖片

### upload_image — 上傳圖片到 R2
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"upload_image","name":"qr-alipay","data":"BASE64","content_type":"image/png"}'
```

---

## 🛠️ 手動 SQL（需要 Wrangler）
D1: `fotan-db` | `npx wrangler d1 execute fotan-db --remote --command "<SQL>"`
