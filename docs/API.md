# API 手冊 — 火炭會聚會簽到系統

## 基礎資訊

- **Base URL**: `https://fotan.techforliving.net/api`
- **認證方式**：
  - 後台 API：Cookie `fotan_auth`（登入取得）
  - Skill API：Token（`POST /api/skill` 帶 `token` 參數）

---

## Skill REST API（Token 保護）

**端點**：`POST /api/skill`
**驗證**：`{"token": "lob_xxxx", "action": "..."}`

### 15 種操作

| Action | 參數 | 說明 |
|--------|------|------|
| `import_guests` | `guests[]` | 批次匯入來賓 |
| `create_member` | `name`, tel, email, professional, role | 新增會員 |
| `update_member` | `member_id`, +任意欄位 | 更新會員 |
| `update_guest` | `guest_id`, +任意欄位 | 更新來賓 |
| `delete_person` | `person_type`, `person_id` | 刪除人員 |
| `search` | `q` | 搜尋會員+來賓 |
| `update_payment` | `attendance_id`, `payment` | 更新付款 |
| `update_table` | `meeting_id`, `person_type`, `person_id`, `table_number` | 更新枱號 |
| `mark_arrival` | `attendance_id`, `arrival_time` | 標記出席/缺席 |
| `list_meetings` | — | 會議列表 |
| `meeting_stats` | `meeting_id?` | 會議統計 |
| `payment_summary` | `meeting_id?` | 付款摘要 |
| `list_attendance` | `meeting_id?` | 出席名單 |
| `get_settings` | — | 系統設定 |
| `export_stats` | — | 綜合統計匯出 |

### 匯入嘉賓範例

```bash
curl -s -X POST "https://fotan.techforliving.net/api/skill" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "lob_xxxx",
    "action": "import_guests",
    "guests": [
      {"name": "陳大文", "professional": "律師", "payment": "paid"},
      {"name": "李小華", "professional": "會計師", "payment": "unpaid"}
    ]
  }'
```

回傳：
```json
{
  "ok": true,
  "meeting_id": 10,
  "added": 2,
  "skipped": 0,
  "paid_count": 1,
  "unpaid_count": 1,
  "free_count": 0,
  "message": "已匯入 2 位來賓（跳過 0 位重複），1 已付 0 免費 1 未付"
}
```

---

## 後台 API（Cookie 驗證）

所有端點需要 `fotan_auth` Cookie（透過 `POST /api/auth` 登入取得）。

### 認證

| 端點 | 方法 | 說明 |
|------|------|------|
| `/auth` | POST | `{action:"login", password:"xxx"}` → Cookie |
| `/auth` | POST | `{action:"check"}` → 驗證登入狀態 |
| `/auth` | POST | `{action:"change_pwd", old, new}` → 改密碼 |

### 會員 `/members`

| 方法 | 說明 |
|------|------|
| GET | 列表（`?all=1` 含非活躍） |
| POST | 新增 `{name, tel, email, professional, role, fee_paid_date, bio}` |
| PUT | 更新 `{id, ...}` |
| DELETE | 刪除 `?id=X`（設 active=0） |

### 來賓 `/guests`

| 方法 | 說明 |
|------|------|
| GET | 列表 |
| POST | 新增 `{name, professional, tel, invited_by, meeting_id}` |
| PUT | 更新 `{id, ...}` |
| DELETE | 刪除 `?id=X`（設 active=0） |

### 會議 `/meetings`

| 方法 | 說明 |
|------|------|
| GET | 列表（含統計：total, members, guests, paid, free, unpaid） |
| POST | 新增 `{date, type, collector, guest_fee}` |
| PUT | 更新 `{id, ...}` |
| DELETE | 刪除 `?id=X` |

### 出席 `/attendance`

| 方法 | 說明 |
|------|------|
| GET | 查詢（`?meeting_id=X`, `?person_type=X&person_id=X`） |
| POST | 新增 `{meeting_id, person_type, person_id, arrival_time, payment, table_number}` |
| PUT | 更新 `{id, ...}` |
| DELETE | 刪除 `?id=X` |

### 收據 `/receipts`

| 方法 | 說明 |
|------|------|
| GET | 圖片 `?id=X` 或列表 `?member_id=X` |
| POST | 上傳 `{member_id, filename, data:base64}` |
| DELETE | 刪除 `?id=X` |

### 簽到憑證上傳 `/checkin-upload`

| 方法 | 說明 |
|------|------|
| POST | `{attendance_id, data:base64}` → R2 + 標記 paid + payment_method='receipt_uploaded' |

### 系統設定 `/settings`

| 方法 | 說明 |
|------|------|
| GET | 所有設定 |
| PUT | 更新 `{key, value}` |

### 備份 `/backup`

| 方法 | 說明 |
|------|------|
| GET | JSON 全資料庫匯出 |

### 統計 `/stats`

| 方法 | 說明 |
|------|------|
| GET | 會議統計數據 |

### Telegram `/telegram`

| 方法 | 說明 |
|------|------|
| POST | Webhook 接收 |
| GET | `?action=setup/info/chats/messages` |

### Skill Token `/skill-tokens`

| 方法 | 說明 |
|------|------|
| GET | Token 列表 / `?action=verify&token=X` |
| POST | 新增 `{name}` |
| DELETE | 刪除 `?id=X` |

### Chatbot `/chat`

| 方法 | 說明 |
|------|------|
| POST | `{messages:[{role,content}]}` → AI 回覆 |

### 圖片 `/image`

| 方法 | 說明 |
|------|------|
| GET | `?name=X` → R2 圖片 |

---

## Chatbot Function Calling（19 個 Tools）

`get_meetings`, `get_attendance`, `get_member_stats`, `search_people`, `get_member_detail`, `get_guest_list`, `get_payment_summary`, `get_industry_list`, `add_guest`, `bulk_add_guests`, `add_meeting`, `update_payment`, `update_table`, `mark_arrival`, `get_settings`, `delete_attendance`, `get_receipts`, `create_member`, `update_member`
