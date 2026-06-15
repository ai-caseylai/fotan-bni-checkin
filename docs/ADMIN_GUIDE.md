# 後台管理手冊

## 登入

1. 開啟 **https://fotan.techforliving.net/admin**
2. 輸入管理密碼

![登入頁](../screenshots/admin-login.png)

左側 sidebar 有 8 個頁面：總覽、簽到操作、會議管理、會員管理、來賓管理、系統設定、Q&A 訓練、火炭會 Skill

---

## 總覽

![總覽](../screenshots/admin-overview.png)

- 統計卡片：總會議、會員人數、出席記錄
- Chart.js 圖表：出席趨勢 + 付款分佈
- 會議列表：點擊展開出席詳情、A-Z 排序、付款篩選
- CSV 匯出：摘要 / 詳細

---

## 簽到操作

![簽到操作](../screenshots/admin-checkin.png)

- 選擇會議 → 顯示出席名單（卡片/表格模式）
- 每人顯示：類型、姓名、簽到時間、付款 badge
- **🕐 設定時間** — 簽到時間
- **💰 付款操作** — 點擊出席者彈出付款模態頁

### 付款模態頁

![付款模態](../screenshots/admin-payment-modal.png)

三種付款方法：
- 📤 **憑證付費** — 上傳截圖
- 🆓 **免費嘉賓** — 標記免費
- 💵 **現金付款** — 標記已付
- 🗑️ 移除出席記錄

---

## 會議管理

![會議管理](../screenshots/admin-meetings.png)

- 列表/日曆雙模式
- 會議統計：會員 / 來賓 / 已收 / 未收
- 展開出席名單（A-Z），支援付款篩選
- 新增會議：日期、類型、收款人、來賓費
- ✅ 複製上次會議的與會會員

---

## 會員管理

![會員管理](../screenshots/admin-members.png)

- 卡片/表格雙模式
- 編輯：名稱、電話、電郵、專業、角色、會費日、簡介
- 付款憑證上傳（支援多張，可刪除）
- 出席歷史（會議日期、類型、簽到時間、付款狀態）

---

## 來賓管理

![來賓管理](../screenshots/admin-guests.png)

- 73 位來賓（6/20 聚餐）
- 表格模式含付款狀態欄位（💰已付 / 🆓免費 / ❌💰未付）
- 卡片模式顯示出席記錄
- 編輯：名稱、專業、電話、邀請人、所屬聚會

---

## 系統設定

![系統設定](../screenshots/admin-settings.png)

| 區塊 | 內容 |
|------|------|
| ⚙️ 基本設定 | 頁面標題、載入文字 |
| ✏️ 簽到流程 | 簽到標題、跳過按鈕開關 |
| 🏷️ 狀態標籤 | 已付/未付/已簽到文字 |
| 🍽️ 午餐與節目 | 午餐費、枱號、時間表、主席話 |
| 🏅 委員 & 火炭會 | 委員介紹、火炭會介紹、申請入會 |
| 💳 付款連結 | PayMe/Alipay/FPS 連結、QR 碼上傳 |
| 🔐 密碼 | 修改管理密碼（需舊密碼） |
| 💿 備份 | 一鍵下載全資料庫 JSON |

---

## 火炭會 Skill

![Skill 頁面](../screenshots/admin-skill.png)

- 📥 下載 Skill 檔 / API 手冊 / 使用手冊
- 🔑 Token 管理：新增 Token 時自動彈出 curl 範例
- Token 有效期 90 天

### Skill API（17 種操作）

所有操作經 `POST /api/skill` + token 驗證：

| # | Action | 用途 |
|---|--------|------|
| 1 | `import_guests` | 批次匯入來賓 |
| 2 | `bulk_create_members` | 批次匯入會員 |
| 3 | `create_member` | 新增會員 |
| 4 | `update_member` | 更新會員 |
| 5 | `update_guest` | 更新來賓 |
| 6 | `delete_person` | 刪除人員 |
| 7 | `search` | 搜尋 |
| 8 | `update_payment` | 更新付款 |
| 9 | `update_table` | 更新枱號 |
| 10 | `mark_arrival` | 標記出席 |
| 11 | `list_meetings` | 會議列表 |
| 12 | `meeting_stats` | 會議統計 |
| 13 | `payment_summary` | 付款摘要 |
| 14 | `list_attendance` | 出席名單 |
| 15 | `get_settings` | 系統設定 |
| 16 | `export_stats` | 綜合統計 |
| 17 | `upload_image` | 上傳圖片 |

---

## Chatbot 面板

![Chatbot](../screenshots/admin-chatbot.png)

右側固定面板：
- 💬 港式廣東話 AI 對話（21 個 function calling tools）
- 📎 上傳 Excel 自動導入 / 圖片 AI 分析
- 📱 TG 對話 — 查看 Telegram 聊天記錄
- Session 管理：新增 / 切換 / 刪除對話
