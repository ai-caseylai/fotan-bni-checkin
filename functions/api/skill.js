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
      const { attendance_id, payment } = body;
      if (!attendance_id) return Response.json({ ok: false, error: 'attendance_id required' }, { headers: cors });
      const validPayments = ['paid', 'free', 'unpaid', ''];
      if (!validPayments.includes(payment)) return Response.json({ ok: false, error: 'payment must be paid/free/unpaid' }, { headers: cors });
      await env.DB.prepare('UPDATE attendance SET payment=? WHERE id=?').bind(payment, attendance_id).run();
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
          SUM(CASE WHEN a.arrival_time='absent' THEN 1 ELSE 0 END) as absent
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

    return Response.json({ ok: false, error: `unknown action: ${action}. Valid: import_guests, update_payment, update_table, mark_arrival, search, meeting_stats, list_meetings, payment_summary, list_attendance` }, { headers: cors });

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { headers: cors });
  }
}
