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
        const row = await env.DB.prepare('SELECT * FROM members WHERE id=?').bind(id).first();
        return Response.json(row, { headers: cors });
      }
      const rows = await env.DB.prepare('SELECT * FROM members WHERE active=1 ORDER BY id').all();
      return Response.json(rows.results, { headers: cors });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const { name, tel } = body;
      if (!name) return Response.json({ error: 'Name required' }, { status: 400, headers: cors });
      const result = await env.DB.prepare('INSERT INTO members (name, tel) VALUES (?,?)').bind(name, tel || '').run();
      return Response.json({ id: result.meta.last_row_id, name, tel }, { headers: cors });
    }
    if (request.method === 'PUT') {
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      const body = await request.json();
      const sets = [], vals = [];
      for (const k of ['name','tel','active']) {
        if (body[k] !== undefined) { sets.push(`${k}=?`); vals.push(body[k]); }
      }
      if (!sets.length) return Response.json({ error: 'No fields' }, { status: 400, headers: cors });
      vals.push(id);
      await env.DB.prepare(`UPDATE members SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();
      return Response.json({ ok: true }, { headers: cors });
    }
    if (request.method === 'DELETE') {
      if (!id) return Response.json({ error: 'ID required' }, { status: 400, headers: cors });
      await env.DB.prepare('UPDATE members SET active=0 WHERE id=?').bind(id).run();
      return Response.json({ ok: true }, { headers: cors });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
