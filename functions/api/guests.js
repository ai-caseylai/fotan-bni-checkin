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
  const meetingId = url.searchParams.get('meeting_id');

  try {

    if (request.method === 'GET') {
      if (id) {
        const row = await env.DB.prepare('SELECT * FROM guests WHERE id=?').bind(id).first();
        return Response.json(row, { headers: cors });
      }
      if (meetingId) {
        const rows = await env.DB.prepare('SELECT * FROM guests WHERE active=1 AND meeting_id=? ORDER BY id').bind(meetingId).all();
        return Response.json(rows.results, { headers: cors });
      }
      const rows = await env.DB.prepare('SELECT * FROM guests WHERE active=1 ORDER BY id').all();
      return Response.json(rows.results, { headers: cors });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const { name, professional, tel, invited_by, meeting_id, vip } = body;
      if (!name) return Response.json({ error: 'Name required' }, { status: 400, headers: cors });
      const result = await env.DB.prepare('INSERT INTO guests (name, professional, tel, invited_by, meeting_id, vip) VALUES (?,?,?,?,?,?)')
        .bind(name, professional || '', tel || '', invited_by || '', meeting_id || null, vip ? 1 : 0).run();
      return Response.json({ id: result.meta.last_row_id, name }, { headers: cors });
    }
    if (request.method === 'PUT') {
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      const body = await request.json();
      const sets = [], vals = [];
      for (const k of ['name','professional','tel','invited_by','meeting_id','table_number','seat_order','active','vip']) {
        if (body[k] !== undefined) { sets.push(`${k}=?`); vals.push(body[k]); }
      }
      vals.push(id);
      await env.DB.prepare(`UPDATE guests SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();
      return Response.json({ ok: true }, { headers: cors });
    }
    if (request.method === 'DELETE') {
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      await env.DB.prepare('UPDATE guests SET active=0 WHERE id=?').bind(id).run();
      return Response.json({ ok: true }, { headers: cors });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
