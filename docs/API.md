# API 手冊 — 火炭會聚會簽到系統 v3.7

## 基礎資訊

- **Base URL**: `https://fotan.techforliving.net/api`
- **Content-Type**: `application/json`
- **CORS**: 全部端點支援跨域

### 認證方式

| API 類型 | 認證方式 | 適用對象 |
|----------|----------|----------|
| Skill API | `{"token": "lob_xxxx"}` 在 JSON body | OpenClaw / Claude Code / curl |
| 後台 API | Cookie `fotan_auth`（登入取得） | SPA 後台 |

---

# Part 1: Skill REST API

**端點**：`POST https://fotan.techforliving.net/api/skill`
**驗證**：所有請求必須帶 `token` 參數（在後台「火炭會 Skill」頁面產生，90 天有效）

## 1.1 基礎格式

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_nt8r6aekwv1z8xcpvbnw5uag", "action": "list_meetings"}'
```

### Token 過期回應
```json
{"ok": false, "error": "invalid or expired token"}
```

---

## 1.2 人員管理

### `import_guests` — 批次匯入來賓

自動用最新會議、跳過會員/來賓重複、如係會員自動更新 attendance 付款。

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "import_guests",
    "guests": [
      {"name": "陳大文", "professional": "律師", "payment": "paid"},
      {"name": "李小華", "professional": "會計師", "payment": "unpaid"},
      {"name": "張三", "professional": "工程師", "payment": "free"},
      {"name": "黃師傅", "professional": "中醫師", "tel": "12345678", "invited_by": "Perry"}
    ]
  }'
```

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `guests` | array | ✅ | 來賓陣列 |
| `guests[].name` | string | ✅ | 姓名 |
| `guests[].professional` | string | - | 專業 |
| `guests[].payment` | string | - | `paid` / `unpaid` / `free` |
| `guests[].tel` | string | - | 電話 |
| `guests[].invited_by` | string | - | 邀請人 |

成功回應：
```json
{
  "ok": true,
  "meeting_id": 10,
  "added": 3,
  "skipped": 1,
  "paid_count": 1,
  "unpaid_count": 1,
  "free_count": 1,
  "message": "已匯入 3 位來賓（跳過 1 位重複），1 已付 1 免費 1 未付",
  "results": [
    {"name": "陳大文", "status": "added", "payment": "paid", "guest_id": 123},
    {"name": "李小華", "status": "added", "payment": "unpaid", "guest_id": 124},
    {"name": "張三", "status": "added", "payment": "free", "guest_id": 125},
    {"name": "黃師傅", "status": "skipped", "reason": "duplicate"}
  ]
}
```

---

### `bulk_create_members` — 批次匯入會員

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "bulk_create_members",
    "members": [
      {"name": "陳大文", "tel": "12345678", "email": "chan@example.com", "professional": "律師", "role": "會員"},
      {"name": "李小華", "tel": "87654321", "email": "lee@example.com", "professional": "會計師", "role": "委員"}
    ]
  }'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `members[].name` | ✅ | 姓名 |
| `members[].tel` | - | 電話 |
| `members[].email` | - | 電郵 |
| `members[].professional` | - | 專業 |
| `members[].role` | - | 角色（預設「會員」） |
| `members[].fee_paid_date` | - | 會費付費日 |

成功回應：
```json
{
  "ok": true,
  "added": 2,
  "skipped": 0,
  "message": "已新增 2 位會員（跳過 0 位重複）",
  "results": [
    {"name": "陳大文", "status": "added", "member_id": 76},
    {"name": "李小華", "status": "added", "member_id": 77}
  ]
}
```

---

### `create_member` — 新增單個會員

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "create_member",
    "name": "陳大文",
    "tel": "12345678",
    "email": "chan@example.com",
    "professional": "律師",
    "role": "委員"
  }'
```

成功回應：
```json
{"ok": true, "member_id": 76, "message": "已新增會員：陳大文"}
```

會員已存在：
```json
{"ok": false, "error": "member already exists"}
```

---

### `update_member` — 更新會員資料

只傳要更新嘅欄位即可。

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "update_member",
    "member_id": 35,
    "tel": "99999999",
    "professional": "大律師",
    "role": "會長"
  }'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `member_id` | ✅ | 會員 ID |
| `name` | - | 姓名 |
| `tel` | - | 電話 |
| `email` | - | 電郵 |
| `professional` | - | 專業 |
| `role` | - | 角色 |
| `fee_paid_date` | - | 會費付費日 |
| `bio` | - | 簡介 |

成功回應：
```json
{"ok": true, "message": "已更新會員 #35"}
```

---

### `update_guest` — 更新來賓資料

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "update_guest",
    "guest_id": 15,
    "professional": "全港商會創會總會長",
    "invited_by": "會長"
  }'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `guest_id` | ✅ | 來賓 ID |
| `name` | - | 姓名 |
| `professional` | - | 專業 |
| `tel` | - | 電話 |
| `invited_by` | - | 邀請人 |
| `meeting_id` | - | 所屬聚會 ID |

---

### `delete_person` — 刪除人員

會員設 `active=0`，來賓設 `active=0` + 刪除 attendance。

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "delete_person",
    "person_type": "guest",
    "person_id": 15
  }'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `person_type` | ✅ | `member` 或 `guest` |
| `person_id` | ✅ | 人員 ID |

---

### `search` — 搜尋會員+來賓

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "search", "q": "李"}'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `q` | ✅ | 搜尋關鍵字（LIKE %q%） |

回應：
```json
{
  "ok": true,
  "results": [
    {"type": "member", "id": 35, "name": "李寶明", "tel": null, "professional": null},
    {"type": "guest", "id": 15, "name": "李小華", "tel": "12345678", "professional": "會計師"}
  ]
}
```

---

## 1.3 付款與出席

### `update_payment` — 更新付款狀態

```bash
# 標記已付
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "update_payment", "attendance_id": 152, "payment": "paid"}'

# 標記免費
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "update_payment", "attendance_id": 152, "payment": "free"}'

# 改回未付
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "update_payment", "attendance_id": 152, "payment": "unpaid"}'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `attendance_id` | ✅ | 出席記錄 ID |
| `payment` | ✅ | `paid` / `free` / `unpaid` |

成功回應：
```json
{"ok": true, "message": "已更新 attendance #152 付款為 paid"}
```

---

### `update_table` — 更新枱號

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "update_table",
    "meeting_id": 10,
    "person_type": "member",
    "person_id": 35,
    "table_number": "5"
  }'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `meeting_id` | ✅ | 會議 ID |
| `person_type` | ✅ | `member` 或 `guest` |
| `person_id` | ✅ | 人員 ID |
| `table_number` | ✅ | 枱號（傳空字串可清除） |

---

### `mark_arrival` — 標記簽到/缺席

```bash
# 簽到（設定時間）
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "mark_arrival", "attendance_id": 152, "arrival_time": "12:30"}'

# 標記缺席
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "mark_arrival", "attendance_id": 152, "arrival_time": "absent"}'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `attendance_id` | ✅ | 出席記錄 ID |
| `arrival_time` | - | `HH:MM` 格式，或 `absent`。不填預設 `absent` |

---

## 1.4 查詢與統計

### `list_meetings` — 會議列表

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "list_meetings"}'
```

回應：
```json
{
  "ok": true,
  "meetings": [
    {"id": 10, "date": "2026-06-20", "type": "anniversary", "collector": "", "guest_fee": 380},
    {"id": 9, "date": "2026-05-15", "type": "regular", "collector": "Perry", "guest_fee": 300}
  ]
}
```

---

### `meeting_stats` — 會議統計

```bash
# 最新會議
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "meeting_stats"}'

# 指定會議
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "meeting_stats", "meeting_id": 10}'
```

回應（含 revenue，v3.7 起只計 paid 不含 free）：
```json
{
  "ok": true,
  "stats": {
    "id": 10,
    "date": "2026-06-20",
    "type": "anniversary",
    "guest_fee": 398,
    "member_fee": 398,
    "committee_fee": 298,
    "total": 118,
    "members": 26,
    "guests": 92,
    "paid": 58,
    "free": 12,
    "unpaid": 48,
    "arrived": 0,
    "absent": 0,
    "revenue": 23084
  }
}
```

---

### `payment_summary` — 付款摘要

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "payment_summary", "meeting_id": 10}'
```

回應：
```json
{
  "ok": true,
  "meeting_id": 10,
  "summary": [
    {"payment": "paid", "count": 48},
    {"payment": "free", "count": 10},
    {"payment": "unpaid", "count": 33}
  ]
}
```

---

### `list_attendance` — 出席名單

```bash
# 最新會議
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "list_attendance"}'

# 指定會議
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "list_attendance", "meeting_id": 10}'
```

回應：
```json
{
  "ok": true,
  "meeting_id": 10,
  "attendance": [
    {
      "id": 230,
      "person_type": "member",
      "person_id": 35,
      "name": "易龍師傅",
      "professional": "風水師",
      "arrival_time": "",
      "payment": "paid",
      "table_number": "7"
    },
    {
      "id": 152,
      "person_type": "guest",
      "person_id": 15,
      "name": "李寶明",
      "professional": "全港商會創會總會長",
      "arrival_time": "",
      "payment": "unpaid",
      "table_number": "1"
    }
  ]
}
```

---

### `get_settings` — 系統設定

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "get_settings"}'
```

回應：
```json
{
  "ok": true,
  "settings": {
    "lunchFee": "388",
    "tableNumber": "3",
    "paymeLink": "https://payme.hsbc/fotan",
    "schedule": "11:30 交流 · 12:55 開場 · ...",
    "chairmanMsg": "歡迎各位出席...",
    "skipCheckin": "1",
    "admin_password": "..."
  }
}
```

---

### `export_stats` — 綜合統計匯出

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{"token": "lob_xxxx", "action": "export_stats"}'
```

回應：
```json
{
  "ok": true,
  "member_count": 75,
  "guest_count": 73,
  "meetings": [
    {
      "id": 10, "date": "2026-06-20", "type": "anniversary",
      "total": 118, "members": 26, "guests": 92,
      "paid": 58, "free": 12, "unpaid": 48,
      "arrived": 0, "absent": 0, "revenue": 23084
    }
  ]
}
```

---

## 1.5 圖片上傳

### `upload_image` — 上傳圖片到 R2

用途：上傳 QR Code、設定圖片、簽到背景等。

```bash
# 先將圖片轉成 base64
BASE64=$(base64 -i qr-code.png)

curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"lob_xxxx\",
    \"action\": \"upload_image\",
    \"name\": \"qr-alipay\",
    \"data\": \"data:image/png;base64,$BASE64\",
    \"content_type\": \"image/png\"
  }"
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `name` | ✅ | R2 檔名（如 `qr-alipay`、`qr-fps`） |
| `data` | ✅ | Base64 圖片數據（含 `data:image/...;base64,` 前綴） |
| `content_type` | - | `image/png` 或 `image/jpeg`（預設 png） |

成功回應：
```json
{"ok": true, "url": "/api/image?name=qr-alipay", "message": "已上傳圖片：qr-alipay"}
```

---

# Part 2: 後台 REST API

**驗證**：全部需要 `fotan_auth` Cookie。先 POST `/api/auth` 登入取得。

## 2.1 認證 `POST /api/auth`

### 登入
```bash
curl -s -X POST "https://fotan.techforliving.net/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "password": "admin888"}' \
  -c cookies.txt
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `action` | ✅ | `login` / `check` / `change_pwd` |
| `password` | login 必填 | 管理密碼 |
| `old` | change_pwd 必填 | 舊密碼 |
| `new` | change_pwd 必填 | 新密碼 |

成功回應：
```json
{"ok": true, "message": "登入成功"}
```
Cookie `fotan_auth` 自動設定（HttpOnly, SameSite=Strict, Secure, 24h）。

登入失敗：
```json
{"ok": false, "error": "密碼錯誤"}
```
防爆破：同一 IP 5 次失敗鎖 15 分鐘。

### 驗證登入狀態
```bash
curl -s -X POST "https://fotan.techforliving.net/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action": "check"}' \
  -b cookies.txt
```

### 修改密碼
```bash
curl -s -X POST "https://fotan.techforliving.net/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action": "change_pwd", "old": "admin888", "new": "newpassword123"}' \
  -b cookies.txt
```

---

## 2.2 會員 `/api/members`

### GET — 列表
```bash
curl -s "https://fotan.techforliving.net/api/members" -b cookies.txt
curl -s "https://fotan.techforliving.net/api/members?all=1" -b cookies.txt  # 含非活躍
```

回應：
```json
[
  {"id": 1, "name": "陳大文", "tel": "12345678", "email": "chan@test.com", "professional": "律師", "role": "會員", "active": 1, ...},
  {"id": 2, "name": "李小華", ...}
]
```

### POST — 新增
```bash
curl -s -X POST "https://fotan.techforliving.net/api/members" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "新會員", "tel": "11112222", "email": "new@test.com", "professional": "建築師", "role": "會員", "fee_paid_date": "2026-06-01", "bio": "簡介文字"}'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `name` | ✅ | 姓名 |
| `tel` | - | 電話 |
| `email` | - | 電郵 |
| `professional` | - | 專業 |
| `role` | - | 角色 |
| `fee_paid_date` | - | 會費付費日 |
| `bio` | - | 簡介 |

回應：
```json
{"ok": true, "id": 76, "message": "已新增會員"}
```

### PUT — 更新
```bash
curl -s -X PUT "https://fotan.techforliving.net/api/members" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"id": 76, "tel": "99999999", "professional": "大律師"}'
```

### DELETE — 刪除（設 active=0）
```bash
curl -s -X DELETE "https://fotan.techforliving.net/api/members?id=76" -b cookies.txt
```

---

## 2.3 來賓 `/api/guests`

### GET — 列表
```bash
curl -s "https://fotan.techforliving.net/api/guests" -b cookies.txt
```

### POST — 新增
```bash
curl -s -X POST "https://fotan.techforliving.net/api/guests" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "新來賓", "professional": "律師", "tel": "12345678", "invited_by": "Perry", "meeting_id": 10}'
```

回應：
```json
{"ok": true, "id": 100, "message": "已新增來賓"}
```

### PUT — 更新
```bash
curl -s -X PUT "https://fotan.techforliving.net/api/guests" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"id": 100, "professional": "會計師", "invited_by": "會長"}'
```

### DELETE — 刪除（設 active=0）
```bash
curl -s -X DELETE "https://fotan.techforliving.net/api/guests?id=100" -b cookies.txt
```

---

## 2.4 會議 `/api/meetings`

### GET — 列表（含統計）
```bash
curl -s "https://fotan.techforliving.net/api/meetings" -b cookies.txt
```

每筆會議含：`total`, `members`, `guests`, `paid`, `free`, `unpaid`, `revenue` 統計（v3.7 起 revenue 只計 paid 不含 free）。

### POST — 新增
```bash
curl -s -X POST "https://fotan.techforliving.net/api/meetings" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"date": "2026-07-15", "type": "regular", "collector": "Perry", "guest_fee": 300}'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `date` | ✅ | 日期 YYYY-MM-DD |
| `type` | ✅ | `regular` / `anniversary` / `special` |
| `collector` | - | 收款人 |
| `guest_fee` | - | 來賓費用 |

### PUT — 更新
```bash
curl -s -X PUT "https://fotan.techforliving.net/api/meetings" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"id": 11, "collector": "會長", "guest_fee": 350}'
```

### DELETE — 刪除
```bash
curl -s -X DELETE "https://fotan.techforliving.net/api/meetings?id=11" -b cookies.txt
```

---

## 2.5 出席 `/api/attendance`

### GET — 查詢
```bash
# 依會議
curl -s "https://fotan.techforliving.net/api/attendance?meeting_id=10" -b cookies.txt

# 依人員
curl -s "https://fotan.techforliving.net/api/attendance?person_type=member&person_id=35" -b cookies.txt
```

### POST — 新增
```bash
curl -s -X POST "https://fotan.techforliving.net/api/attendance" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"meeting_id": 10, "person_type": "guest", "person_id": 100, "arrival_time": "12:30", "payment": "unpaid", "table_number": "3"}'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `meeting_id` | ✅ | 會議 ID |
| `person_type` | ✅ | `member` / `guest` |
| `person_id` | ✅ | 人員 ID |
| `arrival_time` | - | `HH:MM` / `absent` |
| `payment` | - | `paid` / `free` / `unpaid` |
| `table_number` | - | 枱號 |
| `substitute` | - | 代出席者 |
| `remark` | - | 備註 |

### PUT — 更新
```bash
curl -s -X PUT "https://fotan.techforliving.net/api/attendance" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"id": 152, "payment": "paid", "arrival_time": "12:30", "table_number": "1"}'
```

### DELETE — 刪除
```bash
curl -s -X DELETE "https://fotan.techforliving.net/api/attendance?id=152" -b cookies.txt
```

---

## 2.6 收據 `/api/receipts`

### GET — 查詢
```bash
# 取圖片
curl -s "https://fotan.techforliving.net/api/receipts?id=1" -b cookies.txt > receipt.jpg

# 列出會員收據
curl -s "https://fotan.techforliving.net/api/receipts?member_id=35" -b cookies.txt
```

回應：
```json
[
  {"id": 1, "filename": "receipt.jpg", "created_at": "2026-06-15 12:00:00"},
  {"id": 2, "filename": "receipt2.jpg", "created_at": "2026-06-15 12:01:00"}
]
```

### POST — 上傳憑證
```bash
BASE64=$(base64 -i receipt.jpg)
curl -s -X POST "https://fotan.techforliving.net/api/receipts" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"member_id\": 35, \"filename\": \"receipt.jpg\", \"data\": \"data:image/jpeg;base64,$BASE64\"}"
```

回應：
```json
{"ok": true, "id": 3, "url": "/api/receipts?id=3"}
```

### DELETE — 刪除
```bash
curl -s -X DELETE "https://fotan.techforliving.net/api/receipts?id=1" -b cookies.txt
```

---

## 2.7 簽到憑證上傳 `/api/checkin-upload`

上傳憑證 → R2 儲存 + 自動標記 `payment='paid'` + `payment_method='receipt_uploaded'`

```bash
curl -s -X POST "https://fotan.techforliving.net/api/checkin-upload" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"attendance_id": 152, "data": "data:image/jpeg;base64,/9j/4AAQ..."}'
```

| 參數 | 必填 | 說明 |
|------|------|------|
| `attendance_id` | ✅ | 出席記錄 ID |
| `data` | ✅ | Base64 圖片數據 |

回應：
```json
{"ok": true, "url": "/api/image?name=receipt-att-152"}
```

---

## 2.8 系統設定 `/api/settings`

### GET — 所有設定
```bash
curl -s "https://fotan.techforliving.net/api/settings" -b cookies.txt
```

### PUT — 更新設定
```bash
curl -s -X PUT "https://fotan.techforliving.net/api/settings" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"key": "lunchFee", "value": "388"}'
```

常用 key：`lunchFee`, `tableNumber`, `paymeLink`, `aliLink`, `fpsPhone`, `schedule`, `chairmanMsg`, `skipCheckin`, `admin_password`, `telegram_bot_token`, `telegram_whitelist`, `aliQrImg`, `fpsQrImg`

---

## 2.9 統計 `/api/stats`

```bash
curl -s "https://fotan.techforliving.net/api/stats" -b cookies.txt
```

---

## 2.10 備份 `/api/backup`

```bash
curl -s "https://fotan.techforliving.net/api/backup" -b cookies.txt > backup.json
```

全資料庫 JSON 匯出（members, guests, meetings, attendance, settings, receipts）。

---

## 2.11 Telegram `/api/telegram`

```bash
# 設定 Webhook
curl -s "https://fotan.techforliving.net/api/telegram?action=setup" -b cookies.txt

# 查看狀態
curl -s "https://fotan.techforliving.net/api/telegram?action=info" -b cookies.txt

# 對話列表
curl -s "https://fotan.techforliving.net/api/telegram?action=chats" -b cookies.txt

# 查看特定對話
curl -s "https://fotan.techforliving.net/api/telegram?action=messages&chat_id=12345" -b cookies.txt
```

---

## 2.12 Skill Token `/api/skill-tokens`

```bash
# 列表
curl -s "https://fotan.techforliving.net/api/skill-tokens" -b cookies.txt

# 驗證
curl -s "https://fotan.techforliving.net/api/skill-tokens?action=verify&token=lob_xxxx"

# 新增（後台 Cookie 驗證）
curl -s -X POST "https://fotan.techforliving.net/api/skill-tokens" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "ADA 姐"}'

# 刪除
curl -s -X DELETE "https://fotan.techforliving.net/api/skill-tokens?id=1" -b cookies.txt
```

新增回應：
```json
{"ok": true, "token": "lob_nt8r6aekwv1z8xcpvbnw5uag", "name": "ADA 姐", "expires_at": "2026-09-13"}
```

---

## 2.13 Chatbot `/api/chat`

```bash
curl -s -X POST "https://fotan.techforliving.net/api/chat" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"messages": [{"role": "user", "content": "最新會議有幾多人參加？"}]}'
```

回應：
```json
{"reply": "最新會議係 6月20號四週年聚餐，暫時有 91 人參加！18 位會員同 73 位來賓，48 位已付，33 位未付～"}
```

---

## 2.14 圖片服務 `/api/image`

```bash
# 取 R2 圖片
curl -s "https://fotan.techforliving.net/api/image?name=receipt-att-152" > img.jpg
curl -s "https://fotan.techforliving.net/api/image?name=qr-alipay" > qr.png
```

---

# Part 3: Chatbot Function Calling Tools（21 個）

`POST /api/chat` 時 AI 自動調用，亦可作 API 參考。

| # | Tool | 參數 | 範例 |
|---|------|------|------|
| 1 | `get_meetings` | — | 查詢所有會議 |
| 2 | `get_attendance` | `meeting_id` | 會議 #10 出席詳情 |
| 3 | `get_member_stats` | — | 會員/來賓統計 |
| 4 | `search_people` | `query` | 搜尋「陳」 |
| 5 | `get_member_detail` | `member_id` | 會員 #35 詳情+出席記錄 |
| 6 | `get_guest_list` | — | 所有來賓 |
| 7 | `get_payment_summary` | `meeting_id?` | 付款統計 |
| 8 | `get_industry_list` | — | 行業分類 |
| 9 | `add_guest` | `name`, professional?, tel?, invited_by?, meeting_id? | 新增來賓 |
| 10 | `bulk_add_guests` | `guests[]`, meeting_id? | 批次匯入來賓 |
| 11 | `add_meeting` | `date`, `type`, collector?, guest_fee? | 新增會議 |
| 12 | `update_payment` | `attendance_id`, `payment` | 更新付款為 paid |
| 13 | `update_table` | `meeting_id`, `person_type`, `person_id`, `table_number` | 設枱號為 5 |
| 14 | `mark_arrival` | `attendance_id`, `arrival_time?` | 標記 12:30 簽到 |
| 15 | `get_settings` | — | 系統設定 |
| 16 | `delete_attendance` | `attendance_id` | 刪除出席記錄 |
| 17 | `get_receipts` | `member_id` | 會員 #35 憑證列表 |
| 18 | `create_member` | `name`, tel?, email?, professional?, role? | 新增會員 |
| 19 | `update_member` | `member_id`, +任意欄位 | 更新會員資料 |
| 20 | `bulk_create_members` | `members[]` | 批次匯入會員 |
| 21 | `upload_image` | `name`, `data`, content_type? | 上傳 QR Code 圖片 |

---

# Part 4: 常見流程範例

## 4.1 完整嘉賓匯入流程

```bash
TOKEN="lob_nt8r6aekwv1z8xcpvbnw5uag"
API="https://fotan.techforliving.net/api/skill"

# Step 1: 確認最新會議
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"list_meetings\"}"

# Step 2: 匯入嘉賓
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"import_guests\", \"guests\": [
    {\"name\": \"陳大文\", \"professional\": \"律師\", \"payment\": \"paid\"},
    {\"name\": \"李小華\", \"professional\": \"會計師\", \"payment\": \"unpaid\"}
  ]}"

# Step 3: 檢查結果
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"meeting_stats\"}"
```

## 4.2 完整付款+簽到流程

```bash
TOKEN="lob_nt8r6aekwv1z8xcpvbnw5uag"
API="https://fotan.techforliving.net/api/skill"

# Step 1: 查出席名單搵 attendance_id
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"list_attendance\"}" | python3 -c "import sys,json; [print(a['id'],a['name'],a['payment']) for a in json.load(sys.stdin)['attendance']]"

# Step 2: 標記已付
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"update_payment\", \"attendance_id\": 152, \"payment\": \"paid\"}"

# Step 3: 標記簽到
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"mark_arrival\", \"attendance_id\": 152, \"arrival_time\": \"12:30\"}"

# Step 4: 設枱號
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"update_table\", \"meeting_id\": 10, \"person_type\": \"guest\", \"person_id\": 15, \"table_number\": \"2\"}"
```

## 4.3 批量處理：標記全部已到場並設枱號

```bash
TOKEN="lob_nt8r6aekwv1z8xcpvbnw5uag"
API="https://fotan.techforliving.net/api/skill"

# 取得全部出席名單
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"action\": \"list_attendance\"}" > attendance.json

# 用 jq 批次標記（舉例）
cat attendance.json | python3 -c "
import json, subprocess, sys
data = json.load(sys.stdin)
for a in data['attendance'][:5]:
    subprocess.run(['curl','-s','-X','POST','$API','-H','Content-Type: application/json',
     '-d', f'{{\"token\":\"$TOKEN\",\"action\":\"mark_arrival\",\"attendance_id\":{a[\"id\"]},\"arrival_time\":\"12:30\"}}'])
    print(f'{a[\"name\"]} ✓')
"
```

---

# Part 5: 錯誤碼

| 錯誤 | 說明 |
|------|------|
| `{"ok": false, "error": "invalid or expired token"}` | Skill token 無效或過期 |
| `{"ok": false, "error": "token required"}` | 未提供 token |
| `{"ok": false, "error": "guests array required"}` | import_guests 缺少 guests |
| `{"ok": false, "error": "no meeting found"}` | 未有會議記錄 |
| `{"ok": false, "error": "member already exists"}` | 會員已存在 |
| `{"ok": false, "error": "attendance_id required"}` | 缺少 attendance_id |
| `{"ok": false, "error": "payment must be paid/free/unpaid"}` | 付款值無效 |
| `{"ok": false, "error": "unknown action: xxx"}` | action 名稱錯誤 |
| `{"ok": false, "error": "密碼錯誤"}` | 登入密碼錯誤（防爆破） |
