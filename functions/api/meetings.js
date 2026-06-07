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
      return Response.json(rows.results, { headers: cors });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const { date, type, collector, guest_fee, attendance } = body;
      if (!date) return Response.json({ error: 'Date required' }, { status: 400, headers: cors });

      const result = await env.DB.prepare('INSERT INTO meetings (date, type, collector, guest_fee) VALUES (?,?,?,?)')
        .bind(date, type || 'regular', collector || '', guest_fee || 0).run();
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
