---
name: fotan-skill
description: 火炭會聚會簽到系統 v3.14 — 31 Skill Actions · 枱號+座位+枱名 · 完整 CRUD · AI Agent 就緒
---

# 火炭會 Skill v3.14

## Token 驗證
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "action": "list_meetings"}'
```

所有操作：`POST /api/skill` + `{"token":"lob_xxxx","action":"...","...":"..."}`

---

## 👥 會員 (Members) — CRUD

### list_members — 列出所有活躍會員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_members"}'
```

### create_member — 新增會員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"create_member","name":"陳大文","tel":"12345678","professional":"律師","role":"主席","tags":"素食,長老"}'
```
role: 會員 / 主席 / 副主席 / 秘書長 / 幹事。tags: 逗號分隔。

### bulk_create_members — 批次匯入會員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"bulk_create_members","members":[{"name":"陳大文","tel":"12345678","professional":"律師"}]}'
```

### update_member — 更新會員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_member","member_id":1,"role":"副主席","tags":"素食"}'
```
支援欄位：name, tel, email, professional, role, fee_paid_date, bio, tags, table_number, seat_order, active

### delete_person — 刪除人員（軟刪除 active=0，保留 attendance 同付款記錄）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"delete_person","person_type":"member","person_id":1}'
```
member 同 guest 一致：只 set active=0，attendance + payment 全部保留。

---

## 👥 來賓 (Guests) — CRUD

### list_guests — 列出所有活躍來賓
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_guests"}'
```

### create_guest — 新增來賓（含 attendance record）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"create_guest","name":"陳大文","professional":"律師","vip":1,"payment":"paid"}'
```
自動用最新會議。vip=1 為嘉賓 ⭐。

### import_guests — 批次匯入來賓
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"import_guests","guests":[{"name":"陳大文","professional":"律師","payment":"paid","vip":1}]}'
```

### update_guest — 更新來賓
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_guest","guest_id":15,"professional":"會計師","vip":1}'
```
支援欄位：name, professional, tel, invited_by, meeting_id, vip, table_number, seat_order, active

### delete_person — 刪除來賓（同上，保留 attendance 同付款記錄）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"delete_person","person_type":"guest","person_id":15}'
```
只 set active=0，attendance 同 payment 全保留（與 member 一致）。

---

## 📅 會議 (Meetings) — CRUD

### list_meetings — 列出所有會議
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_meetings"}'
```

### create_meeting — 建立會議
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"create_meeting","date":"2026-07-01","type":"regular","collector":"Mabel","guest_fee":398,"member_fee":398,"committee_fee":220}'
```
type: regular / special / anniversary。fee 欄位可選，預設 0。

### update_meeting — 更新會議
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_meeting","meeting_id":10,"committee_fee":220,"table_number":"12"}'
```
支援欄位：date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee, table_number

### meeting_stats — 會議統計（含 revenue）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"meeting_stats"}'
```
回傳：total, members, guests, paid, free, unpaid, arrived, absent, revenue

### delete_meeting — 刪除會議（含所有 attendance）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"delete_meeting","meeting_id":10}'
```
⚠️ 會同時刪除該會議全部 attendance records

---

## 📋 出席 (Attendance) — CRUD

### add_to_meeting — 將現有人員加入會議
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"add_to_meeting","person_type":"member","person_id":35,"payment":"paid","table_number":"3","seat_order":5}'
```
自動用最新會議（可指定 meeting_id）。seat_order 可選。

### list_attendance — 出席名單
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_attendance"}'
```
回傳：id, name, person_type, payment, table_number, seat_order, arrival_time, professional

### update_payment — 更新付款
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_payment","attendance_id":152,"payment":"paid"}'
```
payment: paid / free / unpaid。可選 price_tier: early_bird / walk_in / committee

### mark_arrival — 標記簽到
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"mark_arrival","attendance_id":152,"arrival_time":"12:30"}'
```
arrival_time: HH:MM 或 absent。⚠️ 未付款不能簽到。

### payment_summary — 付款摘要
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"payment_summary"}'
```

### delete_attendance — 清除單條 attendance（保留付款記錄）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"delete_attendance","attendance_id":495}'
```
⚠️ 軟清除：清 attendance 欄位（arrival_time, table_number, seat_order）但保留 payment/payment_method，唔會 delete row。

### delete_attendance_batch — 批次清除 attendance（保留付款記錄）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"delete_attendance_batch","ids":[495,496,497]}'
```
⚠️ 同上，軟清除保留付款資料。

---

## 🍽 餐桌排位

### list_tables — 查詢完整枱號地圖
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"list_tables"}'
```
回傳：meeting 資訊、table_count、total_people、assigned_people、unassigned_people、tables（每枱 name + people 含 seat_order）、unassigned（未排位名單）。可指定 meeting_id。

### update_table_names — 設定枱名
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_table_names","meeting_id":10,"names":{"1":"VIP枱","2":"主家席","3":"嘉賓枱"}}'
```
直接設定枱名 JSON mapping，不需用 raw settings API。

### update_table — 單人枱號 + 座位（已強化）
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_table","meeting_id":10,"person_type":"member","person_id":35,"table_number":"5","seat_order":3}'
```
自動同步更新 attendance + person（members/guests）的 table_number + seat_order。

### auto_seat — 自動排位
```bash
# 委員全部放一枱
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"auto_seat","group":"committee"}'

# 會員全部放一枱（自動分枱）
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"auto_seat","group":"member"}'

# 標籤放一枱
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"auto_seat","group":"tag","tag":"素食"}'

# 指定枱號 + 自訂每枱上限
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"auto_seat","group":"vip","table_number":"2","max_per_table":8}'
```
group: committee / vip / member / guest / surname / tag。自動找空枱開始，自動分枱，自動排座位次序。可選 table_number 指定起始枱號、max_per_table 自訂每枱上限（預設 12）。

### move_table — 整枱搬人
```bash
# 安全搬人（不超容量）
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"move_table","from_table":"3","to_table":"5"}'

# 強制搬人（超容量自動分到後續枱號）
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"move_table","from_table":"3","to_table":"5","force":true}'
```
自動檢查目標枱容量。不加 force 時，超出上限保留原枱。加 force 時，超額自動分到 to_table+1, to_table+2... 後續枱號。

---

## ⚙️ 系統設定

### get_settings — 查詢設定
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"get_settings"}'
```

### update_settings — 更新系統設定
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"update_settings","settings":{"lunchFee":"398","chairmanMsg":"歡迎！"}}'
```
設定 key-value。枱名建議用 `update_table_names` action 代替 raw settings。

---

## 🔍 搜尋

### search — 搜尋人員
```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","action":"search","q":"陳"}'
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

## ⚠️ 業務規則
- **未付款不能簽到**：payment≠paid 且≠free 時 mark_arrival 拒絕
- **排位 ≠ 簽到**：排位只 update table_number + seat_order，永不改 payment，永不 create attendance
- **Revenue**：自動檢查 member.role，委員計 committee_fee（default $220）
- **delete_attendance**：軟清除（UPDATE SET NULL）attendance 欄位，保留 payment + payment_method
- **delete_person**：member 同 guest 都只 set active=0，唔刪 attendance，保留付款歷史
- **delete_meeting**：hard DELETE 會議 + 所有 attendance（⚠️ 會清走付款記錄，謹慎使用）
- **Admin DELETE**：Cloudflare WAF 封鎖 DELETE method，admin 後台改用 PUT {active:0} 軟刪除
- **Skill API**：全部用 POST，唔受 WAF 封鎖影響

---

## 🤖 Chatbot（龍蝦仔 🦞）
後台聊天面板，Qwen LLM + function calling。支援全部 31 個 actions。排位後自動刷新頁面。

---

## 🛠️ 手動 SQL
```bash
npx wrangler d1 execute fotan-db --remote --command "<SQL>"
```
