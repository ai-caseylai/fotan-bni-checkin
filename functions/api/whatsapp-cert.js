export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);

  try {
    // GET — list all
    if (request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (id) {
        const row = await env.DB.prepare('SELECT * FROM whatsapp_cert WHERE id=?').bind(id).first();
        if (!row) return Response.json({ error: 'not found' }, { status: 404, headers: cors });
        return Response.json(row, { headers: cors });
      }
      const rows = await env.DB.prepare('SELECT * FROM whatsapp_cert ORDER BY created_at DESC').all();
      return Response.json(rows.results, { headers: cors });
    }

    // DELETE
    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return Response.json({ error: 'id required' }, { status: 400, headers: cors });

      const row = await env.DB.prepare('SELECT * FROM whatsapp_cert WHERE id=?').bind(id).first();
      if (row) {
        await env.R2.delete(row.r2_key);
        await env.DB.prepare('DELETE FROM whatsapp_cert WHERE id=?').bind(id).run();
      }
      return Response.json({ ok: true }, { headers: cors });
    }

    // POST — create (base64 photo)
    if (request.method === 'POST') {
      const body = await request.json();
      const { from_number, data, comment, note } = body;
      if (!from_number) return Response.json({ error: 'from_number required' }, { status: 400, headers: cors });
      if (!data) return Response.json({ error: 'data (base64 photo) required' }, { status: 400, headers: cors });

      const base64 = data.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const ts = Date.now();
      const r2Key = `whatsapp-cert-${ts}-${from_number.replace(/[^0-9]/g,'')}.jpg`;

      await env.R2.put(r2Key, bytes, {
        httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' }
      });

      await env.DB.prepare(
        'INSERT INTO whatsapp_cert (from_number, filename, r2_key, comment, note, content_type, file_size) VALUES (?,?,?,?,?,?,?)'
      ).bind(from_number, `${ts}.jpg`, r2Key, comment || '', note || '', 'image/jpeg', bytes.length).run();

      return Response.json({ ok: true, r2_key: r2Key, url: `/api/image?name=${r2Key}` }, { headers: cors });
    }

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
