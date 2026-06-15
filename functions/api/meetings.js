export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    if (request.method === 'GET') {
      if (id) {
        const meeting = await env.DB.prepare('SELECT * FROM meetings WHERE id=?').bind(id).first();
        if (!meeting) return Response.json({ error: 'Not found' }, { status: 404, headers: cors });
        const att = await env.DB.prepare('SELECT * FROM attendance WHERE meeting_id=? ORDER BY person_type, id').bind(id).all();
        meeting.attendance = att.results;
        return Response.json(meeting, { headers: cors });
      }
      const rows = await env.DB.prepare('SELECT * FROM meetings ORDER BY date DESC, id DESC').all();
      // Add attendance stats for each meeting
      for (const m of rows.results) {
        const stats = await env.DB.prepare(
          `SELECT COUNT(*) as total,
            SUM(CASE WHEN person_type='member' THEN 1 ELSE 0 END) as members,
            SUM(CASE WHEN person_type='guest' THEN 1 ELSE 0 END) as guests,
            SUM(CASE WHEN payment='paid' THEN 1 ELSE 0 END) as paid,
            SUM(CASE WHEN payment='free' THEN 1 ELSE 0 END) as free,
            SUM(CASE WHEN (payment='' OR payment='unpaid') AND arrival_time!='absent' THEN 1 ELSE 0 END) as unpaid,
            SUM(CASE WHEN payment='paid' THEN
              CASE
                WHEN a.price_tier='early_bird' THEN COALESCE(NULLIF(m2.early_bird_fee,0), 388)
                WHEN a.price_tier='walk_in' THEN COALESCE(NULLIF(m2.walk_in_fee,0), 388)
                WHEN a.price_tier='committee' THEN COALESCE(NULLIF(m2.committee_fee,0), 388)
                WHEN a.person_type='guest' THEN COALESCE(NULLIF(m2.guest_fee,0), 388)
                WHEN a.person_type='member' THEN COALESCE(NULLIF(m2.member_fee,0), 388)
                ELSE COALESCE(NULLIF(m2.member_fee,0), 388)
              END
            ELSE 0 END) as revenue
          FROM attendance a JOIN meetings m2 ON a.meeting_id=m2.id WHERE a.meeting_id=?`
        ).bind(m.id).first();
        m.stats = stats;
      }
      return Response.json(rows.results, { headers: cors });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const { date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee, table_number, attendance } = body;
      if (!date) return Response.json({ error: 'Date required' }, { status: 400, headers: cors });

      const result = await env.DB.prepare('INSERT INTO meetings (date, type, collector, guest_fee, member_fee, committee_fee, early_bird_fee, walk_in_fee, table_number) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(date, type || 'regular', collector || '', guest_fee || 0, member_fee || 0, committee_fee || 0, early_bird_fee || 0, walk_in_fee || 0, table_number || '').run();
      const meetingId = result.meta.last_row_id;

      if (attendance && Array.isArray(attendance)) {
        const stmt = env.DB.prepare('INSERT INTO attendance (meeting_id, person_type, person_id, substitute, payment, payment_method, arrival_time, remark) VALUES (?,?,?,?,?,?,?,?)');
        const batch = [];
        for (const a of attendance) {
          batch.push(stmt.bind(meetingId, a.person_type, a.person_id, a.substitute || '', a.payment || '', a.payment_method || '', a.arrival_time || '', a.remark || ''));
        }
        await env.DB.batch(batch);
      }
      return Response.json({ id: meetingId }, { headers: cors });
    }
    if (request.method === 'PUT') {
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      const body = await request.json();
      const sets = [], vals = [];
      for (const k of ['date','type','collector','guest_fee','member_fee','committee_fee','early_bird_fee','walk_in_fee','table_number']) {
        if (body[k] !== undefined) { sets.push(k+'=?'); vals.push(body[k]); }
      }
      if (!sets.length) return Response.json({ error: 'No fields' }, { status: 400, headers: cors });
      vals.push(id);
      await env.DB.prepare('UPDATE meetings SET '+sets.join(',')+' WHERE id=?').bind(...vals).run();
      return Response.json({ ok: true }, { headers: cors });
    }
    if (request.method === 'DELETE') {
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      await env.DB.prepare('DELETE FROM attendance WHERE meeting_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM meetings WHERE id=?').bind(id).run();
      return Response.json({ ok: true }, { headers: cors });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
