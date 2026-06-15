export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  async function verifyToken(token) {
    if (!token) return null;
    const row = await env.DB.prepare(
      "SELECT * FROM skill_tokens WHERE token=? AND active=1 AND expires_at > datetime('now')"
    ).bind(token).first();
    return row || null;
  }

  try {
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const url = new URL(request.url);
    const action = body.action || url.searchParams.get('action') || '';
    const token = body.token || url.searchParams.get('token') || '';

    // All actions require valid token
    const tok = await verifyToken(token);
    if (!tok) return Response.json({ ok: false, error: 'invalid or expired token' }, { headers: cors });

    // ── import_guests ──────────────────────────────
    if (action === 'import_guests') {
      const guests = body.guests;
      if (!guests || !Array.isArray(guests) || !guests.length) {
        return Response.json({ ok: false, error: 'guests array required' }, { headers: cors });
      }
      let mid = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
      mid = mid ? mid.id : null;
      if (!mid) return Response.json({ ok: false, error: 'no meeting found' }, { headers: cors });

      let added = 0, skipped = 0, paid = 0, unpaid = 0, freeCount = 0;
      const results = [];
      for (const g of guests) {
        const name = String(g.name || '').trim();
        if (!name) continue;

        let payStatus = '';
        const rawPay = String(g.payment || '').toLowerCase();
        if (rawPay === 'paid' || rawPay === '已付款' || rawPay.includes('💰')) { payStatus = 'paid'; paid++; }
        else if (rawPay === 'free' || rawPay === '免費' || rawPay === '免付款' || rawPay.includes('🆓')) { payStatus = 'free'; freeCount++; }
        else { unpaid++; }

        const existGuest = await env.DB.prepare('SELECT id FROM guests WHERE name=? AND active=1').bind(name).first();
        const existMember = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(name).first();
        if (existGuest || existMember) {
          // Update payment for existing attendance if member
          if (existMember) {
            await env.DB.prepare(
              "UPDATE attendance SET payment=? WHERE meeting_id=? AND person_type='member' AND person_id=?"
            ).bind(payStatus || 'unpaid', mid, existMember.id).run();
            results.push({ name, status: 'updated_member', payment: payStatus || 'unpaid' });
          } else {
            results.push({ name, status: 'skipped', reason: 'duplicate' });
          }
          skipped++; continue;
        }

        const result = await env.DB.prepare(
          'INSERT INTO guests (name, professional, tel, invited_by, meeting_id) VALUES (?,?,?,?,?)'
        ).bind(name, g.professional || '', g.tel || '', g.invited_by || '', mid).run();
        const guestId = result.meta.last_row_id;
        await env.DB.prepare(
          'INSERT INTO attendance (meeting_id, person_type, person_id, payment) VALUES (?,?,?,?)'
        ).bind(mid, 'guest', guestId, payStatus).run();
        added++;
        results.push({ name, status: 'added', payment: payStatus || 'unpaid', guest_id: guestId });
      }
      return Response.json({
        ok: true, meeting_id: mid, added, skipped, paid_count: paid, unpaid_count: unpaid, free_count: freeCount,
        message: `已匯入 ${added} 位來賓（跳過 ${skipped} 位重複），${paid} 已付 ${freeCount} 免費 ${unpaid} 未付`,
        results: results.slice(0, 50)
      }, { headers: cors });
    }

    // ── update_payment ─────────────────────────────
    if (action === 'update_payment') {
      const { attendance_id, payment, price_tier } = body;
      if (!attendance_id) return Response.json({ ok: false, error: 'attendance_id required' }, { headers: cors });
      const validPayments = ['paid', 'free', 'unpaid', ''];
      if (!validPayments.includes(payment)) return Response.json({ ok: false, error: 'payment must be paid/free/unpaid' }, { headers: cors });
      await env.DB.prepare('UPDATE attendance SET payment=? WHERE id=?').bind(payment, attendance_id).run();
      if (price_tier !== undefined) {
        await env.DB.prepare('UPDATE attendance SET price_tier=? WHERE id=?').bind(price_tier, attendance_id).run();
      }
      return Response.json({ ok: true, message: `已更新 attendance #${attendance_id} 付款為 ${payment || '未付款'}` }, { headers: cors });
    }

    // ── update_table ────────────────────────────────
    if (action === 'update_table') {
      const { meeting_id, person_id, person_type, table_number } = body;
      if (!meeting_id || !person_id || !person_type) return Response.json({ ok: false, error: 'meeting_id, person_id, person_type required' }, { headers: cors });
      await env.DB.prepare(
        'UPDATE attendance SET table_number=? WHERE meeting_id=? AND person_type=? AND person_id=?'
      ).bind(table_number || '', meeting_id, person_type, person_id).run();
      return Response.json({ ok: true, message: `已更新 ${person_type} #${person_id} 枱號為 ${table_number || '（清除）'}` }, { headers: cors });
    }

    // ── mark_arrival ────────────────────────────────
    if (action === 'mark_arrival') {
      const { attendance_id, arrival_time } = body;
      if (!attendance_id) return Response.json({ ok: false, error: 'attendance_id required' }, { headers: cors });
      // 未付款不能簽到
      if (arrival_time && arrival_time !== 'absent') {
        const row = await env.DB.prepare('SELECT payment FROM attendance WHERE id=?').bind(attendance_id).first();
        if (!row || (row.payment !== 'paid' && row.payment !== 'free')) {
          return Response.json({ ok: false, error: '未付款不能簽到，請先完成付款' }, { headers: cors });
        }
      }
      await env.DB.prepare('UPDATE attendance SET arrival_time=? WHERE id=?')
        .bind(arrival_time || 'absent', attendance_id).run();
      return Response.json({ ok: true, message: `已標記 attendance #${attendance_id} 為 ${arrival_time || 'absent'}` }, { headers: cors });
    }

    // ── search ──────────────────────────────────────
    if (action === 'search') {
      const { q } = body;
      if (!q) return Response.json({ ok: false, error: 'q required' }, { headers: cors });
      const pattern = `%${q}%`;
      const members = await env.DB.prepare(
        "SELECT 'member' as type, id, name, tel, professional FROM members WHERE name LIKE ? AND active=1"
      ).bind(pattern).all();
      const guests = await env.DB.prepare(
        "SELECT 'guest' as type, id, name, tel, professional FROM guests WHERE name LIKE ? AND active=1"
      ).bind(pattern).all();
      return Response.json({ ok: true, results: [...members.results, ...guests.results] }, { headers: cors });
    }

    // ── meeting_stats ───────────────────────────────
    if (action === 'meeting_stats') {
      const { meeting_id } = body;
      let mid = meeting_id;
      if (!mid) {
        const latest = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
        mid = latest ? latest.id : null;
      }
      if (!mid) return Response.json({ ok: false, error: 'no meeting found' }, { headers: cors });
      const stats = await env.DB.prepare(`
        SELECT m.*, COUNT(a.id) as total,
          SUM(CASE WHEN a.person_type='member' THEN 1 ELSE 0 END) as members,
          SUM(CASE WHEN a.person_type='guest' THEN 1 ELSE 0 END) as guests,
          SUM(CASE WHEN a.payment='paid' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN a.payment='free' THEN 1 ELSE 0 END) as free,
          SUM(CASE WHEN a.payment='unpaid' THEN 1 ELSE 0 END) as unpaid,
          SUM(CASE WHEN a.arrival_time IS NOT NULL AND a.arrival_time!='' AND a.arrival_time!='absent' THEN 1 ELSE 0 END) as arrived,
          SUM(CASE WHEN a.arrival_time='absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN a.payment='paid' THEN
            CASE
              WHEN a.price_tier='early_bird' THEN COALESCE(NULLIF(m.early_bird_fee,0), 388)
              WHEN a.price_tier='walk_in' THEN COALESCE(NULLIF(m.walk_in_fee,0), 388)
              WHEN a.price_tier='committee' THEN COALESCE(NULLIF(m.committee_fee,0), 388)
              WHEN a.person_type='guest' THEN COALESCE(NULLIF(m.guest_fee,0), 388)
              WHEN a.person_type='member' THEN COALESCE(NULLIF(m.member_fee,0), 388)
              ELSE COALESCE(NULLIF(m.member_fee,0), 388)
            END
          ELSE 0 END) as revenue
        FROM meetings m LEFT JOIN attendance a ON m.id=a.meeting_id
        WHERE m.id=? GROUP BY m.id
      `).bind(mid).first();
      return Response.json({ ok: true, stats }, { headers: cors });
    }

    // ── list_meetings ───────────────────────────────
    if (action === 'list_meetings') {
      const meetings = await env.DB.prepare(
        'SELECT id, date, type, collector, guest_fee FROM meetings ORDER BY date DESC'
      ).all();
      return Response.json({ ok: true, meetings: meetings.results }, { headers: cors });
    }

    // ── update_meeting ──────────────────────────────
    if (action === 'update_meeting') {
      const { meeting_id, date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee, table_number } = body;
      if (!meeting_id) return Response.json({ ok: false, error: 'meeting_id required' }, { headers: cors });
      const sets = [], vals = [];
      for (const [k, v] of Object.entries({ date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee, table_number })) {
        if (v !== undefined) { sets.push(k + '=?'); vals.push(v); }
      }
      if (!sets.length) return Response.json({ ok: false, error: 'no fields to update' }, { headers: cors });
      vals.push(meeting_id);
      await env.DB.prepare('UPDATE meetings SET ' + sets.join(',') + ' WHERE id=?').bind(...vals).run();
      return Response.json({ ok: true }, { headers: cors });
    }

    // ── payment_summary ─────────────────────────────
    if (action === 'payment_summary') {
      const { meeting_id } = body;
      let mid = meeting_id;
      if (!mid) {
        const latest = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
        mid = latest ? latest.id : null;
      }
      if (!mid) return Response.json({ ok: false, error: 'no meeting found' }, { headers: cors });
      const summary = await env.DB.prepare(
        'SELECT payment, COUNT(*) as count FROM attendance WHERE meeting_id=? GROUP BY payment'
      ).bind(mid).all();
      return Response.json({ ok: true, meeting_id: mid, summary: summary.results }, { headers: cors });
    }

    // ── list_attendance ─────────────────────────────
    if (action === 'list_attendance') {
      const { meeting_id } = body;
      let mid = meeting_id;
      if (!mid) {
        const latest = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
        mid = latest ? latest.id : null;
      }
      if (!mid) return Response.json({ ok: false, error: 'no meeting found' }, { headers: cors });
      const rows = await env.DB.prepare(`
        SELECT a.id, a.person_type, a.person_id, a.arrival_time, a.payment, a.table_number,
          CASE WHEN a.person_type='member' THEN m.name ELSE g.name END as name,
          CASE WHEN a.person_type='member' THEN m.professional ELSE g.professional END as professional
        FROM attendance a
        LEFT JOIN members m ON a.person_type='member' AND a.person_id=m.id
        LEFT JOIN guests g ON a.person_type='guest' AND a.person_id=g.id
        WHERE a.meeting_id=?
        ORDER BY name
      `).bind(mid).all();
      return Response.json({ ok: true, meeting_id: mid, attendance: rows.results }, { headers: cors });
    }

    // ── create_member ───────────────────────────────
    if (action === 'create_member') {
      const { name, tel, email, professional, role } = body;
      if (!name) return Response.json({ ok: false, error: 'name required' }, { headers: cors });
      const exist = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(name).first();
      if (exist) return Response.json({ ok: false, error: 'member already exists' }, { headers: cors });
      const result = await env.DB.prepare(
        'INSERT INTO members (name, tel, email, professional, role) VALUES (?,?,?,?,?)'
      ).bind(name, tel || '', email || '', professional || '', role || '會員').run();
      return Response.json({ ok: true, member_id: result.meta.last_row_id, message: '已新增會員：' + name }, { headers: cors });
    }

    // ── update_member ───────────────────────────────
    if (action === 'update_member') {
      const { member_id, name, tel, email, professional, role, fee_paid_date, bio } = body;
      if (!member_id) return Response.json({ ok: false, error: 'member_id required' }, { headers: cors });
      const fields = [];
      const values = [];
      for (const f of ['name','tel','email','professional','role','fee_paid_date','bio']) {
        const v = body[f];
        if (v !== undefined) { fields.push(f+'=?'); values.push(v); }
      }
      if (!fields.length) return Response.json({ ok: false, error: 'no fields to update' }, { headers: cors });
      values.push(member_id);
      await env.DB.prepare('UPDATE members SET '+fields.join(',')+' WHERE id=?').bind(...values).run();
      return Response.json({ ok: true, message: '已更新會員 #' + member_id }, { headers: cors });
    }

    // ── update_guest ────────────────────────────────
    if (action === 'update_guest') {
      const { guest_id, name, professional, tel, invited_by, meeting_id } = body;
      if (!guest_id) return Response.json({ ok: false, error: 'guest_id required' }, { headers: cors });
      const fields = [];
      const values = [];
      for (const f of ['name','professional','tel','invited_by','meeting_id']) {
        const v = body[f];
        if (v !== undefined) { fields.push(f+'=?'); values.push(v); }
      }
      if (!fields.length) return Response.json({ ok: false, error: 'no fields to update' }, { headers: cors });
      values.push(guest_id);
      await env.DB.prepare('UPDATE guests SET '+fields.join(',')+' WHERE id=?').bind(...values).run();
      return Response.json({ ok: true, message: '已更新來賓 #' + guest_id }, { headers: cors });
    }

    // ── delete_person ───────────────────────────────
    if (action === 'delete_person') {
      const { person_type, person_id } = body;
      if (!person_type || !person_id) return Response.json({ ok: false, error: 'person_type and person_id required' }, { headers: cors });
      if (person_type === 'member') {
        await env.DB.prepare('UPDATE members SET active=0 WHERE id=?').bind(person_id).run();
      } else {
        await env.DB.prepare('UPDATE guests SET active=0 WHERE id=?').bind(person_id).run();
        await env.DB.prepare('DELETE FROM attendance WHERE person_type=? AND person_id=?').bind(person_type, person_id).run();
      }
      return Response.json({ ok: true, message: '已刪除 ' + person_type + ' #' + person_id }, { headers: cors });
    }

    // ── get_settings ────────────────────────────────
    if (action === 'get_settings') {
      const rows = await env.DB.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.results.forEach(r => { settings[r.key] = r.value; });
      return Response.json({ ok: true, settings }, { headers: cors });
    }

    // ── export_stats ────────────────────────────────
    if (action === 'export_stats') {
      const meetings = await env.DB.prepare(
        'SELECT m.*, COUNT(a.id) as total, SUM(CASE WHEN a.person_type=\'member\' THEN 1 ELSE 0 END) as members, SUM(CASE WHEN a.person_type=\'guest\' THEN 1 ELSE 0 END) as guests, SUM(CASE WHEN a.payment=\'paid\' THEN 1 ELSE 0 END) as paid, SUM(CASE WHEN a.payment=\'free\' THEN 1 ELSE 0 END) as free, SUM(CASE WHEN a.payment=\'unpaid\' THEN 1 ELSE 0 END) as unpaid, SUM(CASE WHEN a.arrival_time IS NOT NULL AND a.arrival_time!=\'\' AND a.arrival_time!=\'absent\' THEN 1 ELSE 0 END) as arrived, SUM(CASE WHEN a.arrival_time=\'absent\' THEN 1 ELSE 0 END) as absent FROM meetings m LEFT JOIN attendance a ON m.id=a.meeting_id GROUP BY m.id ORDER BY m.date DESC'
      ).all();
      const memberCount = await env.DB.prepare('SELECT COUNT(*) as c FROM members WHERE active=1').first();
      const guestCount = await env.DB.prepare('SELECT COUNT(*) as c FROM guests WHERE active=1').first();
      return Response.json({
        ok: true,
        member_count: memberCount.c,
        guest_count: guestCount.c,
        meetings: meetings.results
      }, { headers: cors });
    }

    // ── bulk_create_members ─────────────────────────
    if (action === 'bulk_create_members') {
      const members = body.members;
      if (!members || !Array.isArray(members) || !members.length) {
        return Response.json({ ok: false, error: 'members array required' }, { headers: cors });
      }
      let added = 0, skipped = 0;
      const results = [];
      for (const m of members) {
        const name = String(m.name || '').trim();
        if (!name) continue;
        const exist = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(name).first();
        if (exist) { skipped++; results.push({ name, status: 'skipped', reason: 'duplicate' }); continue; }
        const result = await env.DB.prepare(
          'INSERT INTO members (name, tel, email, professional, role, fee_paid_date) VALUES (?,?,?,?,?,?)'
        ).bind(name, m.tel || '', m.email || '', m.professional || '', m.role || '會員', m.fee_paid_date || '').run();
        added++;
        results.push({ name, status: 'added', member_id: result.meta.last_row_id });
      }
      return Response.json({
        ok: true, added, skipped,
        message: `已新增 ${added} 位會員（跳過 ${skipped} 位重複）`,
        results: results.slice(0, 50)
      }, { headers: cors });
    }

    // ── upload_image ────────────────────────────────
    if (action === 'upload_image') {
      const { name, data, content_type } = body;
      if (!name || !data) return Response.json({ ok: false, error: 'name and data required' }, { headers: cors });
      const base64 = data.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      await env.R2.put(name, bytes, {
        httpMetadata: { contentType: content_type || 'image/png', cacheControl: 'public, max-age=86400' }
      });
      return Response.json({ ok: true, url: `/api/image?name=${encodeURIComponent(name)}`, message: '已上傳圖片：' + name }, { headers: cors });
    }

    return Response.json({ ok: false, error: `unknown action: ${action}. Valid: import_guests, update_payment, update_table, mark_arrival, search, meeting_stats, list_meetings, payment_summary, list_attendance, create_member, update_member, update_guest, delete_person, get_settings, export_stats, bulk_create_members, upload_image` }, { headers: cors });

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { headers: cors });
  }
}
