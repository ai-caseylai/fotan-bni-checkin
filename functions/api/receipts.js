export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const member_id = url.searchParams.get('member_id');

  try {
    // GET image by receipt id
    if (request.method === 'GET' && id) {
      const key = `receipt-${id}.jpg`;
      const obj = await env.R2.get(key);
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, {
        headers: {
          'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // GET list by member_id
    if (request.method === 'GET' && member_id) {
      const rows = await env.DB.prepare(
        'SELECT * FROM member_receipts WHERE member_id=? ORDER BY created_at DESC'
      ).bind(member_id).all();
      return Response.json(rows.results, { headers: cors });
    }

    // POST upload
    if (request.method === 'POST') {
      const body = await request.json();
      const { member_id: mid, filename, data } = body;
      if (!mid || !data) return Response.json({ error: 'member_id and data required' }, { status: 400, headers: cors });

      const result = await env.DB.prepare(
        'INSERT INTO member_receipts (member_id, filename) VALUES (?,?)'
      ).bind(mid, filename || 'receipt.jpg').run();

      const receiptId = result.meta.last_row_id;
      const key = `receipt-${receiptId}.jpg`;
      const base64 = data.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      await env.R2.put(key, bytes, {
        httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' }
      });

      return Response.json({ ok: true, id: receiptId, url: `/api/receipts?id=${receiptId}` }, { headers: cors });
    }

    // DELETE
    if (request.method === 'DELETE') {
      if (!id) return Response.json({ error: 'id required' }, { status: 400, headers: cors });
      const key = `receipt-${id}.jpg`;
      await env.R2.delete(key);
      await env.DB.prepare('DELETE FROM member_receipts WHERE id=?').bind(id).run();
      return Response.json({ ok: true }, { headers: cors });
    }

    return Response.json({ error: 'Bad request' }, { status: 400, headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
