// Shared chatbot logic for chat.js and telegram.js

export function getTools() {
  return [
    { type: 'function', function: { name: 'get_meetings', description: '查詢所有會議列表', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'get_attendance', description: '查詢指定會議出席狀況', parameters: { type: 'object', properties: { meeting_id: { type: 'integer' } }, required: ['meeting_id'] } } },
    { type: 'function', function: { name: 'get_member_stats', description: '取得會員統計數據', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'search_people', description: '搜尋會員或來賓', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'get_member_detail', description: '查詢會員詳細資料', parameters: { type: 'object', properties: { member_id: { type: 'integer' } }, required: ['member_id'] } } },
    { type: 'function', function: { name: 'get_guest_list', description: '取得來賓列表', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'get_payment_summary', description: '查詢會議付款摘要', parameters: { type: 'object', properties: { meeting_id: { type: 'integer' } }, required: [] } } },
    { type: 'function', function: { name: 'get_industry_list', description: '取得行業分類列表', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'add_guest', description: '新增來賓', parameters: { type: 'object', properties: { name: { type: 'string' }, professional: { type: 'string' }, tel: { type: 'string' }, invited_by: { type: 'string' }, meeting_id: { type: 'integer' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'bulk_add_guests', description: '批次匯入來賓名單，支援姓名、專業、邀請人、付款狀態。當用戶提供名單或列表時使用。每筆會自動檢查重複並建立出席記錄。', parameters: { type: 'object', properties: { guests: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, professional: { type: 'string' }, tel: { type: 'string' }, invited_by: { type: 'string' }, payment: { type: 'string', description: 'paid/已付 或 unpaid/未付' } }, required: ['name'] } }, meeting_id: { type: 'integer', description: '會議ID，預設最新會議' } }, required: ['guests'] } } },
    { type: 'function', function: { name: 'add_meeting', description: '新增會議', parameters: { type: 'object', properties: { date: { type: 'string' }, type: { type: 'string' }, collector: { type: 'string' }, guest_fee: { type: 'integer' } }, required: ['date', 'type'] } } }
  ];
}

export function getSystemPrompt() {
  return `你是火炭會聚會助理「龍蝦仔」🦞。用港式地道廣東話回覆，語氣親切風趣，似朋友WhatsApp傾計咁。每句1-2句，唔好太長。唔好用Markdown。

格式規則：每筆資料之間用空行分隔（即兩個換行）。名單用「名｜專業｜電話」格式。一定要有分行！唔准全部黐埋一齊！

火炭會：75會員 5來賓 | PayMe:payme.hsbc/fotan | WhatsApp:97188675
📋 匯入規則：用戶貼名單時，自動調用 bulk_add_guests。唔好填 meeting_id（等系統自動用最新會議）。唔好自己作任何 ID！格式：「姓名 專業 💰/未付」。
🔥 四週年聚餐：2026-06-20 沙田帝都酒店國穗軒1樓。11:30交流 12:55開場。

當前日期：${new Date().toISOString().split('T')[0]}`;
}

export async function executeFunction(env, name, args) {
  switch (name) {
    case 'get_meetings': {
      const rows = await env.DB.prepare('SELECT * FROM meetings ORDER BY date DESC LIMIT 10').all();
      return JSON.stringify(rows.results);
    }
    case 'get_attendance': {
      const mid = args.meeting_id;
      const meeting = await env.DB.prepare('SELECT * FROM meetings WHERE id=?').bind(mid).first();
      const att = await env.DB.prepare(
        "SELECT a.* FROM attendance a WHERE a.meeting_id=?"
      ).bind(mid).all();
      return JSON.stringify({ meeting, attendance: att.results });
    }
    case 'get_member_stats': {
      const total = await env.DB.prepare('SELECT COUNT(*) as c FROM members WHERE active=1').first();
      const guestCount = await env.DB.prepare('SELECT COUNT(*) as c FROM guests WHERE active=1').first();
      const lastMtg = await env.DB.prepare("SELECT * FROM meetings ORDER BY date DESC LIMIT 1").first();
      let attCount = 0;
      if (lastMtg) {
        const a = await env.DB.prepare('SELECT COUNT(*) as c FROM attendance WHERE meeting_id=?').bind(lastMtg.id).first();
        attCount = a.c;
      }
      return JSON.stringify({ member_count: total.c, guest_count: guestCount.c, last_meeting: lastMtg, last_attendance_count: attCount });
    }
    case 'search_people': {
      const q = '%'+args.query+'%';
      const members = await env.DB.prepare('SELECT id,name,tel,email FROM members WHERE name LIKE ? AND active=1 LIMIT 5').bind(q).all();
      const guests = await env.DB.prepare('SELECT id,name,tel,professional,invited_by FROM guests WHERE name LIKE ? AND active=1 LIMIT 5').bind(q).all();
      return JSON.stringify({ members: members.results, guests: guests.results });
    }
    case 'get_member_detail': {
      const mid = args.member_id;
      const member = await env.DB.prepare('SELECT * FROM members WHERE id=? AND active=1').bind(mid).first();
      if (!member) return JSON.stringify({ error: '找不到此會員' });
      const att = await env.DB.prepare(
        'SELECT a.*, m.date, m.type as meeting_type FROM attendance a JOIN meetings m ON a.meeting_id=m.id WHERE a.person_type=? AND a.person_id=? ORDER BY m.date DESC LIMIT 10'
      ).bind('member', mid).all();
      return JSON.stringify({ member, attendance: att.results });
    }
    case 'get_guest_list': {
      const guests = await env.DB.prepare('SELECT * FROM guests WHERE active=1 ORDER BY id').all();
      return JSON.stringify({ guests: guests.results, count: guests.results.length });
    }
    case 'get_payment_summary': {
      let mid = args.meeting_id;
      if (!mid) {
        const latest = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
        if (!latest) return JSON.stringify({ error: '沒有任何會議記錄' });
        mid = latest.id;
      }
      const meeting = await env.DB.prepare('SELECT * FROM meetings WHERE id=?').bind(mid).first();
      const checkedIn = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND arrival_time!='' AND arrival_time!='absent'").bind(mid).first();
      const paid = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND payment='paid'").bind(mid).first();
      const unpaid = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND (payment='' OR payment='unpaid') AND arrival_time!='absent'").bind(mid).first();
      const absent = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND arrival_time='absent'").bind(mid).first();
      return JSON.stringify({ meeting, checked_in: checkedIn.c, paid_count: paid.c, unpaid_count: unpaid.c, absent_count: absent.c });
    }
    case 'get_industry_list': {
      const guestProfessions = await env.DB.prepare("SELECT DISTINCT professional FROM guests WHERE active=1 AND professional!=''").all();
      const memberCount = await env.DB.prepare("SELECT COUNT(*) as c FROM members WHERE active=1").first();
      return JSON.stringify({ member_count: memberCount.c, guest_industries: guestProfessions.results.map(r => r.professional) });
    }
    case 'add_guest': {
      if (!args.name) return JSON.stringify({ error: '請提供來賓姓名' });
      // Check duplicate
      const existG = await env.DB.prepare('SELECT id FROM guests WHERE name=? AND active=1').bind(args.name).first();
      const existM = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(args.name).first();
      if (existG || existM) return JSON.stringify({ error: '已存在：' + args.name + '（會員或來賓中重複）' });
      let mid = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
      mid = mid ? mid.id : null;
      const result = await env.DB.prepare('INSERT INTO guests (name, professional, tel, invited_by, meeting_id) VALUES (?,?,?,?,?)')
        .bind(args.name, args.professional || '', args.tel || '', args.invited_by || '', mid).run();
      if (mid) {
        await env.DB.prepare('INSERT INTO attendance (meeting_id, person_type, person_id, payment) VALUES (?,?,?,?)')
          .bind(mid, 'guest', result.meta.last_row_id, '').run();
      }
      return JSON.stringify({ ok: true, message: '已新增來賓：' + args.name + '（會議#' + mid + '）' });
    }
    case 'bulk_add_guests': {
      const guestList = args.guests || [];
      if (!guestList.length) return JSON.stringify({ error: '請提供來賓名單' });
      // Validate meeting_id — always prefer latest meeting
      let mid = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
      mid = mid ? mid.id : null;
      if (args.meeting_id) {
        const check = await env.DB.prepare('SELECT id FROM meetings WHERE id=?').bind(args.meeting_id).first();
        if (!check) return JSON.stringify({ error: '會議 ID ' + args.meeting_id + ' 不存在，請唔好自己作 ID。最新會議係 #' + mid });
        mid = args.meeting_id;
      }
      if (!mid) return JSON.stringify({ error: '未有會議，請先建立會議' });
      let added = 0, skipped = 0, paid = 0, unpaid = 0;
      for (const g of guestList) {
        const name = String(g.name || '').trim();
        if (!name) continue;
        // Check for duplicate in both guests and members
        const existGuest = await env.DB.prepare('SELECT id FROM guests WHERE name=? AND active=1').bind(name).first();
        const existMember = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(name).first();
        if (existGuest || existMember) { skipped++; continue; }
        const result = await env.DB.prepare('INSERT INTO guests (name, professional, tel, invited_by, meeting_id) VALUES (?,?,?,?,?)')
          .bind(name, g.professional || '', g.tel || '', g.invited_by || '', mid).run();
        const guestId = result.meta.last_row_id;
        // Create attendance record with payment status if meeting_id is set
        if (mid) {
          const isPaid = g.payment === 'paid' || g.payment === true || String(g.payment).includes('paid') || String(g.payment).includes('已付');
          const payStatus = isPaid ? 'paid' : '';
          await env.DB.prepare('INSERT INTO attendance (meeting_id, person_type, person_id, payment) VALUES (?,?,?,?)')
            .bind(mid, 'guest', guestId, payStatus).run();
          if (isPaid) paid++; else unpaid++;
        }
        added++;
      }
      return JSON.stringify({ ok: true, message: '已匯入 ' + added + ' 位來賓（跳過 ' + skipped + ' 位重複）', added, skipped, paid_count: paid, unpaid_count: unpaid, meeting_id: mid });
    }
    case 'add_meeting': {
      if (!args.date || !args.type) return JSON.stringify({ error: '請提供日期和類型' });
      await env.DB.prepare('INSERT INTO meetings (date, type, collector, guest_fee) VALUES (?,?,?,?)')
        .bind(args.date, args.type, args.collector || '', args.guest_fee || 0).run();
      return JSON.stringify({ ok: true, message: '已新增會議：' + args.date });
    }
    case 'get_meeting_participants':
    case 'get_participants':
      return await executeFunction(env, 'get_attendance', args);
    default:
      return JSON.stringify({ error: '未知功能' });
  }
}

export async function callQwen(env, messages, apiKey) {
  const tools = getTools();
  const payload = {
    model: 'qwen-plus',
    messages: [{ role: 'system', content: getSystemPrompt() }, ...messages],
    tools,
    tool_choice: 'auto'
  };

  if (!apiKey) return { reply: 'API key 未設定。' };

  let msgs = [...messages];
  let data, choice;
  const maxRounds = 2;

  for (let round = 0; round < maxRounds; round++) {
    const pl = round === 0 ? payload : { model: 'qwen-plus', messages: msgs };
    const resp = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(pl)
    });
    data = await resp.json();
    choice = data.choices?.[0];

    if (!choice?.message?.tool_calls) break;

    msgs.push(choice.message);
    for (const tc of choice.message.tool_calls) {
      let fnResult = '';
      try {
        const args = JSON.parse(tc.function.arguments || '{}');
        fnResult = await executeFunction(env, tc.function.name, args);
      } catch (e) {
        fnResult = JSON.stringify({ error: e.message });
      }
      msgs.push({ role: 'tool', tool_call_id: tc.id, content: fnResult });
    }
  }

  return { reply: data.choices?.[0]?.message?.content || '抱歉，我無法處理這個請求。' };
}
