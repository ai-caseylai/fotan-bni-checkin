export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';

  const doc = {
    system: {
      name: '火炭會聚會簽到系統 (Fotan BNI Check-in)',
      version: '3.7',
      base_url: 'https://fotan.techforliving.net',
      api_base: 'https://fotan.techforliving.net/api',
      description: '香港火炭商會每月聚會簽到及管理系統',
    },
    authentication: {
      admin_ui: 'Cookie fotan_auth（登入取得，HttpOnly，24h 有效）',
      skill_api: 'Token 在 JSON body：{"token":"lob_xxxx"}（後台產生，90 天有效）',
      public: '部分端點無需認證（本 doc、skill 操作需 token）',
    },
    database: {
      tables: ['members', 'guests', 'meetings', 'attendance', 'settings', 'member_receipts', 'telegram_messages', 'skill_tokens'],
      d1: 'fotan-db',
      r2: 'fotan-bucket',
    },
    meetings: {
      current: {
        id: 10,
        date: '2026-06-20',
        type: 'anniversary',
        fees: { committee_fee: 220, member_fee: 398, guest_fee: 398, early_bird_fee: 398, walk_in_fee: 398 },
        stats: { total: 118, members: 26, guests: 92, paid: 58, free: 12, unpaid: 48, revenue: 23084 }
      }
    },
    endpoints: {
      '/api/meetings': {
        methods: 'GET,POST,PUT,DELETE',
        auth: 'Cookie',
        get: { params: '?id=10（可選）', returns: '會議列表含 stats（total,members,guests,paid,free,unpaid,revenue）' },
        post: { body: '{date,type,collector,guest_fee,member_fee,committee_fee,early_bird_fee,walk_in_fee,attendance[]}' },
      },
      '/api/attendance': {
        methods: 'GET,POST,PUT,DELETE',
        auth: 'Cookie',
        get: { params: '?meeting_id=X 或 ?person_type=X&person_id=X' },
        post: { body: '{meeting_id,person_type,person_id,payment,arrival_time,remark}' },
        put: { body: '{id,payment,arrival_time,table_number,price_tier,substitute}' },
      },
      '/api/members': {
        methods: 'GET,POST,PUT,DELETE',
        auth: 'Cookie',
        get: { params: '?id=X 或 ?all=1（含非活躍）' },
        post: { body: '{name,tel,email,professional,role,fee_paid_date,table_number,bio}' },
        put: { body: '{id,name,tel,email,professional,role,table_number,bio,active}' },
      },
      '/api/guests': {
        methods: 'GET,POST,PUT,DELETE',
        auth: 'Cookie',
        get: { params: '?id=X' },
        post: { body: '{name,tel,professional,invited_by,meeting_id}' },
        put: { body: '{id,name,tel,professional,invited_by,meeting_id}' },
      },
      '/api/auth': {
        methods: 'GET,POST',
        auth: 'None（login/check）',
        get: { params: '?action=check', returns: '{ok:true/false}' },
        post: { params: '?action=login', body: '{password}', returns: 'Set-Cookie + {ok,message}' },
        post_change: { params: '?action=change_pwd', body: '{oldPassword,password}' },
      },
      '/api/receipts': {
        methods: 'GET,POST,DELETE',
        auth: 'Cookie',
        get: { params: '?member_id=X（列表）或 ?id=X（圖片 binary）' },
        post: { body: '{member_id,filename,data（base64）}', returns: '{id,url}' },
      },
      '/api/settings': {
        methods: 'GET,PUT',
        auth: 'Cookie',
        description: 'Key-value 系統設定（標題、付款連結、QR、密碼等）',
      },
      '/api/stats': {
        methods: 'GET',
        auth: 'Cookie',
        returns: '{total_meetings,total_attendance,member_count,paid_count,free_count,revenue,...}',
      },
      '/api/skill': {
        methods: 'POST',
        auth: 'Token（JSON body token 欄位）',
        description: '17 種操作，見下方 skill_actions',
      },
      '/api/skill-tokens': {
        methods: 'GET,POST,DELETE',
        auth: 'Cookie',
        description: '管理 Skill API token',
      },
      '/api/chat': {
        methods: 'POST',
        auth: 'Cookie',
        body: '{messages:[{role,content}]}',
        description: 'AI Chatbot（Qwen function calling，21 tools）',
      },
      '/api/telegram': {
        methods: 'GET,POST',
        auth: 'None（Bot webhook）',
        get: { params: '?action=chats 或 ?action=messages&chat_id=X' },
      },
      '/api/backup': {
        methods: 'GET',
        auth: 'Cookie',
        returns: 'JSON（所有資料表備份下載）',
      },
      '/api/checkin-upload': {
        methods: 'POST',
        auth: 'None',
        body: '{attendance_id,data（base64）}',
        description: '簽到頁上傳付款憑證並標記已付',
      },
      '/api/image': {
        methods: 'GET',
        auth: 'None',
        params: '?name=檔名',
        description: '從 R2 讀取圖片',
      },
      '/api/upload-qr': {
        methods: 'POST',
        auth: 'Cookie',
        body: '{name,data（base64）}',
        description: '上傳 QR Code 到 R2',
      },
      '/api/chat-upload': {
        methods: 'POST',
        auth: 'Cookie',
        description: '上傳檔案到 Chatbot（R2）',
      },
      '/api/image-analyze': {
        methods: 'POST',
        auth: 'Cookie',
        body: '{data（base64）}',
        description: 'AI 圖片分析（Qwen VL）',
      },
      '/api/doc': {
        methods: 'GET',
        auth: 'None',
        params: '?format=json（預設）或 ?format=markdown',
        description: '本文件 — 無需認證，可分享給其他智能體',
      },
    },
    skill_actions: {
      import_guests: '批次匯入來賓 {guests:[{name,professional,payment}]}',
      bulk_create_members: '批次匯入會員 {members:[{name,tel,email,professional,role}]}',
      create_member: '新增會員 {name,tel,professional,role}',
      update_member: '更新會員 {member_id,name,tel,...}',
      update_guest: '更新來賓 {guest_id,name,professional,...}',
      delete_person: '刪除人員 {person_type,person_id}',
      search: '搜尋人員 {q}',
      update_payment: '更新付款 {attendance_id,payment（paid/free/unpaid）}',
      update_table: '設定枱號 {meeting_id,person_type,person_id,table_number}',
      mark_arrival: '標記簽到 {attendance_id,arrival_time（HH:MM 或 absent）}',
      list_meetings: '列出所有會議',
      update_meeting: '更新會議 {meeting_id,date,type,guest_fee,member_fee,committee_fee,...}',
      meeting_stats: '會議統計（含 revenue，只計 paid）',
      payment_summary: '付款摘要',
      list_attendance: '出席名單（含姓名、付款、枱號）',
      get_settings: '系統設定',
      export_stats: '綜合統計匯出',
      upload_image: '上傳圖片到 R2 {name,data,content_type}',
    },
    chatbot_tools: [
      'get_meetings', 'get_attendance', 'get_member_stats', 'search_people',
      'get_member_detail', 'get_guest_list', 'get_payment_summary', 'get_industry_list',
      'add_guest', 'bulk_add_guests', 'add_meeting', 'update_payment', 'update_table',
      'mark_arrival', 'get_settings', 'delete_attendance', 'get_receipts',
      'create_member', 'update_member', 'bulk_create_members', 'upload_image'
    ],
    pricing_tiers: {
      committee: { condition: "role != '會員'", fee_field: 'committee_fee', default: 220 },
      member: { condition: "role = '會員'", fee_field: 'member_fee', default: 398 },
      guest: { condition: "person_type = 'guest'", fee_field: 'guest_fee', default: 398 },
      early_bird: { condition: "price_tier = 'early_bird'", fee_field: 'early_bird_fee', default: 398 },
      walk_in: { condition: "price_tier = 'walk_in'", fee_field: 'walk_in_fee', default: 398 },
    },
    payment_states: {
      paid: '💰 已付款 — 計入營收',
      free: '🆓 免費 — 不計入營收（v3.7 起）',
      unpaid: '❌💰 未付款',
    },
    important_notes: [
      'v3.7 起 revenue 只計算 payment=paid，不含 free',
      'meeting_stats、stats、meetings 三個端點的 revenue 計算已全線同步',
      '部署必須使用 wrangler@3（v4.100.0 有 Functions 遺失 bug）',
      'group JID 含 "-" 或以 "120363" 開頭且長度 > 15 需加 @g.us 後綴',
      'raw.timestamp 的 Z 後綴是錯的，用 Info.Timestamp（帶 -03:00）',
    ],
  };

  if (format === 'markdown') {
    let md = `# ${doc.system.name} v${doc.system.version}\n\n`;
    md += `**Base URL**: ${doc.system.base_url}\n`;
    md += `**API Base**: ${doc.system.api_base}\n\n`;
    md += `## 認證\n- Admin UI: ${doc.authentication.admin_ui}\n- Skill API: ${doc.authentication.skill_api}\n\n`;
    md += `## 當前會議\n- 會議 #${doc.meetings.current.id}: ${doc.meetings.current.date} (${doc.meetings.current.type})\n`;
    md += `- 人數: ${doc.meetings.current.stats.total}（${doc.meetings.current.stats.members} 會員 + ${doc.meetings.current.stats.guests} 來賓）\n`;
    md += `- 收費: ${doc.meetings.current.stats.paid} 已付 + ${doc.meetings.current.stats.free} 免費 + ${doc.meetings.current.stats.unpaid} 未付\n`;
    md += `- 營收: $${doc.meetings.current.stats.revenue.toLocaleString()}\n\n`;
    md += `## API 端點\n`;
    for (const [path, info] of Object.entries(doc.endpoints)) {
      md += `### ${path}\n- Methods: ${info.methods}\n- Auth: ${info.auth}\n`;
      if (info.description) md += `- ${info.description}\n`;
      if (info.get) md += `- GET: ${info.get.params || ''} → ${info.get.returns || ''}\n`;
      if (info.post && typeof info.post === 'object') md += `- POST: ${JSON.stringify(info.post.body)}\n`;
      md += '\n';
    }
    md += `## Skill Actions\n`;
    for (const [action, desc] of Object.entries(doc.skill_actions)) {
      md += `- **${action}**: ${desc}\n`;
    }
    return new Response(md, { headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  return Response.json(doc, { headers: cors });
}
