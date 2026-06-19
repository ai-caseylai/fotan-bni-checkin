// Shared chatbot logic for chat.js and telegram.js

export function getTools() {
  return [
    { type: 'function', function: { name: 'get_meetings', description: '查詢所有會議列表', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'get_attendance', description: '查詢指定會議出席狀況', parameters: { type: 'object', properties: { meeting_id: { type: 'integer' } }, required: ['meeting_id'] } } },
    { type: 'function', function: { name: 'get_member_stats', description: '取得會員統計數據', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'search_people', description: '搜尋會員或來賓', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'get_member_detail', description: '查詢會員詳細資料，包含出席記錄', parameters: { type: 'object', properties: { member_id: { type: 'integer' } }, required: ['member_id'] } } },
    { type: 'function', function: { name: 'get_guest_list', description: '取得來賓列表', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'get_payment_summary', description: '查詢會議付款摘要', parameters: { type: 'object', properties: { meeting_id: { type: 'integer' } }, required: [] } } },
    { type: 'function', function: { name: 'get_industry_list', description: '取得行業分類列表', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'add_guest', description: '新增來賓', parameters: { type: 'object', properties: { name: { type: 'string' }, professional: { type: 'string' }, tel: { type: 'string' }, invited_by: { type: 'string' }, meeting_id: { type: 'integer' }, vip: { type: 'integer', description: '1=VIP嘉賓 0=來賓' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'bulk_add_guests', description: '批次匯入來賓名單，支援姓名、專業、邀請人、付款狀態、VIP標記。當用戶提供名單或列表時使用。每筆會自動檢查重複並建立出席記錄。', parameters: { type: 'object', properties: { guests: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, professional: { type: 'string' }, tel: { type: 'string' }, invited_by: { type: 'string' }, payment: { type: 'string', description: 'paid/已付 或 unpaid/未付' }, vip: { type: 'integer', description: '1=VIP嘉賓' } }, required: ['name'] } }, meeting_id: { type: 'integer', description: '會議ID，預設最新會議' } }, required: ['guests'] } } },
    { type: 'function', function: { name: 'add_meeting', description: '新增會議（可設定多層收費）', parameters: { type: 'object', properties: { date: { type: 'string' }, type: { type: 'string' }, collector: { type: 'string' }, guest_fee: { type: 'integer' }, member_fee: { type: 'integer' }, committee_fee: { type: 'integer' }, early_bird_fee: { type: 'integer' }, walk_in_fee: { type: 'integer' } }, required: ['date', 'type'] } } },
    { type: 'function', function: { name: 'update_payment', description: '更新出席記錄的付款狀態', parameters: { type: 'object', properties: { attendance_id: { type: 'integer' }, payment: { type: 'string', description: 'paid/free/unpaid' } }, required: ['attendance_id', 'payment'] } } },
    { type: 'function', function: { name: 'update_table', description: '設定枱號及座位次序', parameters: { type: 'object', properties: { meeting_id: { type: 'integer' }, person_type: { type: 'string' }, person_id: { type: 'integer' }, table_number: { type: 'string' }, seat_order: { type: 'integer', description: '座位次序 1-12' } }, required: ['meeting_id', 'person_type', 'person_id'] } } },
    { type: 'function', function: { name: 'mark_arrival', description: '標記簽到時間或缺席', parameters: { type: 'object', properties: { attendance_id: { type: 'integer' }, arrival_time: { type: 'string', description: 'HH:MM 或 absent' } }, required: ['attendance_id'] } } },
    { type: 'function', function: { name: 'get_settings', description: '查詢系統設定', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'delete_attendance', description: '刪除出席記錄', parameters: { type: 'object', properties: { attendance_id: { type: 'integer' } }, required: ['attendance_id'] } } },
    { type: 'function', function: { name: 'get_receipts', description: '查詢會員付款憑證', parameters: { type: 'object', properties: { member_id: { type: 'integer' } }, required: ['member_id'] } } },
    { type: 'function', function: { name: 'create_member', description: '新增會員', parameters: { type: 'object', properties: { name: { type: 'string' }, tel: { type: 'string' }, email: { type: 'string' }, professional: { type: 'string' }, role: { type: 'string', description: '會員/主席/副主席/秘書長/幹事' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'update_member', description: '更新會員資料（支援 tags、table_number、seat_order、active）', parameters: { type: 'object', properties: { member_id: { type: 'integer' }, name: { type: 'string' }, tel: { type: 'string' }, email: { type: 'string' }, professional: { type: 'string' }, role: { type: 'string', description: '會員/主席/副主席/秘書長/幹事' }, fee_paid_date: { type: 'string' }, bio: { type: 'string' }, tags: { type: 'string', description: '逗號分隔標籤' }, table_number: { type: 'string' }, seat_order: { type: 'integer' }, active: { type: 'integer', description: '0=軟刪除' } }, required: ['member_id'] } } },
    { type: 'function', function: { name: 'bulk_create_members', description: '批次匯入會員名單（Excel/CSV 匯入）', parameters: { type: 'object', properties: { members: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, tel: { type: 'string' }, email: { type: 'string' }, professional: { type: 'string' }, role: { type: 'string' }, fee_paid_date: { type: 'string' } }, required: ['name'] } } }, required: ['members'] } } },
    { type: 'function', function: { name: 'upload_image', description: '上傳圖片到系統（QR Code、設定圖片等）', parameters: { type: 'object', properties: { name: { type: 'string', description: 'R2 檔名，如 qr-alipay' }, data: { type: 'string', description: 'Base64 圖片數據' }, content_type: { type: 'string', description: 'image/png 或 image/jpeg' } }, required: ['name', 'data'] } } },
    { type: 'function', function: { name: 'auto_seat', description: '自動排位：將指定群組的人全部放喺同一張枱（如一張枱唔夠會自動分多張枱）。適用指令如「把所有委員放同一枱」「將VIP放同一張枱」「把所有姓陳的放在同一枱」「把會員放埋一齊」「將素食嘅人放一齊」。', parameters: { type: 'object', properties: { group: { type: 'string', description: 'committee（委員）/ vip（嘉賓）/ member（會員）/ guest（來賓）/ surname（同姓）/ tag（會員標籤）' }, surname: { type: 'string', description: '姓氏，group=surname 時必填，例如 蘇/陳/李' }, tag: { type: 'string', description: '標籤名，group=tag 時必填，例如 素食、長老、需要翻譯' }, table_number: { type: 'string', description: '指定枱號（可選），由呢張枱開始排，唔夠位會自動開新枱' }, max_per_table: { type: 'integer', description: '每枱人數上限，預設12人' } }, required: ['group'] } } },
    { type: 'function', function: { name: 'move_table', description: '移動整枱人去另一張枱。適用指令如「把3號枱所有人移動到5號枱」「將第1枱嘅人搬去第2枱」。', parameters: { type: 'object', properties: { from_table: { type: 'string', description: '來源枱號' }, to_table: { type: 'string', description: '目標枱號' }, force: { type: 'boolean', description: '強制搬，超容量自動分到後續枱號' } }, required: ['from_table', 'to_table'] } } },
    { type: 'function', function: { name: 'list_tables', description: '查詢完整枱號地圖，包括每張枱嘅枱名、所有人名、座位次序、未排位名單、以及枱數統計', parameters: { type: 'object', properties: { meeting_id: { type: 'integer', description: '會議ID，預設最新會議' } }, required: [] } } },
    { type: 'function', function: { name: 'update_table_names', description: '設定枱名，例如將1號枱改名做「VIP枱」、2號枱改做「主家席」', parameters: { type: 'object', properties: { meeting_id: { type: 'integer', description: '會議ID' }, names: { type: 'object', description: '枱名 mapping，例如 {"1":"VIP枱","2":"主家席"}' } }, required: ['meeting_id', 'names'] } } },
    { type: 'function', function: { name: 'create_meeting', description: '新增會議', parameters: { type: 'object', properties: { date: { type: 'string', description: '日期 YYYY-MM-DD' }, type: { type: 'string', description: 'regular/special/anniversary' }, collector: { type: 'string' }, guest_fee: { type: 'integer' }, member_fee: { type: 'integer' }, committee_fee: { type: 'integer' }, early_bird_fee: { type: 'integer' }, walk_in_fee: { type: 'integer' } }, required: ['date'] } } },
    { type: 'function', function: { name: 'add_guest_to_meeting', description: '將一位來賓加入最新會議（建立來賓+attendance record）', parameters: { type: 'object', properties: { name: { type: 'string' }, professional: { type: 'string' }, tel: { type: 'string' }, invited_by: { type: 'string' }, vip: { type: 'integer', description: '1=VIP嘉賓' }, payment: { type: 'string', description: 'paid/free/unpaid' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'add_person_to_meeting', description: '將已有會員或來賓加入最新會議', parameters: { type: 'object', properties: { person_type: { type: 'string', description: 'member 或 guest' }, person_id: { type: 'integer' }, payment: { type: 'string', description: 'paid/free/unpaid' }, table_number: { type: 'string' }, seat_order: { type: 'integer' } }, required: ['person_type', 'person_id'] } } },
    { type: 'function', function: { name: 'list_all_members', description: '列出所有活躍會員', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'list_all_guests', description: '列出所有活躍來賓', parameters: { type: 'object', properties: {}, required: [] } } },
    { type: 'function', function: { name: 'update_settings', description: '更新系統設定', parameters: { type: 'object', properties: { settings: { type: 'object', description: 'key-value 設定對照表' } }, required: ['settings'] } } },
    { type: 'function', function: { name: 'delete_meeting', description: '刪除會議及其所有出席記錄', parameters: { type: 'object', properties: { meeting_id: { type: 'integer' } }, required: ['meeting_id'] } } }
  ];
}

export function getSystemPrompt() {
  return `你是火炭會聚會助理「龍蝦仔」🦞。用港式地道廣東話回覆，語氣親切風趣，似朋友WhatsApp傾計咁。每句1-2句，唔好太長。唔好用Markdown。

格式規則：每筆資料之間用空行分隔（即兩個換行）。名單用「名｜專業｜電話」格式。一定要有分行！唔准全部黐埋一齊！

火炭會：75會員 5來賓 | PayMe:payme.hsbc/fotan | WhatsApp:97188675
📋 匯入規則：用戶貼名單時，自動調用 bulk_add_guests。唔好填 meeting_id（等系統自動用最新會議）。唔好自己作任何 ID！格式：「姓名 專業 💰/未付」。
🔥 四週年聚餐：2026-06-20 沙田帝都酒店國穗軒1樓。11:30交流 12:55開場。
🍽 排位：任何涉及座位/枱號/排位嘅請求，你必須調用 list_tables / auto_seat / move_table / update_table_names function！唔准自己憑空作排位結果！調用完 function 之後先可以根據回傳結果回答。
- list_tables：查詢枱號地圖
- update_table_names：設定枱名（meeting_id + names JSON）
- auto_seat group: committee/vip/member/guest/surname/tag。vip=所有 vip=1 來賓
- move_table：移動整枱人（可加 force:true 強制搬）
- 每枱最多12人，超過會自動分多張枱

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
      const result = await env.DB.prepare('INSERT INTO guests (name, professional, tel, invited_by, meeting_id, vip) VALUES (?,?,?,?,?,?)')
        .bind(args.name, args.professional || '', args.tel || '', args.invited_by || '', mid, args.vip ? 1 : 0).run();
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
        const result = await env.DB.prepare('INSERT INTO guests (name, professional, tel, invited_by, meeting_id, vip) VALUES (?,?,?,?,?,?)')
          .bind(name, g.professional || '', g.tel || '', g.invited_by || '', mid, g.vip ? 1 : 0).run();
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
      await env.DB.prepare('INSERT INTO meetings (date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee) VALUES (?,?,?,?,?,?,?,?)')
        .bind(args.date, args.type, args.collector || '', args.guest_fee || 0, args.member_fee || 0, args.committee_fee || 0, args.early_bird_fee || 0, args.walk_in_fee || 0).run();
      return JSON.stringify({ ok: true, message: '已新增會議：' + args.date });
    }
    case 'update_payment': {
      const validPayments = ['paid', 'free', 'unpaid', ''];
      if (!validPayments.includes(args.payment)) return JSON.stringify({ error: 'payment 必須為 paid/free/unpaid' });
      await env.DB.prepare('UPDATE attendance SET payment=? WHERE id=?').bind(args.payment, args.attendance_id).run();
      return JSON.stringify({ ok: true, message: '已更新付款狀態為 ' + args.payment });
    }
    case 'update_table': {
      const sets = [], vals = [];
      if (args.table_number !== undefined) { sets.push('table_number=?'); vals.push(args.table_number || ''); }
      if (args.seat_order !== undefined) { sets.push('seat_order=?'); vals.push(args.seat_order); }
      if (!sets.length) return JSON.stringify({ error: '請提供 table_number 或 seat_order' });
      vals.push(args.meeting_id, args.person_type, args.person_id);
      await env.DB.prepare(
        'UPDATE attendance SET ' + sets.join(',') + ' WHERE meeting_id=? AND person_type=? AND person_id=?'
      ).bind(...vals).run();
      return JSON.stringify({ ok: true, message: '已更新枱號/座位' });
    }
    case 'mark_arrival': {
      // 未付款不能簽到
      if (args.arrival_time && args.arrival_time !== 'absent') {
        const row = await env.DB.prepare('SELECT payment FROM attendance WHERE id=?').bind(args.attendance_id).first();
        if (!row || (row.payment !== 'paid' && row.payment !== 'free')) {
          return JSON.stringify({ ok: false, message: '未付款不能簽到，請先更新付款狀態' });
        }
      }
      await env.DB.prepare('UPDATE attendance SET arrival_time=? WHERE id=?')
        .bind(args.arrival_time || 'absent', args.attendance_id).run();
      return JSON.stringify({ ok: true, message: '已標記為 ' + (args.arrival_time || 'absent') });
    }
    case 'get_settings': {
      const rows = await env.DB.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.results.forEach(r => { settings[r.key] = r.value; });
      return JSON.stringify({ ok: true, settings });
    }
    case 'delete_attendance': {
      await env.DB.prepare('DELETE FROM attendance WHERE id=?').bind(args.attendance_id).run();
      return JSON.stringify({ ok: true, message: '已刪除出席記錄 #' + args.attendance_id });
    }
    case 'get_receipts': {
      const rows = await env.DB.prepare(
        'SELECT id, filename, created_at FROM member_receipts WHERE member_id=? ORDER BY created_at DESC'
      ).bind(args.member_id).all();
      return JSON.stringify({ ok: true, receipts: rows.results, count: rows.results.length });
    }
    case 'create_member': {
      if (!args.name) return JSON.stringify({ error: '請提供會員姓名' });
      const exist = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(args.name).first();
      if (exist) return JSON.stringify({ error: '會員 ' + args.name + ' 已存在' });
      const result = await env.DB.prepare(
        'INSERT INTO members (name, tel, email, professional, role) VALUES (?,?,?,?,?)'
      ).bind(args.name, args.tel || '', args.email || '', args.professional || '', args.role || '會員').run();
      return JSON.stringify({ ok: true, message: '已新增會員：' + args.name, member_id: result.meta.last_row_id });
    }
    case 'update_member': {
      const fields = [];
      const values = [];
      for (const f of ['name','tel','email','professional','role','fee_paid_date','bio','tags','table_number','seat_order','active']) {
        if (args[f] !== undefined) { fields.push(f+'=?'); values.push(args[f]); }
      }
      if (!fields.length) return JSON.stringify({ error: '請提供要更新的欄位' });
      values.push(args.member_id);
      await env.DB.prepare('UPDATE members SET '+fields.join(',')+' WHERE id=?').bind(...values).run();
      return JSON.stringify({ ok: true, message: '已更新會員 #' + args.member_id });
    }
    case 'bulk_create_members': {
      const memberList = args.members || [];
      if (!memberList.length) return JSON.stringify({ error: '請提供會員名單' });
      let added = 0, skipped = 0;
      for (const m of memberList) {
        const name = String(m.name || '').trim();
        if (!name) continue;
        const exist = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(name).first();
        if (exist) { skipped++; continue; }
        await env.DB.prepare(
          'INSERT INTO members (name, tel, email, professional, role, fee_paid_date) VALUES (?,?,?,?,?,?)'
        ).bind(name, m.tel || '', m.email || '', m.professional || '', m.role || '會員', m.fee_paid_date || '').run();
        added++;
      }
      return JSON.stringify({ ok: true, message: '已新增 ' + added + ' 位會員（跳過 ' + skipped + ' 位重複）', added, skipped });
    }
    case 'upload_image': {
      if (!args.name || !args.data) return JSON.stringify({ error: '請提供 name 和 data' });
      const base64 = args.data.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      await env.R2.put(args.name, bytes, {
        httpMetadata: { contentType: args.content_type || 'image/png', cacheControl: 'public, max-age=86400' }
      });
      return JSON.stringify({ ok: true, message: '已上傳圖片：' + args.name, url: '/api/image?name=' + encodeURIComponent(args.name) });
    }
    case 'auto_seat': {
      const group = args.group;
      // Get latest meeting
      const latest = await env.DB.prepare('SELECT id, date FROM meetings ORDER BY date DESC LIMIT 1').first();
      if (!latest) return JSON.stringify({ error: '冇會議記錄' });
      const mid = latest.id;

      // Get attendance with person info
      const att = await env.DB.prepare(`
        SELECT a.id as att_id, a.person_type, a.person_id, a.table_number, a.payment,
          CASE WHEN a.person_type='member' THEN m.name ELSE g.name END as name,
          CASE WHEN a.person_type='member' THEN m.role ELSE '' END as role,
          CASE WHEN a.person_type='member' THEN m.tags ELSE '' END as tags,
          CASE WHEN a.person_type='guest' THEN g.vip ELSE 0 END as vip
        FROM attendance a
        LEFT JOIN members m ON a.person_type='member' AND a.person_id=m.id
        LEFT JOIN guests g ON a.person_type='guest' AND a.person_id=g.id
        WHERE a.meeting_id=?
      `).bind(mid).all();

      // Filter by group
      let filtered = [];
      att.results.forEach(function(p){
        if (group === 'committee') {
          if (p.role && p.role !== '會員') filtered.push(p);
        } else if (group === 'vip') {
          if (p.vip === 1) filtered.push(p);
        } else if (group === 'member') {
          if (p.person_type === 'member' && (!p.role || p.role === '會員')) filtered.push(p);
        } else if (group === 'surname') {
          if (args.surname && p.name && p.name.charAt(0) === args.surname) filtered.push(p);
        } else if (group === 'guest') {
          if (p.person_type === 'guest' && p.vip !== 1) filtered.push(p);
        } else if (group === 'tag') {
          if (args.tag && p.tags) {
            var tagList = p.tags.split(',').map(function(t){ return t.trim(); });
            if (tagList.indexOf(args.tag) !== -1) filtered.push(p);
          }
        }
      });

      if (!filtered.length) {
        var desc = group==='committee'?'委員':(group==='vip'?'VIP嘉賓':(group==='surname'?'姓'+args.surname+'嘅人':(group==='member'?'會員':(group==='tag'?'標籤「'+args.tag+'」嘅人':'來賓'))));
        return JSON.stringify({ ok: false, message: '搵唔到任何'+desc });
      }

      // Find empty tables or use next available numbers
      var maxPerTable = parseInt(args.max_per_table) || 12;
      var usedTables = new Set();
      var tablePeople = {}; // table_number -> [person]
      att.results.forEach(function(a){ if (a.table_number) { usedTables.add(String(a.table_number)); if (!tablePeople[a.table_number]) tablePeople[a.table_number] = []; tablePeople[a.table_number].push(a); } });

      // Find available table numbers — prefer partially-filled tables first, then empty ones
      var existingTableNums = Object.keys(tablePeople).sort(function(a,b){ return parseInt(a)-parseInt(b); });
      var maxExistingTbl = existingTableNums.length ? Math.max.apply(null, existingTableNums.map(Number)) : 0;

      function nextFreeTable(startFrom) {
        // 1. FIRST: find completely EMPTY table (no existing people)
        for (var i=Math.max(startFrom,1); i<=Math.max(maxExistingTbl, 1); i++) {
          var t = String(i);
          if (!tablePeople[t] || tablePeople[t].length === 0) return t;
        }
        // 2. SECOND: if all tables have at least 1 person, create new number
        // Never mix groups into tables that already have people
        return String(maxExistingTbl + 1);
      }

      // Assign people to tables, splitting if needed
      var assignments = []; // {table, people:[]}
      var specifiedTbl = args.table_number || '';
      var currentTbl = specifiedTbl || nextFreeTable(1);
      var currentBatch = [];
      var batchNames = [];

      filtered.forEach(function(p){
        currentBatch.push(p);
        batchNames.push(p.name);
        if (currentBatch.length >= maxPerTable) {
          assignments.push({table: currentTbl, people: currentBatch, names: batchNames});
          currentBatch = [];
          batchNames = [];
          currentTbl = nextFreeTable(parseInt(currentTbl)+1);
        }
      });
      if (currentBatch.length > 0) {
        assignments.push({table: currentTbl, people: currentBatch, names: batchNames});
      }

      // If user specified a table but it's already occupied, append to next tables
      if (specifiedTbl) {
        var existing = tablePeople[specifiedTbl] || [];
        if (existing.length + filtered.length > maxPerTable) {
          // Need to split: fill specified table first, then overflow to next tables
          // Already handled by the splitting logic above
        }
      }

      // Batch update — assign seat_order by position within each table
      var allUpdates = [];
      var summary = [];
      assignments.forEach(function(asgn){
        asgn.people.forEach(function(p, si){
          var seat = si + 1;
          allUpdates.push(
            env.DB.prepare('UPDATE attendance SET table_number=?, seat_order=? WHERE id=?').bind(asgn.table, seat, p.att_id).run()
          );
          allUpdates.push(
            p.person_type === 'member' ?
              env.DB.prepare('UPDATE members SET table_number=?, seat_order=? WHERE id=?').bind(asgn.table, seat, p.person_id).run() :
              env.DB.prepare('UPDATE guests SET table_number=?, seat_order=? WHERE id=?').bind(asgn.table, seat, p.person_id).run()
          );
        });
        summary.push('🍽 第'+asgn.table+'號枱：'+asgn.names.join('、'));
      });
      await Promise.all(allUpdates);

      var groupDesc = group==='committee'?'委員':(group==='vip'?'VIP嘉賓':(group==='surname'?'姓'+args.surname+'嘅人':(group==='member'?'會員':(group==='tag'?'標籤「'+args.tag+'」嘅人':'來賓'))));
      var meetingInfo = '📅'+latest.date+' '+(latest.type==='anniversary'?'週年聚餐':(latest.type==='special'?'特別會議':'例會'));

      return JSON.stringify({
        ok: true,
        message: '✅ ' + meetingInfo + '\n已將 ' + filtered.length + ' 位' + groupDesc + '排好位！\n' + summary.join('\n') + '\n\n💡 提示：請喺「餐桌排位」頁面按 F5 重新整理睇結果。',
        meeting_id: mid,
        meeting_date: latest.date,
        people: filtered.map(function(p){return p.name;}).join('、'),
        tables: assignments.map(function(a){return a.table;}),
        count: filtered.length
      });
    }
    case 'move_table': {
      var fromTbl = args.from_table;
      var toTbl = args.to_table;
      var maxPerTbl = parseInt(args.max_per_table) || 12;
      if (!fromTbl || !toTbl) return JSON.stringify({ error: '請提供 from_table 同 to_table' });
      var latest2 = await env.DB.prepare('SELECT id, date FROM meetings ORDER BY date DESC LIMIT 1').first();
      if (!latest2) return JSON.stringify({ error: '冇會議記錄' });
      var mid2 = latest2.id;

      // Count existing people on target table
      var existing = await env.DB.prepare('SELECT COUNT(*) as c FROM attendance WHERE meeting_id=? AND table_number=?').bind(mid2, toTbl).first();
      var existingCount = existing ? existing.c : 0;
      var available = maxPerTbl - existingCount;

      // Find all people on the source table
      var people2 = await env.DB.prepare(
        'SELECT a.id as att_id, a.person_type, a.person_id, CASE WHEN a.person_type=\'member\' THEN m.name ELSE g.name END as name FROM attendance a LEFT JOIN members m ON a.person_type=\'member\' AND a.person_id=m.id LEFT JOIN guests g ON a.person_type=\'guest\' AND a.person_id=g.id WHERE a.meeting_id=? AND a.table_number=?'
      ).bind(mid2, fromTbl).all();

      if (!people2.results.length) return JSON.stringify({ ok: false, message: '第'+fromTbl+'號枱冇人喎！' });

      // Check capacity
      var moves = [];
      var fit = people2.results.slice(0, Math.max(0, available));
      var overflow = people2.results.slice(Math.max(0, available));
      var message = '';

      fit.forEach(function(p){
        moves.push(env.DB.prepare('UPDATE attendance SET table_number=?, seat_order=NULL WHERE id=?').bind(toTbl, p.att_id).run());
        moves.push(p.person_type === 'member' ?
          env.DB.prepare('UPDATE members SET table_number=? WHERE id=?').bind(toTbl, p.person_id).run() :
          env.DB.prepare('UPDATE guests SET table_number=? WHERE id=?').bind(toTbl, p.person_id).run());
      });

      if (overflow.length > 0 && !args.force) {
        // Don't move overflow - leave them on original table
        message = '⚠️ 第'+toTbl+'號枱只能容納 '+maxPerTbl+' 人（已有 '+existingCount+' 人，剩 '+available+' 位）。已搬 '+fit.length+' 人，第'+fromTbl+'號枱仲有 '+overflow.length+' 人因爆滿未搬。';
      } else if (overflow.length > 0 && args.force) {
        // Force move overflow to next available tables
        var overflowMsgs = [];
        for (var k=0; k<overflow.length; k+=maxPerTbl) {
          var batch = overflow.slice(k, k+maxPerTbl);
          var nextTbl = String(parseInt(toTbl) + 1 + Math.floor(k/maxPerTbl));
          var batchNames = [];
          batch.forEach(function(p){
            batchNames.push(p.name);
            moves.push(env.DB.prepare('UPDATE attendance SET table_number=?, seat_order=NULL WHERE id=?').bind(nextTbl, p.att_id).run());
            moves.push(p.person_type === 'member' ?
              env.DB.prepare('UPDATE members SET table_number=? WHERE id=?').bind(nextTbl, p.person_id).run() :
              env.DB.prepare('UPDATE guests SET table_number=? WHERE id=?').bind(nextTbl, p.person_id).run());
          });
          overflowMsgs.push('🍽 第'+nextTbl+'號枱：'+batchNames.join('、'));
        }
        message = '✅ 已將第'+fromTbl+'號枱 '+people2.results.length+' 人搬走！\n第'+toTbl+'號枱已滿 ('+maxPerTbl+'人)\n'+overflowMsgs.join('\n');
      }

      await Promise.all(moves);
      var meetingInfo2 = '('+latest2.date+') ';
      if (!message) {
        var names2 = people2.results.map(function(p){return p.name;}).join('、');
        message = meetingInfo2+'✅ 已將第'+fromTbl+'號枱 '+people2.results.length+' 人全部搬去第'+toTbl+'號枱！\n'+names2+'\n\n✨ 餐桌排位頁面會自動更新。';
      } else {
        message = meetingInfo2 + message + '\n\n✨ 餐桌排位頁面會自動更新。';
      }

      return JSON.stringify({ ok: true, message: message, meeting_date: latest2.date, moved: fit.length, overflow: overflow.length, count: people2.results.length });
    }
    case 'create_meeting': {
      if (!args.date) return JSON.stringify({ error: '請提供日期' });
      await env.DB.prepare('INSERT INTO meetings (date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee) VALUES (?,?,?,?,?,?,?,?)')
        .bind(args.date, args.type || 'regular', args.collector || '', args.guest_fee || 0, args.member_fee || 0, args.committee_fee || 0, args.early_bird_fee || 0, args.walk_in_fee || 0).run();
      return JSON.stringify({ ok: true, message: '已建立會議：' + args.date });
    }
    case 'add_guest_to_meeting': {
      if (!args.name) return JSON.stringify({ error: '請提供來賓姓名' });
      const existG3 = await env.DB.prepare('SELECT id FROM guests WHERE name=? AND active=1').bind(args.name).first();
      const existM3 = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(args.name).first();
      if (existG3 || existM3) return JSON.stringify({ error: args.name + ' 已存在' });
      let mid3 = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
      mid3 = mid3 ? mid3.id : null;
      if (!mid3) return JSON.stringify({ error: '冇會議' });
      const r3 = await env.DB.prepare('INSERT INTO guests (name, professional, tel, invited_by, meeting_id, vip) VALUES (?,?,?,?,?,?)')
        .bind(args.name, args.professional || '', args.tel || '', args.invited_by || '', mid3, args.vip ? 1 : 0).run();
      await env.DB.prepare('INSERT INTO attendance (meeting_id, person_type, person_id, payment) VALUES (?,?,?,?)')
        .bind(mid3, 'guest', r3.meta.last_row_id, args.payment || '').run();
      return JSON.stringify({ ok: true, message: '已新增來賓：' + args.name + '（已加入會議 #' + mid3 + '）' });
    }
    case 'add_person_to_meeting': {
      if (!args.person_type || !args.person_id) return JSON.stringify({ error: '請提供 person_type 同 person_id' });
      let mid4 = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
      mid4 = mid4 ? mid4.id : null;
      if (!mid4) return JSON.stringify({ error: '冇會議' });
      const exist4 = await env.DB.prepare('SELECT id FROM attendance WHERE meeting_id=? AND person_type=? AND person_id=?').bind(mid4, args.person_type, args.person_id).first();
      if (exist4) return JSON.stringify({ error: '此人已在會議中 (attendance #' + exist4.id + ')' });
      const r4 = await env.DB.prepare('INSERT INTO attendance (meeting_id, person_type, person_id, payment, table_number, seat_order) VALUES (?,?,?,?,?,?)')
        .bind(mid4, args.person_type, args.person_id, args.payment || '', args.table_number || '', args.seat_order ?? null).run();
      return JSON.stringify({ ok: true, message: '已加入會議', attendance_id: r4.meta.last_row_id });
    }
    case 'list_all_members': {
      const rows = await env.DB.prepare('SELECT id, name, tel, professional, role, tags FROM members WHERE active=1 ORDER BY id').all();
      return JSON.stringify({ ok: true, members: rows.results, count: rows.results.length });
    }
    case 'list_all_guests': {
      const rows = await env.DB.prepare('SELECT id, name, tel, professional, invited_by, vip FROM guests WHERE active=1 ORDER BY id').all();
      return JSON.stringify({ ok: true, guests: rows.results, count: rows.results.length });
    }
    case 'list_tables': {
      let mid2 = args.meeting_id;
      if (!mid2) {
        const latest2 = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
        mid2 = latest2 ? latest2.id : null;
      }
      if (!mid2) return JSON.stringify({ error: '冇會議記錄' });
      const rows2 = await env.DB.prepare(`
        SELECT a.id as att_id, a.person_type, a.person_id, a.payment, a.table_number, a.seat_order,
          CASE WHEN a.person_type='member' THEN m.name ELSE g.name END as name,
          CASE WHEN a.person_type='member' THEN m.professional ELSE g.professional END as professional,
          CASE WHEN a.person_type='member' THEN (m.role IS NOT NULL AND m.role != '會員') ELSE 0 END as is_committee,
          CASE WHEN a.person_type='guest' THEN g.vip ELSE 0 END as vip
        FROM attendance a
        LEFT JOIN members m ON a.person_type='member' AND a.person_id=m.id
        LEFT JOIN guests g ON a.person_type='guest' AND a.person_id=g.id
        WHERE a.meeting_id=?
        ORDER BY CAST(a.table_number AS INTEGER), a.seat_order
      `).bind(mid2).all();
      const settingRow2 = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind('seating_names_' + mid2).first();
      let tableNames2 = {};
      if (settingRow2) { try { tableNames2 = JSON.parse(settingRow2.value); } catch(e) {} }
      const countRow2 = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind('seating_table_count_' + mid2).first();
      const tableCount2 = countRow2 ? parseInt(countRow2.value) || 0 : 0;
      const tables2 = {};
      const unassigned2 = [];
      for (const a of rows2.results) {
        const t = a.table_number || '';
        if (!t) { unassigned2.push(a); continue; }
        if (!tables2[t]) tables2[t] = { table_number: t, name: tableNames2[t] || ('第 ' + t + ' 號枱'), people: [] };
        tables2[t].people.push(a);
      }
      const nums = Object.keys(tables2).map(Number);
      const maxN = nums.length ? Math.max(...nums) : 0;
      const effCount = Math.max(maxN, tableCount2, 0);
      for (let i = 1; i <= effCount; i++) {
        if (!tables2[String(i)]) tables2[String(i)] = { table_number: String(i), name: tableNames2[String(i)] || ('第 ' + i + ' 號枱'), people: [] };
      }
      const tblList = Object.keys(tables2).sort((a,b) => parseInt(a)-parseInt(b)).map(k => tables2[k]);
      return JSON.stringify({
        ok: true, meeting_id: mid2, table_count: tblList.length,
        total_people: rows2.results.length, assigned_people: rows2.results.length - unassigned2.length, unassigned_people: unassigned2.length,
        tables: tblList, unassigned: unassigned2
      });
    }
    case 'update_table_names': {
      if (!args.meeting_id) return JSON.stringify({ error: '請提供 meeting_id' });
      if (!args.names || typeof args.names !== 'object') return JSON.stringify({ error: '請提供 names object' });
      const key2 = 'seating_names_' + args.meeting_id;
      const value2 = JSON.stringify(args.names);
      await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').bind(key2, value2, value2).run();
      return JSON.stringify({ ok: true, message: '已更新 ' + Object.keys(args.names).length + ' 張枱名稱', table_names: args.names });
    }
    case 'delete_meeting': {
      if (!args.meeting_id) return JSON.stringify({ error: '請提供 meeting_id' });
      await env.DB.prepare('DELETE FROM attendance WHERE meeting_id=?').bind(args.meeting_id).run();
      await env.DB.prepare('DELETE FROM meetings WHERE id=?').bind(args.meeting_id).run();
      return JSON.stringify({ ok: true, message: '已刪除會議 #' + args.meeting_id });
    }
    case 'update_settings': {
      if (!args.settings || typeof args.settings !== 'object') return JSON.stringify({ error: '請提供 settings object' });
      const stmts = [];
      for (const [k, v] of Object.entries(args.settings)) {
        stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').bind(k, String(v), String(v)));
      }
      await env.DB.batch(stmts);
      return JSON.stringify({ ok: true, message: '已更新 ' + Object.keys(args.settings).length + ' 項設定' });
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
  let toolsCalled = [];
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
      toolsCalled.push(tc.function.name);
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

  return { reply: data.choices?.[0]?.message?.content || '抱歉，我無法處理這個請求。', tools_used: toolsCalled };
}
