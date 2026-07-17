# 火炭會聚會簽到系統 — 開發手冊 v3.15

## 技術架構

```
┌──────────────────────────────────────────────┐
│               Cloudflare Pages               │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ index.html│  │ /admin/  │  │ /login.html │  │
│  │ (簽到主頁) │  │ (後台)   │  │ (用戶登入)  │  │
│  └──────────┘  └──────────┘  └────────────┘  │
├──────────────────────────────────────────────┤
│         Cloudflare Pages Functions            │
│  /api/members  /api/guests  /api/auth  ...   │
├──────────────────────────────────────────────┤
│    D1 Database    │    R2 Storage             │
│    (SQLite)       │    (圖片/PDF/憑證)        │
└──────────────────────────────────────────────┘
         │                    │
    Qwen AI              Telegram Bot
    (Chatbot)            (@fotanbot)
```

## 快速開始

```bash
git clone https://github.com/ai-caseylai/fotan-bni-checkin.git
cd fotan-bni-checkin
npm install
npx wrangler pages deploy . --project-name fotan --branch main
```

## 資料庫結構

### 核心表

| 表名 | 用途 | 關鍵欄位 |
|------|------|----------|
| `members` | 會員資料 | name, tel, email, professional, role, bio, table_number |
| `guests` | 來賓資料 | name, professional, tel, invited_by, meeting_id, vip |
| `meetings` | 會議記錄 | date, type, collector, guest_fee, member_fee, committee_fee |
| `attendance` | 出席記錄 | meeting_id, person_type, person_id, payment, arrival_time, price_tier |
| `settings` | 系統設定 | key, value |
| `users` | 用戶帳號 | username, password, role, status |
| `skill_tokens` | API Token | token, name, expires_at |
| `whatsapp_cert` | 入錢憑證 | from_number, r2_key, person_type, person_id |
| `telegram_messages` | TG 對話記錄 | chat_id, role, content |
| `member_receipts` | 付款憑證 | member_id, filename |

### 付款狀態

| 值 | 含義 |
|----|------|
| `paid` | 已付款（綠色） |
| `free` | 免費嘉賓（藍色） |
| `unpaid` / `""` | 未付款（紅色） |

## API 端點

### 後台 API（Cookie 認證）

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/auth` | GET/POST | 登入/登出/檢查/註冊/用戶管理 |
| `/api/members` | CRUD | 會員管理 (?all=1 含 inactive) |
| `/api/guests` | CRUD | 來賓管理 |
| `/api/meetings` | CRUD | 會議管理（含 stats.revenue） |
| `/api/attendance` | CRUD | 出席記錄 |
| `/api/settings` | GET/PUT | 系統設定 |
| `/api/stats` | GET | 綜合統計 |
| `/api/receipts` | CRUD | 付款憑證上傳/查詢 |
| `/api/checkin-upload` | POST | 簽到時上傳憑證 |
| `/api/backup` | GET | 資料庫備份 JSON |
| `/api/chat` | POST | AI Chatbot |
| `/api/telegram` | POST | Telegram Webhook |
| `/api/image` | GET | R2 圖片服務 (?name=xxx) |
| `/api/pay` | GET | 支付頁面 |
| `/api/whatsapp-cert` | CRUD | WhatsApp 憑證 |
| `/api/receipt-pdf` | GET | PDF 收據生成 (?cert_id=X) |
| `/api/user-approvals` | GET/POST | 用戶審批（Token 認證） |
| `/api/doc` | GET | API 文件 |

### Skill REST API（Token 認證）
`POST /api/skill` — 35 種 Actions，包括 import_guests、update_payment、meeting_stats、search 等。

### Chatbot Tools（21 個）
`/api/chat` — Qwen AI 驅動，支援 function calling 自動查詢/匯入。

## 部署

```bash
# 部署到 Cloudflare Pages
npx wrangler pages deploy . --project-name fotan --branch main --commit-dirty

# D1 資料庫遷移
npx wrangler d1 execute fotan-db --remote --file=migrations/0001_schema.sql

# 設定 Secrets
npx wrangler pages secret put QWEN_API_KEY --project-name fotan
npx wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name fotan
```

## 前端架構

```
admin/
  index.html          # 後台主頁（SPA）
assets/
  css/admin.css       # 後台樣式（響應式，支援手機/平板/桌面）
  js/admin.js         # 後台邏輯（~3200 行）
  js/app.js           # 備用簽到頁腳本
index.html            # 主簽到頁（單檔 HTML + inline CSS/JS）
login.html            # 用戶登入頁
register.html         # 用戶註冊頁
```

## Functions 架構

```
functions/
  api/                # 18 個 API 端點
  lib/
    chatbot.js        # 共用 Chatbot 邏輯（Qwen function calling）
    font-loader.js    # PDF 中文字型載入
    receipt-template.js
```

## 保安機制

| 機制 | 說明 |
|------|------|
| 登入防爆破 | 同 IP 5 次失敗鎖 15 分鐘 |
| Cookie | HttpOnly + SameSite=Strict + Secure |
| 角色權限 | admin / manager / staff / viewer 四級 |
| Skill Token | SHA-256 + 90 天有效期 |
| 改密碼 | 需驗證舊密碼 |

## 截圖清單

| # | 檔案 | 內容 |
|---|------|------|
| 1 | 01-main-unchecked.png | 主頁未簽到名單 |
| 2 | 02-main-checked.png | 主頁已簽到名單 |
| 3 | 03-payment-modal.png | 付款頁面 |
| 4 | 04-person-card.png | 個人資料卡 + vCard |
| 5 | 05-admin-dashboard.png | 後台總覽 |
| 6 | 06-admin-checkin.png | 簽到操作 |
| 7 | 07-admin-meetings.png | 會議管理 |
| 8 | 08-admin-members.png | 會員管理 |
| 9 | 09-admin-guests.png | 來賓管理 |
| 10 | 10-admin-settings.png | 系統設定 |
| 11 | 11-admin-skill.png | Skill 頁面 |
| 12 | 12-admin-users.png | 用戶管理 |
| 13 | 13-admin-wacert.png | 入錢憑證 |
| 14 | 14-admin-chatbot.png | Chatbot 面板 |
| 15 | 15-login.png | 用戶登入頁 |
| 16 | 16-register.png | 用戶註冊頁 |
