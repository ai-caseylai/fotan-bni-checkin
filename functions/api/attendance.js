export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const meetingId = url.searchParams.get('meeting_id');

  try {
    if (request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM attendance WHERE meeting_id=? ORDER BY person_type, id').bind(meetingId).all();
      return Response.json(rows.results, { headers: cors });
    }
    if (request.method === 'PUT') {
      const body = await request.json();
      const { id, substitute, payment, payment_method, arrival_time, remark } = body;
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      await env.DB.prepare(
        'UPDATE attendance SET substitute=?, payment=?, payment_method=?, arrival_time=?, remark=? WHERE id=?'
      ).bind(substitute || '', payment || '', payment_method || '', arrival_time || '', remark || '', id).run();
      return Response.json({ ok: true }, { headers: cors });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const { meeting_id, person_type, person_id, substitute, payment, payment_method, arrival_time, remark } = body;
      const result = await env.DB.prepare(
        'INSERT INTO attendance (meeting_id, person_type, person_id, substitute, payment, payment_method, arrival_time, remark) VALUES (?,?,?,?,?,?,?,?)'
      ).bind(meeting_id, person_type, person_id, substitute || '', payment || '', payment_method || '', arrival_time || '', remark || '').run();
      return Response.json({ id: result.meta.last_row_id }, { headers: cors });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
