export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await request.json();
    const { messages } = body;
    if (!messages || !messages.length) return Response.json({ error: 'messages required' }, { status: 400, headers: cors });

    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_meetings',
          description: '查詢所有會議列表，包括日期、類型、收款人、來賓費',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_attendance',
          description: '查詢指定會議的出席狀況，包括每位人員的簽到時間、付款狀態。可用於獲取任何會議的詳細出席名單。',
          parameters: {
            type: 'object',
            properties: {
              meeting_id: { type: 'integer', description: '會議 ID，可從 get_meetings 取得' }
            },
            required: ['meeting_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_member_stats',
          description: '取得會員統計數據，包括總人數、出席率、付款率、來賓數量',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_people',
          description: '搜尋會員或來賓，根據名稱查詢聯絡資料（電話、電郵、專業領域）',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: '搜尋關鍵字（人名）' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_member_detail',
          description: '查詢指定會員的詳細資料，包括聯絡資訊、出席歷史、付款紀錄',
          parameters: {
            type: 'object',
            properties: {
              member_id: { type: 'integer', description: '會員 ID' }
            },
            required: ['member_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_guest_list',
          description: '取得所有來賓列表，包括專業領域和邀請人資訊',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_payment_summary',
          description: '查詢會議的付款摘要，統計已付/未付人數和比例。如果不提供 meeting_id，會自動查詢最近一次會議。',
          parameters: {
            type: 'object',
            properties: {
              meeting_id: { type: 'integer', description: '會議 ID（可選，預設為最新會議）' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_industry_list',
          description: '取得火炭會所有會員的行業分類列表',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_guest',
          description: '新增來賓。當用戶說「XXX會來」「XXX參加」「新增來賓XXX」等意圖時觸發。',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '來賓姓名' },
              professional: { type: 'string', description: '專業領域／公司（可選）' },
              tel: { type: 'string', description: '電話（可選）' },
              invited_by: { type: 'string', description: '邀請人（可選）' },
              meeting_id: { type: 'integer', description: '所屬會議ID，預設為最新會議（可選）' }
            },
            required: ['name']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'bulk_add_guests',
          description: '批量新增來賓。當用戶提供多個來賓資訊（如貼上一份名單）時觸發。每個來賓包含姓名、專業、電話、邀請人等。',
          parameters: {
            type: 'object',
            properties: {
              guests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    professional: { type: 'string' },
                    tel: { type: 'string' },
                    invited_by: { type: 'string' }
                  },
                  required: ['name']
                },
                description: '來賓名單陣列'
              },
              meeting_id: { type: 'integer', description: '所屬會議ID（可選，預設為最新會議）' }
            },
            required: ['guests']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'add_meeting',
          description: '新增會議。當用戶提供新會議日期和類型時觸發。',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: '日期 YYYY-MM-DD' },
              type: { type: 'string', description: '類型: regular(例會), special(特別會議), anniversary(週年聚餐)' },
              collector: { type: 'string', description: '收款人（可選）' },
              guest_fee: { type: 'integer', description: '來賓費（可選）' }
            },
            required: ['date', 'type']
          }
        }
      }
    ];

    const systemPrompt = `你是火炭會聚會助理。用繁體中文。回答只用 1-2 句，像 WhatsApp 訊息。不要分析建議。

觸發 → function：
簽到/付款/出席/未付 → get_payment_summary()
會議/聚會/幾時 → get_meetings()
會員統計 → get_member_stats()
來賓/來賓列表 → get_guest_list()
人名/搵人/聯絡 → search_people(query)
新增來賓/XXX會來/XXX參加/XXX出席 → add_guest(name)
批量來賓/貼名單/多個來賓 → bulk_add_guests(guests[])
新增會議 → add_meeting(date,type)

火炭會：75會員 5來賓 | PayMe:payme.hsbc/fotan | WhatsApp:97188675

🔥 四週年聚餐：2026-06-20 沙田帝都酒店國穗軒1樓。11:30交流 12:55開場。主席團+執委10:45到場佈置。

當前日期：${new Date().toISOString().split('T')[0]}`;

    const payload = {
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools,
      tool_choice: 'auto'
    };

    const apiKey = env.QWEN_API_KEY || '';
    if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500, headers: cors });

    // Multi-turn function calling loop (up to 3 rounds)
    let data, choice;
    let msgs = [...messages];
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

      if (!choice?.message?.tool_calls) break; // no more function calls

      msgs.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        const fnName = tc.function.name;
        let fnResult = '';
        try {
          const args = JSON.parse(tc.function.arguments || '{}');
          fnResult = await executeFunction(env, fnName, args);
        } catch (e) {
          fnResult = JSON.stringify({ error: e.message });
        }
        msgs.push({ role: 'tool', tool_call_id: tc.id, content: fnResult });
      }
    }

    return Response.json({
      reply: data.choices?.[0]?.message?.content || '抱歉，我無法處理這個請求。',
      tool_calls: choice?.message?.tool_calls || null
    }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}

async function executeFunction(env, name, args) {
  switch (name) {
    case 'get_meetings': {
      const rows = await env.DB.prepare('SELECT * FROM meetings ORDER BY date DESC LIMIT 10').all();
      return JSON.stringify(rows.results);
    }
    case 'get_attendance': {
      const mid = args.meeting_id;
      const meeting = await env.DB.prepare('SELECT * FROM meetings WHERE id=?').bind(mid).first();
      const att = await env.DB.prepare(
        "SELECT a.*, m2.name as person_name FROM attendance a LEFT JOIN members m2 ON a.person_type='member' AND a.person_id=m2.id LEFT JOIN guests g ON a.person_type='guest' AND a.person_id=g.id WHERE a.meeting_id=?"
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
      const receipts = await env.DB.prepare('SELECT id, filename, created_at FROM member_receipts WHERE member_id=? ORDER BY created_at DESC').bind(mid).all();
      return JSON.stringify({ member, attendance: att.results, receipts: receipts.results });
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
      if (!meeting) return JSON.stringify({ error: '找不到此會議' });
      const checkedIn = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND arrival_time!='' AND arrival_time!='absent'").bind(mid).first();
      const paid = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND payment='paid'").bind(mid).first();
      const unpaid = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND (payment='' OR payment='unpaid') AND arrival_time!='absent'").bind(mid).first();
      const absent = await env.DB.prepare("SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND arrival_time='absent'").bind(mid).first();
      const memberTotal = await env.DB.prepare("SELECT COUNT(*) as c FROM members WHERE active=1").first();
      const guestTotal = await env.DB.prepare("SELECT COUNT(*) as c FROM guests WHERE active=1").first();
      const allPeople = memberTotal.c + guestTotal.c;
      return JSON.stringify({
        meeting,
        checked_in: checkedIn.c,
        paid_count: paid.c,
        unpaid_count: unpaid.c,
        absent_count: absent.c,
        total_people: allPeople,
        member_count: memberTotal.c,
        guest_count: guestTotal.c
      });
    }
    case 'get_industry_list': {
      // Collect unique professions from members
      const memberJobs = await env.DB.prepare("SELECT DISTINCT tel FROM members WHERE active=1 AND tel!=''").all();
      // Actually we don't store professional field for members in DB schema.
      // Let's query from guests who have profession, and list member count
      const guestProfessions = await env.DB.prepare("SELECT DISTINCT professional FROM guests WHERE active=1 AND professional!=''").all();
      const memberCount = await env.DB.prepare("SELECT COUNT(*) as c FROM members WHERE active=1").first();
      return JSON.stringify({
        member_count: memberCount.c,
        note: '會員行業資料未在資料庫中結構化儲存。後台會員管理頁面可查看完整名單。來賓行業包括：',
        guest_industries: guestProfessions.results.map(r => r.professional)
      });
    }
    case 'get_meeting_participants':
    case 'get_participants':
      return await executeFunction(env, 'get_attendance', args);
    case 'add_guest': {
      if (!args.name) return JSON.stringify({ error: '請提供來賓姓名' });
      // Get latest meeting if no meeting_id specified
      let mid = args.meeting_id || null;
      if (!mid) {
        const latest = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
        if (latest) mid = latest.id;
      }
      const result = await env.DB.prepare(
        'INSERT INTO guests (name, professional, tel, invited_by, meeting_id) VALUES (?,?,?,?,?)'
      ).bind(args.name, args.professional || '', args.tel || '', args.invited_by || '', mid).run();
      const guest = await env.DB.prepare('SELECT * FROM guests WHERE id=?').bind(result.meta.last_row_id).first();
      return JSON.stringify({ ok: true, message: '已新增來賓：' + args.name, guest, meeting_id: mid });
    }
    case 'bulk_add_guests': {
      const guestList = args.guests || [];
      if (!guestList.length) return JSON.stringify({ error: '請提供來賓名單' });
      let mid = args.meeting_id || null;
      if (!mid) {
        const latest = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
        if (latest) mid = latest.id;
      }
      const added = [];
      for (const g of guestList) {
        const result = await env.DB.prepare(
          'INSERT INTO guests (name, professional, tel, invited_by, meeting_id) VALUES (?,?,?,?,?)'
        ).bind(g.name, g.professional || '', g.tel || '', g.invited_by || '', mid).run();
        added.push({ id: result.meta.last_row_id, name: g.name });
      }
      return JSON.stringify({ ok: true, message: '已批量新增 ' + added.length + ' 位來賓', added, meeting_id: mid });
    }
    case 'add_meeting': {
      if (!args.date || !args.type) return JSON.stringify({ error: '請提供日期和類型' });
      const result = await env.DB.prepare(
        'INSERT INTO meetings (date, type, collector, guest_fee) VALUES (?,?,?,?)'
      ).bind(args.date, args.type, args.collector || '', args.guest_fee || 0).run();
      const meeting = await env.DB.prepare('SELECT * FROM meetings WHERE id=?').bind(result.meta.last_row_id).first();
      return JSON.stringify({ ok: true, message: '已新增會議：' + args.date, meeting });
    }
    default:
      return JSON.stringify({ error: '未知功能：' + name + '。請使用 get_meetings, get_attendance, get_payment_summary, get_member_stats, search_people, get_member_detail, get_guest_list, get_industry_list 其中之一。' });
  }
}
