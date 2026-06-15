# 需求書 — 火炭會聚會簽到系統

## 專案背景

火炭會（Fo Tan Chapter）為香港本地商會組織，每月舉辦聚會，需要一套完整的簽到及管理系統，支援會員/來賓管理、付款追蹤、簽到操作、報表統計。

## 核心需求

### 1. 嘉賓簽到主頁（Mobile First）
- A-Z 姓名排序
- 付款狀態即時顯示（已付款/未付款）
- 未付款者點擊直接跳轉付款頁面（PayMe/Alipay/FPS）
- 付款憑證上傳
- 簽到確認 + 音效回饋
- iOS 風格底部 Tab Bar（未簽到/已簽到/流程/委員/關於）
- 枱號顯示（每人獨立枱號）
- 個人資料卡 + vCard 下載
- 每枱 12 人上限

### 2. 後台管理系統（SPA）
- **總覽**：Chart.js 圖表、CSV 匯出
- **簽到操作**：打卡、付款三態（paid/free/unpaid）、枱號設定、缺席標記
- **會議管理**：CRUD、列表/日曆雙模式、A-Z 排序、付款篩選、複製上次與會會員
- **會員管理**：CRUD、卡片/表格雙模式、憑證上傳、出席歷史
- **來賓管理**：CRUD、依會議篩選、付款狀態顯示
- **系統設定**：Key-value 設定（標題、付款連結、QR、密碼、跳過簽到開關）
- **Q&A 訓練**：Chatbot 訓練數據管理
- **Skill 頁面**：Token 管理、文件下載

### 3. 付款系統
- 三種付款方式：憑證上傳、免費嘉賓、現金付款
- 三種付款狀態：paid（💰）、free（🆓）、unpaid（❌💰）
- 付款憑證上傳至 R2，支援多張
- 簽到憑證自動標記已付

### 4. AI Chatbot（龍蝦仔🦞）
- Qwen function calling，港式廣東話
- 21 個 function calling tools（100% GUI 對應）
- 支援 Excel 自動解析匯入
- 圖片 AI 分析（Qwen VL）
- 多輪對話

### 5. Telegram Bot（@fotanbot）
- 文字對話 → Chatbot 回覆
- 圖片 → R2 儲存 + AI 分析
- PDF/檔案 → R2 儲存
- 對話記錄儲存
- 用戶白名單

### 6. Skill REST API
- Token 驗證（90 天有效）
- 17 種操作，100% GUI 對應
- 唔需要 Node.js/Wrangler，純 curl 即可使用
- 支援 OpenClaw / Claude Code 整合

### 7. 保安
- 登入防爆破（IP-based，5 次失敗鎖 15 分鐘）
- HttpOnly + SameSite=Strict + Secure Cookie
- Skill Token 驗證
- 改密碼需舊密碼

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Vanilla HTML/CSS/JS（單檔 SPA） |
| 後端 | Cloudflare Pages Functions |
| 資料庫 | Cloudflare D1（SQLite） |
| 物件儲存 | Cloudflare R2 |
| AI | Qwen（DashScope International）+ Qwen VL |
| 圖表 | Chart.js 4.x |
| 試算表 | SheetJS (xlsx) |
| 部署 | Wrangler CLI |
| Bot | Telegram Bot API |

## 資料庫設計

8 張表：members, guests, meetings, attendance, settings, member_receipts, telegram_messages, skill_tokens

核心表 `attendance` 欄位：meeting_id, person_type, person_id, arrival_time, payment(paid/free/unpaid), payment_method, table_number, substitute, remark

## 非功能性需求

- 部署於 Cloudflare 全球邊緣網路
- HTML/Assets 不緩存（_headers 設定）
- JS/CSS 版本號強制刷新
- API 自動 cache-busting（_t 時間戳）
- 監控：Wrangler tail
- 備份：一鍵 JSON 匯出

## 當前狀態（2026-06-15）

- 會議 #10：2026-06-20 四週年聚餐
- 118 人出席（26 會員 + 92 來賓）
- 已付 58 / 免費 12 / 未付 48
- 系統版本：v3.7
