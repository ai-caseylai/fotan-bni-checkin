# 開發文件

## 技術架構

```
fotan/
├── index.html                  # 嘉賓簽到主頁（單檔 inline CSS + JS）
├── admin/
│   └── index.html              # 後台管理 SPA
├── assets/
│   ├── css/admin.css           # 後台樣式
│   └── js/admin.js             # 後台邏輯（~1700 行）
├── functions/
│   ├── api/                    # Pages Functions API 端點
│   │   ├── members.js          # CRUD 會員
│   │   ├── guests.js           # CRUD 來賓
│   │   ├── meetings.js         # CRUD 會議 + 統計
│   │   ├── attendance.js       # CRUD 出席 + table_number
│   │   ├── auth.js             # 登入/驗證/改密碼/防爆破
│   │   ├── chat.js             # Chatbot API（調用 lib/chatbot.js）
│   │   ├── chat-upload.js      # Chat 檔案上傳到 R2
│   │   ├── image-analyze.js    # Qwen VL 圖片分析
│   │   ├── telegram.js         # Telegram Bot Webhook
│   │   ├── skill-tokens.js     # Skill Token CRUD + 驗證
│   │   ├── backup.js           # 全資料庫 JSON 匯出
│   │   ├── settings.js         # 系統設定 CRUD
│   │   ├── stats.js            # 統計數據
│   │   ├── receipts.js         # 收據 CRUD + R2
│   │   ├── checkin-upload.js   # 簽到憑證上傳
│   │   ├── image.js            # R2 圖片服務
│   │   ├── fps-redirect.js     # FPS 付款跳轉
│   │   └── alipay-redirect.js  # Alipay 付款跳轉
│   └── lib/
│       └── chatbot.js          # 共用 Chatbot 核心（11 個 tools）
├── migrations/                 # D1 遷移 SQL
│   ├── 0001_schema.sql
│   ├── 0002_settings.sql
│   ├── 0003_member_email_fee.sql
│   ├── 0004_member_receipts.sql
│   ├── 0005_member_professional.sql
│   ├── 0006_member_role.sql
│   ├── 0007_guest_meeting.sql
│   └── 0008_telegram_files.sql
├── skills/
│   └── lobster-db.md           # 火炭會 Skill
├── docs/                       # 使用文件
├── chatbot_training.jsonl      # 300 條 Q&A 訓練數據
├── wrangler.toml               # Cloudflare 配置
├── _headers                    # 快取規則
└── package.json
```

## 部署

```bash
# 部署到 Cloudflare Pages
npx wrangler pages deploy . --project-name fotan --branch main --commit-dirty

# 執行 D1 遷移
npx wrangler d1 execute fotan-db --remote --command "<SQL>"

# 設定 Secret
echo "token" | npx wrangler pages secret put QWEN_API_KEY --project-name fotan
```

## Cloudflare 資源

| 資源 | 名稱 | ID |
|------|------|-----|
| Pages | fotan | — |
| D1 | fotan-db | 96baaebb-c825-4dcc-8229-e55abab0d474 |
| R2 | fotan-bucket | — |
| DNS | fotan.techforliving.net | — |

## 資料庫架構

```sql
-- 會員
CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, tel TEXT, email TEXT,
  professional TEXT, role TEXT DEFAULT '會員',
  fee_paid_date TEXT, table_number TEXT,
  bio TEXT, active INTEGER DEFAULT 1
);

-- 來賓
CREATE TABLE guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, professional TEXT, tel TEXT,
  invited_by TEXT, meeting_id INTEGER,
  table_number TEXT, active INTEGER DEFAULT 1
);

-- 會議
CREATE TABLE meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, type TEXT DEFAULT 'regular',
  collector TEXT, guest_fee INTEGER DEFAULT 0,
  table_number TEXT
);

-- 出席（核心表）
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  person_type TEXT NOT NULL,  -- 'member' | 'guest'
  person_id INTEGER NOT NULL,
  arrival_time TEXT,          -- HH:MM 或 'absent'
  payment TEXT,               -- '' | 'paid' | 'free'
  payment_method TEXT,
  table_number TEXT,          -- 每人每次會議枱號
  substitute TEXT, remark TEXT
);

-- 系統設定（key-value）
CREATE TABLE settings (
  key TEXT PRIMARY KEY, value TEXT
);

-- Telegram 訊息記錄
CREATE TABLE telegram_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT, username TEXT, first_name TEXT,
  role TEXT, content TEXT, created_at DATETIME
);

-- Skill Token
CREATE TABLE skill_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE, name TEXT,
  created_at DATETIME, expires_at TEXT, active INTEGER DEFAULT 1
);
```

## API 端點

全部在 `/api/` 路徑下：

| 端點 | 方法 | 說明 |
|------|------|------|
| /members | GET/POST/PUT/DELETE | 會員 CRUD |
| /guests | GET/POST/PUT/DELETE | 來賓 CRUD |
| /meetings | GET/POST/PUT/DELETE | 會議 CRUD（GET 含統計） |
| /attendance | GET/POST/PUT/DELETE | 出席 CRUD |
| /auth | POST | login/check/change_pwd |
| /chat | POST | Chatbot（Qwen function calling） |
| /telegram | GET/POST | Webhook + setup/info |
| /skill-tokens | GET/POST/DELETE | Token CRUD + verify |
| /settings | GET/PUT | 系統設定 |
| /stats | GET | 統計數據 |
| /receipts | GET/POST/DELETE | 收據管理 |
| /backup | GET | JSON 備份 |
| /image | GET | R2 圖片服務 |

## Chatbot 架構

```
chat.js → lib/chatbot.js
  ├── getSystemPrompt()      # 港式廣東話提示
  ├── getTools()             # 11 個 function definitions
  ├── executeFunction(env, name, args)  # SQL 邏輯
  └── callQwen(env, msgs, apiKey)      # Qwen API 調用 + 多輪 function calling

telegram.js → lib/chatbot.js (同上)
```

### Function Calling Tools
`get_meetings`, `get_attendance`, `get_member_stats`, `search_people`, `get_member_detail`, `get_guest_list`, `get_payment_summary`, `get_industry_list`, `add_guest`, `bulk_add_guests`, `add_meeting`

## 保安機制

1. **登入防爆破** — IP-based，5 次失敗鎖 15 分鐘（存在 settings 表）
2. **Cookie** — `fotan_auth`，HttpOnly + SameSite=Strict + Secure，24h
3. **改密碼** — 需驗證舊密碼
4. **Skill Token** — 三個月有效期，API 驗證

## 前端架構

### 主頁（index.html）
- 單檔 HTML，inline CSS + JS
- Web Audio API 簽到音效
- vCard 生成（data URI）
- iOS 風格底部 tab bar（5 個 tab）

### 後台（admin/index.html + assets/）
- SPA 架構，`switchPage()` 路由
- 8 個頁面模組
- Chart.js 圖表
- SheetJS (xlsx) Excel 解析
- Chatbot Session localStorage CRUD

## 快取策略

- `_headers` 檔設定 HTML/Assets 不緩存
- JS/CSS 版本號 `?v=32` 強制刷新
- API 請求自動加 `_t` 時間戳

## Telegram Bot

- Webhook URL: `https://fotan.techforliving.net/api/telegram`
- 支援文字對話、圖片/PDF 上傳到 R2、圖片 AI 分析
- 所有對話自動記錄到 `telegram_messages` 表
- 用戶白名單支援（settings.telegram_whitelist）
