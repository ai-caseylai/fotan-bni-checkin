export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const meetingId = url.searchParams.get('meeting_id');
  const personType = url.searchParams.get('person_type');
  const personId = url.searchParams.get('person_id');

  try {
    if (request.method === 'GET') {
      if (personType && personId) {
        const rows = await env.DB.prepare(
          'SELECT a.*, m.date, m.type as meeting_type FROM attendance a JOIN meetings m ON a.meeting_id=m.id WHERE a.person_type=? AND a.person_id=? ORDER BY m.date DESC'
        ).bind(personType, personId).all();
        return Response.json(rows.results, { headers: cors });
      }
      const rows = await env.DB.prepare('SELECT * FROM attendance WHERE meeting_id=? ORDER BY person_type, id').bind(meetingId).all();
      return Response.json(rows.results, { headers: cors });
    }
    if (request.method === 'PUT') {
      const body = await request.json();
      const { id, substitute, payment, payment_method, arrival_time, remark, table_number, seat_order, price_tier, _delete } = body;
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      // Soft-delete via PUT (Cloudflare WAF 封鎖 DELETE method)
      if (_delete) {
        await env.DB.prepare('DELETE FROM attendance WHERE id=?').bind(id).run();
        return Response.json({ ok: true, deleted: true }, { headers: cors });
      }
      // 未付款不能簽到：如設定 arrival_time 且非 absent，必須已付費或免費
      if (arrival_time && arrival_time !== 'absent') {
        const row = await env.DB.prepare('SELECT payment FROM attendance WHERE id=?').bind(id).first();
        const effectivePayment = payment || (row ? row.payment : '');
        if (effectivePayment !== 'paid' && effectivePayment !== 'free') {
          return Response.json({ error: '未付款不能簽到，請先完成付款' }, { status: 400, headers: cors });
        }
      }
      await env.DB.prepare(
        'UPDATE attendance SET substitute=?, payment=?, payment_method=?, arrival_time=?, remark=?, table_number=?, seat_order=?, price_tier=? WHERE id=?'
      ).bind(substitute || '', payment || '', payment_method || '', arrival_time || '', remark || '', table_number || '', seat_order ?? null, price_tier || '', id).run();
      return Response.json({ ok: true }, { headers: cors });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const { meeting_id, person_type, person_id, substitute, payment, payment_method, arrival_time, remark, seat_order } = body;
      // 未付款不能簽到
      if (arrival_time && arrival_time !== 'absent' && payment !== 'paid' && payment !== 'free') {
        return Response.json({ error: '未付款不能簽到，請先完成付款' }, { status: 400, headers: cors });
      }
      const result = await env.DB.prepare(
        'INSERT INTO attendance (meeting_id, person_type, person_id, substitute, payment, payment_method, arrival_time, remark, seat_order) VALUES (?,?,?,?,?,?,?,?,?)'
      ).bind(meeting_id, person_type, person_id, substitute || '', payment || '', payment_method || '', arrival_time || '', remark || '', seat_order ?? null).run();
      return Response.json({ id: result.meta.last_row_id }, { headers: cors });
    }
    if (request.method === 'DELETE') {
      const body = await request.json();
      const { id } = body;
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      await env.DB.prepare('DELETE FROM attendance WHERE id=?').bind(id).run();
      return Response.json({ ok: true }, { headers: cors });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
