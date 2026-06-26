# 火炭會聚會簽到系統 — 開發手冊 v3.13

## 架構總覽

| 層級 | 技術 | 說明 |
|------|------|------|
| 託管 | Cloudflare Pages | 自訂網域 `fotan.techforliving.net` |
| 後端 | Cloudflare Pages Functions | Edge Workers (JavaScript)，22 個 API 端點 |
| 資料庫 | Cloudflare D1 | SQLite 相容，ID: `96baaebb-c825-4dcc-8229-e55abab0d474` |
| 儲存 | Cloudflare R2 | Bucket: `fotan-bucket`（QR 圖、收據、Telegram 檔案） |
| 前端 | Vanilla JS SPA | 無框架，`index.html`（簽到）+ `admin/index.html`（後台） |
| AI | Qwen (DashScope) | `qwen-plus` + `qwen-vl-plus`，粵語 Chatbot「龍蝦仔」 |
| 圖表 | Chart.js 4.4.0 | 後台總覽頁 |
| 試算表 | SheetJS 0.18.5 | CSV 匯出 |
| PWA | manifest.json + sw.js | 可安裝到手機主畫面 |

## 專案結構

```
fotan/
├── index.html                  # 簽到頁面 SPA（行動優先，max-width 430px）
├── admin/index.html            # 管理後台 HTML 入口
├── assets/
│   ├── css/admin.css           # 後台樣式
│   └── js/admin.js             # 後台 SPA（12 頁面 + Chatbot 面板，~2250 行）
├── functions/
│   ├── api/
│   │   ├── skill.js            # Skill API（31 action，統一 POST 入口）
│   │   ├── attendance.js       # 出席 CRUD（軟清除保留 payment）
│   │   ├── guests.js           # 來賓 CRUD
│   │   ├── members.js          # 會員 CRUD
│   │   ├── meetings.js         # 會議 CRUD + 營收計算
│   │   ├── settings.js         # Key-value 設定
│   │   ├── stats.js            # 彙總統計 + 營收
│   │   ├── auth.js             # 登入（IP 速率限制 5次/15分鐘）
│   │   ├── backup.js           # 完整 DB JSON 匯出
│   │   ├── chat.js             # AI Chatbot (Qwen function calling)
│   │   ├── chat-upload.js      # Chatbot 檔案上傳至 R2
│   │   ├── image.js            # R2 圖片服務
│   │   ├── image-analyze.js    # Qwen VL 圖片分析
│   │   ├── receipts.js         # 會員收據管理（R2）
│   │   ├── checkin-upload.js   # 來賓收據上傳 → 自動標記 paid
│   │   ├── telegram.js         # Telegram Bot Webhook
│   │   ├── skill-tokens.js     # API Token 生命週期管理
│   │   ├── skill-import.js     # 舊版批次來賓匯入
│   │   ├── observers.js        # 觀察員 CRUD
│   │   ├── upload-qr.js        # QR Code 圖片上傳至 R2
│   │   ├── alipay-redirect.js  # Alipay HK 付款頁面
│   │   ├── fps-redirect.js     # FPS 付款頁面
│   │   └── doc.js              # API 自我說明文件
│   └── lib/
│       └── chatbot.js          # Chatbot 核心（system prompt + 32 tools）
├── migrations/                 # D1 遷移 SQL（0001 ~ 0011）
├── skills/lobster-db.md        # Skill API 參考文件
├── docs/                       # 文件
├── chatbot_training.jsonl      # Qwen 訓練資料（74KB）
├── sw.js                       # Service Worker v2
├── manifest.json               # PWA 資訊清單
├── wrangler.toml               # Cloudflare Pages 設定
└── package.json
```

## 資料庫綱要

### members（會員）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT NOT NULL | 中文全名 |
| tel | TEXT DEFAULT '' | |
| email | TEXT DEFAULT '' | |
| professional | TEXT DEFAULT '' | 行業/職稱 |
| role | TEXT DEFAULT '會員' | 會員/主席/副主席/秘書長/幹事 |
| tags | TEXT DEFAULT '' | 逗號分隔（素食、長老等） |
| fee_paid_date | TEXT DEFAULT '' | 會費繳交日期 |
| bio | TEXT | 簡介 |
| table_number | TEXT | |
| seat_order | INTEGER | |
| active | INTEGER DEFAULT 1 | 軟刪除設為 0 |
| created_at | TEXT | |

### guests（來賓）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT NOT NULL | |
| professional | TEXT DEFAULT '' | |
| tel | TEXT DEFAULT '' | |
| invited_by | TEXT DEFAULT '' | 邀請人 |
| meeting_id | INTEGER FK→meetings | |
| vip | INTEGER DEFAULT 0 | 1 = 貴賓 |
| table_number | TEXT | |
| seat_order | INTEGER | |
| active | INTEGER DEFAULT 1 | 軟刪除設為 0 |
| created_at | TEXT | |

### meetings（會議）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | |
| date | TEXT NOT NULL | YYYY-MM-DD |
| type | TEXT DEFAULT 'regular' | regular/special/anniversary |
| collector | TEXT DEFAULT '' | 收款負責人 |
| guest_fee | INTEGER DEFAULT 0 | 來賓費用 |
| member_fee | INTEGER DEFAULT 0 | 會員費用 |
| committee_fee | INTEGER DEFAULT 0 | 委員費用（預設 $220） |
| early_bird_fee | INTEGER DEFAULT 0 | 早鳥費用 |
| walk_in_fee | INTEGER DEFAULT 0 | 現場費用 |
| table_number | TEXT | 枱數 |
| created_at | TEXT | |

### attendance（出席）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | |
| meeting_id | INTEGER FK→meetings CASCADE | |
| person_type | TEXT CHECK('member','guest','observer') | 多型 FK |
| person_id | INTEGER | 指向 members/guests/observers |
| substitute | TEXT DEFAULT '' | 代理人姓名 |
| payment | TEXT DEFAULT '' | paid/free/unpaid |
| payment_method | TEXT DEFAULT '' | cash/payme/alipay/fps/receipt_uploaded/bank_transfer |
| arrival_time | TEXT DEFAULT '' | HH:MM 或 absent |
| remark | TEXT DEFAULT '' | |
| table_number | TEXT | |
| seat_order | INTEGER | |
| price_tier | TEXT DEFAULT '' | committee/member/guest/early_bird/walk_in |

### 其他表格
| 表格 | 主要欄位 |
|------|----------|
| settings | key TEXT PK, value TEXT NOT NULL |
| skill_tokens | id, token, name, created_at, expires_at, active |
| member_receipts | id, member_id FK, filename, created_at |
| observers | id, name, professional, chapter, invited_by, active |
| telegram_messages | id, chat_id, username, content, created_at |
| telegram_files | id, chat_id, filename, r2_key, content_type, file_size |

## API 端點

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/skill` | POST | Token `lob_xxxx` | 31 action 統一入口 |
| `/api/attendance` | GET/POST/PUT/DELETE | Cookie | 出席 CRUD |
| `/api/guests` | GET/POST/PUT/DELETE | Cookie | 來賓 CRUD |
| `/api/members` | GET/POST/PUT/DELETE | Cookie | 會員 CRUD |
| `/api/meetings` | GET/POST/PUT/DELETE | Cookie | 會議 CRUD + 統計 |
| `/api/settings` | GET/PUT | Cookie | Key-value 設定 |
| `/api/stats` | GET | Cookie | 彙總統計 + 營收 |
| `/api/auth` | POST/GET | 無 | login/check/change_pwd |
| `/api/backup` | GET | Cookie | 全 DB JSON 匯出 |
| `/api/chat` | POST | Cookie | AI Chatbot (Qwen FC) |
| `/api/chat-upload` | POST | Cookie | Chatbot R2 上傳 |
| `/api/image` | GET | 無 | R2 圖片服務 |
| `/api/image-analyze` | POST | Cookie | Qwen VL 圖片分析 |
| `/api/checkin-upload` | POST | 無 | 來賓收據上傳 |
| `/api/receipts` | GET/POST/DELETE | Cookie | 會員收據管理 |
| `/api/telegram` | POST | Bot Token | Telegram Bot Webhook |
| `/api/skill-tokens` | GET/POST/DELETE | Cookie | Token 管理 |
| `/api/doc` | GET | 無 | API 自我說明文件 |
| `/api/observers` | GET/POST/PUT/DELETE | Cookie | 觀察員 CRUD |
| `/api/alipay-redirect` | GET | 無 | Alipay HK 付款頁 |
| `/api/fps-redirect` | GET | 無 | FPS 付款頁 |

## Skill API — 31 Action

所有操作：`POST /api/skill` + `{"token":"lob_xxxx","action":"...","...":"..."}`

### 會員 (5)
| Action | 說明 |
|--------|------|
| `list_members` | 列出所有活躍會員 |
| `create_member` | 新增會員 |
| `bulk_create_members` | 批次匯入（自動跳過重複） |
| `update_member` | 更新會員（10+ 欄位可選） |
| `delete_person` | 軟刪除 active=0，保留 attendance + payment |

### 來賓 (4)
| Action | 說明 |
|--------|------|
| `list_guests` | 列出所有活躍來賓 |
| `create_guest` | 新增來賓 + 自動建立 attendance |
| `import_guests` | 批次匯入 |
| `update_guest` | 更新來賓（9+ 欄位可選） |

### 會議 (5)
| Action | 說明 |
|--------|------|
| `list_meetings` | 列出所有會議（date DESC） |
| `create_meeting` | 建立會議（date, type, 5 個費用欄位） |
| `update_meeting` | 更新會議 |
| `delete_meeting` | ⚠️ 硬刪除會議 + 全部 attendance |
| `meeting_stats` | 會議統計（人數 + 營收） |

### 出席 (7)
| Action | 說明 |
|--------|------|
| `add_to_meeting` | 將人員加入會議 |
| `list_attendance` | 出席名單（含姓名、行業） |
| `update_payment` | 更新付款狀態 + price_tier |
| `mark_arrival` | 標記簽到（HH:MM 或 absent） |
| `payment_summary` | 付款摘要 |
| `delete_attendance` | 軟清除（保留 payment） |
| `delete_attendance_batch` | 批次軟清除 |

### 排位 (5)
| Action | 說明 |
|--------|------|
| `list_tables` | 完整枱號地圖（枱名 + 人員 + 座位） |
| `update_table_names` | 設定枱名 JSON mapping |
| `update_table` | 單人枱號 + 座位（雙向同步至 person） |
| `auto_seat` | 自動排位（委員/vip/會員/來賓/標籤/姓氏） |
| `move_table` | 整枱搬人（容量檢查 + 強制搬） |

### 其他 (5)
| Action | 說明 |
|--------|------|
| `search` | 跨 members + guests 搜尋 |
| `get_settings` | 查詢所有設定 |
| `update_settings` | 批次更新設定 |
| `export_stats` | 綜合統計匯出 |
| `upload_image` | Base64 圖片上傳至 R2 |

## Chatbot Tools（32 個）

functions/lib/chatbot.js 定義，Qwen function calling，auto tool_choice，最多 2 輪。角色為粵語助手「龍蝦仔」🦞。

## 業務規則

1. **未付款不能簽到**：`arrival_time` 設定時 `payment` 必須是 `paid` 或 `free`。4 層強制：attendance.js PUT/POST、skill.js mark_arrival、admin.js confirmCheckin、chatbot
2. **費用結構**：5 級（committee/member/guest/early_bird/walk_in）。委員判定：role ≠ '會員'
3. **營收計算**：SUM(對應費用 WHERE payment='paid')，不含 free
4. **軟刪除**：member/guest SET active=0（不 DELETE row）。attendance 軟清除 SET arrival_time/table_number/seat_order/substitute/remark = NULL（保留 payment + payment_method）
5. **delete_person**：member 同 guest 一致，只 set active=0，attendance 全保留
6. **delete_meeting**：hard DELETE meeting + 全部 attendance（⚠️ 含付款記錄）
7. **排位 ≠ 簽到**：排位只改 table_number + seat_order，不改 payment，不 create attendance
8. **Auth 速率限制**：IP-based，5 次失敗 → 15 分鐘封鎖
9. **DELETE method**：Cloudflare WAF 封鎖，後台用 PUT {active:0} 軟刪除，Skill API 用 POST

## 環境變數

在 Cloudflare Dashboard 設定（不在 wrangler.toml）：
- `ADMIN_PASSWORD` — bcrypt 雜湊的管理員密碼
- `QWEN_API_KEY` — DashScope International API Key
- `TELEGRAM_BOT_TOKEN` — Telegram Bot Token
- `TELEGRAM_WEBHOOK_SECRET` — Telegram Webhook Secret

## 部署

```bash
# 部署（必須用 wrangler v3，v4 有 Functions bug）
npx wrangler@3 pages deploy . --project-name fotan --branch main

# D1 遷移
npx wrangler d1 execute fotan-db --remote --file=migrations/0001_schema.sql

# 臨時 SQL
npx wrangler d1 execute fotan-db --remote --command "SELECT * FROM meetings"
```

## Git Remote

```
https://github.com/ai-caseylai/fotan-bni-checkin
```
