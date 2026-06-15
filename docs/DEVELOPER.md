# 開發文件 v3.7

## 技術架構

```
fotan/
├── index.html                  # 嘉賓簽到主頁（單檔 inline CSS + JS）
├── admin/
│   └── index.html              # 後台管理 SPA
├── assets/
│   ├── css/admin.css           # 後台樣式
│   └── js/admin.js             # 後台邏輯（~2250 行）
├── functions/
│   ├── api/                    # Pages Functions API 端點（21 個）
│   │   ├── members.js, guests.js, meetings.js, attendance.js
│   │   ├── auth.js, chat.js, chat-upload.js, image-analyze.js
│   │   ├── telegram.js, skill-tokens.js, skill.js, skill-import.js
│   │   ├── backup.js, settings.js, stats.js, receipts.js
│   │   ├── checkin-upload.js, image.js, fps-redirect.js, alipay-redirect.js
│   └── lib/
│       └── chatbot.js          # Chatbot 核心（21 tools）
├── migrations/                 # D1 遷移 SQL（9 個）
├── skills/lobster-db.md        # 火炭會 Skill
├── docs/                       # USER_GUIDE, ADMIN_GUIDE, DEVELOPER, API, REQUIREMENTS
├── screenshots/                # 16 張自動截圖
└── package.json
```

## 部署

```bash
# 使用 wrangler v3（v4 有 Functions 遺失 bug）
npx wrangler@3 pages deploy . --project-name fotan --branch main --commit-dirty
```

## Cloudflare 資源

| 資源 | 名稱 | ID |
|------|------|-----|
| Pages | fotan | — |
| D1 | fotan-db | 96baaebb-c825-4dcc-8229-e55abab0d474 |
| R2 | fotan-bucket | — |

## 資料庫（8 表）

members, guests, meetings(member_fee/committee_fee/guest_fee/early_bird_fee/walk_in_fee), attendance(payment:paid/free/unpaid, price_tier, table_number), settings, member_receipts, telegram_messages, skill_tokens

## API 端點（21 個）

| 端點 | 方法 | 說明 |
|------|------|------|
| /members | CRUD | 會員（?all=1 含非活躍） |
| /guests | CRUD | 來賓 |
| /meetings | CRUD | 會議 + 5 層收費 + revenue |
| /attendance | CRUD | 出席 + price_tier |
| /auth | POST | login/check/change_pwd |
| /chat | POST | Chatbot（Qwen function calling） |
| /telegram | GET/POST | Bot webhook |
| /skill-tokens | CRUD | Token 管理 |
| /skill | POST | 17 種操作（Token 保護） |
| /settings | GET/PUT | 系統設定 |
| /stats | GET | 統計 + revenue |
| /receipts | CRUD | 收據（R2） |
| /checkin-upload | POST | 簽到憑證上傳 |
| /backup | GET | JSON 備份 |
| /image | GET | R2 圖片 |

## Skill REST API（18 actions）

import_guests, bulk_create_members, create_member, update_member, update_guest, delete_person, search, update_payment, update_table, update_meeting, mark_arrival, list_meetings, meeting_stats, payment_summary, list_attendance, get_settings, export_stats, upload_image

## Chatbot Tools（21 個）

get_meetings, get_attendance, get_member_stats, search_people, get_member_detail, get_guest_list, get_payment_summary, get_industry_list, add_guest, bulk_add_guests, add_meeting, update_payment, update_table, mark_arrival, get_settings, delete_attendance, get_receipts, create_member, update_member, bulk_create_members, upload_image

## 多層收費

meetings 表 5 個 fee 欄位 + attendance.price_tier。委員判定：role != '會員' → committee_fee

## 保安

登入防爆破（5次鎖15分鐘）、HttpOnly Cookie、Skill Token 90天、改密碼需舊密碼

## v3.7 更新

- 營收計算修正：只計 `paid` 排除 `free`
- 總覽頁已收人數拆分為「收費」+「免費」兩卡片
- 會員管理頁卡片直接顯示付款憑證縮圖
- 簽到頁會員卡片顯示付款憑證縮圖
- `loadMemberReceiptsForCards` + `renderCardReceipts` 批次載入機制
