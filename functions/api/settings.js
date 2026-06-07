export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    if (request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT key, value FROM settings').all();
      const obj = {};
      rows.results.forEach(r => { obj[r.key] = r.value; });
      return Response.json(obj, { headers: cors });
    }
    if (request.method === 'PUT') {
      const body = await request.json();
      const stmts = [];
      for (const [k, v] of Object.entries(body)) {
        stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').bind(k, v, v));
      }
      await env.DB.batch(stmts);
      return Response.json({ ok: true }, { headers: cors });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
