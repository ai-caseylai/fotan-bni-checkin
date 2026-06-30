# 火炭會聚會簽到系統 — 開發手冊 v3.14

## 架構總覽

| 層級 | 技術 | 說明 |
|------|------|------|
| 託管 | Cloudflare Pages | 自訂網域 |
| 後端 | Pages Functions (Edge) | 22 個 API 端點，JavaScript |
| 資料庫 | Cloudflare D1 | SQLite 相容，Edge 讀寫 |
| 儲存 | Cloudflare R2 | 收據、QR 圖、Telegram/WhatsApp 檔案 |
| 前端 | Vanilla JS SPA | 無框架，行動優先 |
| AI | Qwen (DashScope) | 粵語 Chatbot + function calling |
| 圖表 | Chart.js 4.4.0 | 後台總覽 |
| 試算表 | SheetJS 0.18.5 | CSV 匯出 |
| PWA | manifest.json + sw.js | iOS/Android 安裝 |

## 專案結構

```
fotan/
├── index.html                  # 簽到頁面 SPA（行動優先 430px）
├── admin/index.html            # 管理後台入口
├── assets/
│   ├── css/admin.css           # 後台樣式
│   └── js/admin.js             # 後台 SPA（12 頁面 + Chatbot 面板）
├── functions/
│   ├── api/
│   │   ├── skill.js            # Skill API（31 action 統一入口）
│   │   ├── attendance.js       # 出席 CRUD（軟清除保留 payment）
│   │   ├── guests.js           # 來賓 CRUD（含 vip 欄位）
│   │   ├── members.js          # 會員 CRUD（含 role/tags）
│   │   ├── meetings.js         # 會議 CRUD + 營收計算
│   │   ├── settings.js         # Key-value 設定
│   │   ├── stats.js            # 彙總統計
│   │   ├── auth.js             # 登入（IP 速率限制）
│   │   ├── backup.js           # 全 DB JSON 匯出
│   │   ├── chat.js             # AI Chatbot (Qwen FC)
│   │   ├── chat-upload.js      # Chatbot R2 上傳
│   │   ├── image.js            # R2 圖片服務
│   │   ├── image-analyze.js    # Qwen VL 圖片分析
│   │   ├── receipts.js         # 會員收據管理（R2）
│   │   ├── checkin-upload.js   # 來賓收據上傳→自動標記 paid
│   │   ├── telegram.js         # Telegram Bot Webhook
│   │   ├── skill-tokens.js     # API Token 管理
│   │   ├── observers.js        # 觀察員 CRUD
│   │   ├── upload-qr.js        # QR 碼上傳至 R2
│   │   ├── alipay-redirect.js  # Alipay HK 付款頁
│   │   ├── fps-redirect.js     # FPS 付款頁
│   │   └── doc.js              # API 自我說明文件
│   └── lib/
│       └── chatbot.js          # Chatbot 核心（system prompt + 32 tools）
├── migrations/                 # D1 遷移（0001 ~ 0014）
├── skills/lobster-db.md        # Skill API 參考
├── docs/                       # 使用文件 + 開發文件
├── screenshots/                # 截圖
├── screenshot.js               # Puppeteer 截圖腳本
├── sw.js                       # Service Worker
├── manifest.json               # PWA 資訊清單
├── wrangler.toml               # Pages 設定（D1 + R2 綁定）
└── package.json
```

## 資料庫綱要

### members（會員）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK | AUTOINCREMENT |
| name | TEXT NOT NULL | 中文全名 |
| tel | TEXT | |
| email | TEXT | |
| professional | TEXT | 行業/職稱 |
| role | TEXT DEFAULT '會員' | 主席/副主席/秘書長/幹事/會員 |
| tags | TEXT | 逗號分隔標籤 |
| fee_paid_date | TEXT | 會費繳交日 |
| bio | TEXT | 簡介 |
| table_number | TEXT | 枱號 |
| seat_order | INTEGER | 座位次序 |
| active | INTEGER DEFAULT 1 | 0=軟刪除 |
| created_at | TEXT | datetime('now','localtime') |

### guests（來賓）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK | AUTOINCREMENT |
| name | TEXT NOT NULL | |
| professional | TEXT | |
| tel | TEXT | |
| invited_by | TEXT | 邀請人 |
| meeting_id | INTEGER FK→meetings | |
| vip | INTEGER DEFAULT 0 | 1=⭐VIP 嘉賓 |
| table_number | TEXT | |
| seat_order | INTEGER | |
| active | INTEGER DEFAULT 1 | 0=軟刪除 |
| created_at | TEXT | |

### meetings（會議）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK | AUTOINCREMENT |
| date | TEXT NOT NULL | YYYY-MM-DD |
| type | TEXT DEFAULT 'regular' | regular/special/anniversary |
| collector | TEXT | 收款人 |
| guest_fee | INTEGER DEFAULT 0 | |
| member_fee | INTEGER DEFAULT 0 | |
| committee_fee | INTEGER DEFAULT 0 | 委員 $220 |
| early_bird_fee | INTEGER DEFAULT 0 | |
| walk_in_fee | INTEGER DEFAULT 0 | |

### attendance（出席）
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER PK | AUTOINCREMENT |
| meeting_id | INTEGER FK→meetings | ON DELETE CASCADE |
| person_type | TEXT CHECK | member/guest/observer |
| person_id | INTEGER | 多型外鍵 |
| payment | TEXT | paid/free/unpaid |
| payment_method | TEXT | cash/payme/alipay/fps/receipt_uploaded |
| arrival_time | TEXT | HH:MM 或 absent |
| price_tier | TEXT | committee/member/guest/early_bird/walk_in |
| table_number | TEXT | |
| seat_order | INTEGER | |

### 輔助表格
| 表格 | 用途 |
|------|------|
| settings | key-value 系統設定 |
| skill_tokens | API Token（lob_xxx，90天有效） |
| member_receipts | 會員收據（R2 關聯） |
| documents | 通用文件/憑證上傳 |
| telegram_files | Telegram Bot R2 檔案記錄 |
| whatsapp_cert | WhatsApp 入錢憑證 + 人員關聯 |

## API 端點

### 核心 CRUD（Cookie 認證）
| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/members` | GET/POST/PUT/DELETE | 會員 CRUD |
| `/api/guests` | GET/POST/PUT/DELETE | 來賓 CRUD |
| `/api/meetings` | GET/POST/PUT/DELETE | 會議 CRUD + 內嵌 attendance stats |
| `/api/attendance` | GET/POST/PUT/DELETE | 出席 CRUD |
| `/api/settings` | GET/PUT | 系統設定 |
| `/api/stats` | GET | 彙總統計（支援日期範圍） |

### 認證（無需 Cookie）
| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/auth` | GET/POST | ?action=login/check/change_pwd |

### AI & 通訊
| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/chat` | POST | Cookie | Qwen Chatbot（32 function tools） |
| `/api/chat-upload` | POST | Cookie | Chatbot R2 檔案上傳 |
| `/api/image-analyze` | POST | Cookie | Qwen VL 圖片 OCR |
| `/api/telegram` | GET/POST | Bot Token | Telegram Webhook |

### 付款 & 檔案
| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/checkin-upload` | POST | 簽到收據上傳→自動 paid |
| `/api/receipts` | GET/POST/DELETE | 會員收據管理 |
| `/api/image` | GET | R2 圖片服務（?name=xxx） |
| `/api/upload-qr` | POST | 上傳 QR 碼 |
| `/api/alipay-redirect` | GET | Alipay HK 付款頁 |
| `/api/fps-redirect` | GET | FPS 轉數快付款頁 |

### 系統
| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/skill` | POST | Token 認證，31 action |
| `/api/skill-tokens` | GET/POST/DELETE | Token 管理 |
| `/api/backup` | GET | 全 DB JSON 匯出 |
| `/api/doc` | GET | API 自述文件 |

## Skill API — 31 Actions

全部：`POST /api/skill` + `{"token":"lob_xxxx","action":"...","param":"value"}`

### 會員 (5)
| Action | 說明 |
|--------|------|
| `list_members` | 列出所有活躍會員 |
| `create_member` | 新增會員 |
| `bulk_create_members` | 批次匯入（自動跳過重複名） |
| `update_member` | 更新會員（10+ 可選欄位） |
| `delete_person` | 軟刪除 active=0 |

### 來賓 (4)
| Action | 說明 |
|--------|------|
| `list_guests` | 列出所有活躍來賓 |
| `create_guest` | 新增+自動建立 attendance |
| `import_guests` | 批次匯入（含 payment/vip） |
| `update_guest` | 更新來賓 |

### 會議 (5)
| Action | 說明 |
|--------|------|
| `list_meetings` | 會議列表 + stats |
| `create_meeting` | 建立會議（5 種費用） |
| `update_meeting` | 更新會議 |
| `delete_meeting` | ⚠️ CASCADE 刪除 |
| `meeting_stats` | 人數+營收統計 |

### 出席 (7)
| Action | 說明 |
|--------|------|
| `add_to_meeting` | 人員加入會議 |
| `list_attendance` | 出席名單 |
| `update_payment` | 更新付款狀態 |
| `mark_arrival` | 簽到 HH:MM / absent |
| `payment_summary` | 付款摘要 |
| `delete_attendance` | 軟清除 |
| `delete_attendance_batch` | 批次軟清除 |

### 排位 (5)
| Action | 說明 |
|--------|------|
| `list_tables` | 枱號完整地圖 |
| `update_table_names` | 枱名 JSON |
| `update_table` | 單人枱號+座位 |
| `auto_seat` | 自動排位（6 種分組） |
| `move_table` | 整枱搬人 |

### 其他 (5)
| Action | 說明 |
|--------|------|
| `search` | 跨 members+guests 搜尋 |
| `get_settings` | 查詢設定 |
| `update_settings` | 更新設定 |
| `export_stats` | 綜合統計匯出 |
| `upload_image` | Base64→R2 |

## Chatbot Tools（32 個）

`functions/lib/chatbot.js` 定義，Qwen function calling，auto tool_choice，最多 2 輪調用。

角色為粵語助手「龍蝦仔」🦞，支援：
- 查詢會議/出席/統計
- 新增來賓/會員
- 批次匯入
- 付款狀態更新
- 枱號排位（auto_seat/move_table/update_table_names）
- 圖片上傳+分析

## 業務規則

1. **未付款不能簽到**：`arrival_time` 設定時 `payment` 必須為 `paid` 或 `free`。4 層強制：
   - `attendance.js` PUT/POST
   - `skill.js` mark_arrival
   - `admin.js` confirmCheckin
   - Chatbot tool handler

2. **5 級費用**：committee / member / guest / early_bird / walk_in
   - 委員判定：role ≠ '會員'（主席/副主席/秘書長/幹事）

3. **營收計算**：只計 paid，不含 free

4. **軟刪除**：
   - member/guest：SET active=0
   - attendance：清空 arrival_time/table_number/seat_order，保留 payment

5. **delete_meeting**：hard DELETE + CASCADE 全部 attendance（⚠️ 含付款記錄）

6. **排位 ≠ 簽到**：排位只改 table_number + seat_order

7. **Auth 速率限制**：IP-based，5 次失敗→15 分鐘封鎖

8. **DELETE method**：Cloudflare WAF 封鎖，後台用 PUT {active:0} 軟刪除

## 環境變數（Cloudflare Secrets）

| 變數 | 用途 |
|------|------|
| `QWEN_API_KEY` | DashScope International API Key |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook Secret |

管理密碼存於 D1 `settings.admin_password`。

## 部署

```bash
# 部署（wrangler v3/v4）
npx wrangler pages deploy . --project-name fotan --branch main --commit-dirty

# D1 遷移（需先建立 D1）
npx wrangler d1 execute fotan-db --remote --file=migrations/0001_schema.sql

# 上傳 secret
echo "sk-xxx" | npx wrangler pages secret put QWEN_API_KEY --project-name fotan

# 查詢
npx wrangler d1 execute fotan-db --remote --command "SELECT * FROM meetings"
```

## 多站部署（示範站）

從 fotan 複製獨立示範站的步驟：

```bash
# 1. 建立資源
wrangler d1 create demo-db
wrangler r2 bucket create demo-bucket
# 2. 透過 Cloudflare Dashboard 建立 Pages 專案

# 3. 修改 wrangler.toml 指向新資源，執行遷移
wrangler d1 execute demo-db --remote --file=migrations/0001_schema.sql
# ...（全部 15 個遷移）

# 4. 寫入示範資料
# 5. 全域替換 海洋→海洋、fotan.techforliving.net→demo-url
# 6. 部署
wrangler pages deploy . --project-name demo --branch main

# 7. 還原 wrangler.toml
```

## Git

```
https://github.com/ai-caseylai/fotan-bni-checkin
```
