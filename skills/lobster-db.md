---
name: lobster-db
description: 火炭會龍蝦仔數據庫查詢 Skill — 直接調用 D1 資料庫查詢會員、會議、出席、付款
password: lobster888
---

# 🦞 龍蝦仔數據庫 Skill

此 Skill 直接連接火炭會 Cloudflare D1 資料庫，支援查詢所有表格。

## 密碼保護

使用前需先輸入密碼驗證，預設密碼為 `lobster888`。
第一次調用時 Skill 會要求輸入密碼，驗證通過後該 session 可自由使用。

## 可用指令

用戶可以自然語言詢問，例如：
- 「列出所有未付款的會員」
- 「查詢 6/20 會議付款摘要」
- 「搜尋 Dean 的聯絡資料」
- 「列出所有來賓及其專業」
- 「匯出會員名單 CSV」

## 資料庫連線

- **平台**: Cloudflare D1
- **資料庫**: fotan-db (ID: 96baaebb-c825-4dcc-8229-e55abab0d474)
- **指令**: `npx wrangler d1 execute fotan-db --remote --command "<SQL>"`
- **工作目錄**: `/Users/perry/Documents/fotan`

## 資料表結構

### members
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 會員編號 |
| name | TEXT | 姓名 |
| tel | TEXT | 電話 |
| email | TEXT | 電郵 |
| professional | TEXT | 專業領域 |
| role | TEXT | 角色（會員/委員/主席/副主席/財務/秘書） |
| fee_paid_date | TEXT | 會費付費日 |
| table_number | TEXT | 枱號 |
| bio | TEXT | 會員簡介 |
| active | INTEGER | 1=啟用 |

### guests
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 來賓編號 |
| name | TEXT | 姓名 |
| professional | TEXT | 專業 |
| tel | TEXT | 電話 |
| invited_by | TEXT | 邀請人 |
| meeting_id | INTEGER | 所屬會議 ID |
| table_number | TEXT | 枱號 |
| active | INTEGER | 1=啟用 |

### meetings
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 會議編號 |
| date | TEXT | 日期 YYYY-MM-DD |
| type | TEXT | regular/special/anniversary |
| collector | TEXT | 收款人 |
| guest_fee | INTEGER | 來賓費 |
| table_number | TEXT | 枱號 |

### attendance
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 記錄編號 |
| meeting_id | INTEGER | 會議 ID |
| person_type | TEXT | member/guest |
| person_id | INTEGER | 人員 ID |
| arrival_time | TEXT | 到達時間 |
| payment | TEXT | paid/unpaid/空 |
| payment_method | TEXT | 付款方式 |
| substitute | TEXT | 替代人 |
| remark | TEXT | 備註 |

### settings
| 欄位 | 類型 | 說明 |
|------|------|------|
| key | TEXT | 設定鍵 |
| value | TEXT | 設定值 |

### telegram_messages
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 訊息編號 |
| chat_id | TEXT | Telegram 聊天 ID |
| username | TEXT | 用戶名 |
| first_name | TEXT | 名字 |
| role | TEXT | user/bot |
| content | TEXT | 訊息內容 |
| created_at | DATETIME | 時間 |

## 常用查詢範例

```sql
-- 未付款人士（6/20會議）
SELECT g.name, g.professional, g.tel, a.payment
FROM attendance a JOIN guests g ON a.person_id=g.id
WHERE a.meeting_id=10 AND a.person_type='guest' AND (a.payment='' OR a.payment IS NULL);

-- 付款摘要
SELECT payment, COUNT(*) as cnt FROM attendance WHERE meeting_id=10 GROUP BY payment;

-- 搜尋會員
SELECT * FROM members WHERE name LIKE '%關鍵字%' AND active=1;

-- 會議出席詳情
SELECT m.name, a.arrival_time, a.payment FROM attendance a
JOIN members m ON a.person_id=m.id WHERE a.meeting_id=10 AND a.person_type='member';
```

## 回覆格式

- 使用繁體中文
- 列表資料用表格或條列顯示
- 數量統計要明確
- 可直接執行 SQL 並回報結果
