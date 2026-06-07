# 開發文件 — 火炭會聚會簽到系統

## 架構

```
fotan/
├── index.html              # 嘉賓簽到 WebApp（單檔，inline CSS + JS）
├── admin/index.html        # 後台管理（Desktop/Tablet 優化）
├── assets/
│   ├── css/
│   │   ├── style.css       # 簽到頁樣式（已棄用，改用 inline）
│   │   └── admin.css       # 後台樣式
│   └── js/
│       ├── app.js          # 簽到頁 JS（已棄用，改用 inline）
│       └── admin.js        # 後台 JS
├── functions/api/          # Cloudflare Pages Functions (API)
│   ├── members.js          # 會員 CRUD
│   ├── guests.js           # 來賓 CRUD
│   ├── observers.js        # 觀察員 CRUD
│   ├── meetings.js         # 會議 CRUD
│   ├── attendance.js       # 出席記錄 CRUD
│   ├── stats.js            # 統計數據
│   ├── settings.js         # 文字設定 GET/PUT
│   ├── upload-qr.js        # QR 圖上傳到 R2
│   └── image.js            # 從 R2 讀取圖片
├── migrations/             # D1 資料庫 Migration
│   ├── 0001_schema.sql     # 核心資料表
│   └── 0002_settings.sql   # 文字設定表
├── _headers                # Cloudflare 快取控制
├── wrangler.toml           # Cloudflare 設定
└── sw.js                   # Service Worker（已棄用）
```

## 技術棧

| 層 | 技術 |
|---|---|
| Hosting | Cloudflare Pages |
| API | Cloudflare Pages Functions (JavaScript) |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Admin UI | Vanilla JS + CSS |
| Guest App | 單檔 HTML (inline CSS + JS) |

## 資料庫 Schema

### members
- `id` INTEGER PRIMARY KEY
- `name` TEXT, `tel` TEXT, `active` INTEGER

### guests
- `id` INTEGER PRIMARY KEY
- `name` TEXT, `professional` TEXT, `tel` TEXT, `invited_by` TEXT, `active` INTEGER

### observers
- `id` INTEGER PRIMARY KEY
- `name` TEXT, `professional` TEXT, `chapter` TEXT, `invited_by` TEXT, `active` INTEGER

### meetings
- `id` INTEGER PRIMARY KEY, `date` TEXT, `type` TEXT, `collector` TEXT, `guest_fee` INTEGER

### attendance
- `id` INTEGER PRIMARY KEY, `meeting_id` INTEGER, `person_type` TEXT, `person_id` INTEGER, `substitute` TEXT, `payment` TEXT, `payment_method` TEXT, `arrival_time` TEXT, `remark` TEXT

### settings
- `key` TEXT PRIMARY KEY, `value` TEXT

## 部署

```bash
# 設定 token
export CLOUDFLARE_API_TOKEN=cfut_...
export CLOUDFLARE_ACCOUNT_ID=3498e268169ccb1bd1ad614210804529

# 部署
npx wrangler pages deploy . --project-name=fotan --branch=main
```

## D1 操作

```bash
# 建立資料庫
npx wrangler d1 create fotan-db

# 執行 migration
npx wrangler d1 execute fotan-db --file=migrations/0001_schema.sql
```

## API 端點

| Method | Path | 說明 |
|---|---|---|
| GET | /api/members | 會員列表 |
| POST | /api/members | 新增會員 |
| PUT | /api/members?id=X | 更新會員 |
| DELETE | /api/members?id=X | 刪除會員 |
| GET | /api/guests | 來賓列表（同上 CRUD） |
| GET | /api/observers | 觀察員列表（同上 CRUD） |
| GET | /api/meetings | 會議列表 |
| POST | /api/meetings | 新增會議 |
| GET | /api/meetings?id=X | 會議詳情（含出席） |
| DELETE | /api/meetings?id=X | 刪除會議 |
| GET | /api/attendance?meeting_id=X | 出席記錄 |
| POST | /api/attendance | 新增出席 |
| PUT | /api/attendance | 更新出席 |
| GET | /api/stats | 統計數據 |
| GET | /api/settings | 取得設定 |
| PUT | /api/settings | 更新設定 |
| POST | /api/upload-qr | 上傳 QR 圖 |

## 簽到邏輯

1. 客人開頁面 → 載入今日會議 + 會員/來賓/觀察員名單
2. 點擊人名 → 確認對話盒
3. 確認 → 記錄出席（時間 + 付款狀態）
   - 會員/觀察員 → payment = "paid"
   - 來賓 → payment = ""（未付）
4. 顯示結果頁：
   - 已付 → 枱號 + 節目表 + 主席話
   - 未付 → 午餐費 + PayMe/WeChat/Alipay 掣 + 「我已付款」掣
5. 來賓付款後點「我已付款」→ 更新 payment = "paid"

## QR 圖上傳

1. 後台 → 文字設定 → 選擇 WeChat/Alipay QR 圖片
2. Base64 encode → POST /api/upload-qr → 儲存到 R2
3. 簽到頁透過 /api/image?name=qr-wechatpay 讀取顯示
