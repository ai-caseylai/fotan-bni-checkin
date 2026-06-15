export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const token = url.searchParams.get('token');
  const id = url.searchParams.get('id');

  try {
    // Verify token
    if (request.method === 'GET' && action === 'verify') {
      if (!token) return Response.json({ ok: false, error: 'token required' }, { headers: cors });
      const row = await env.DB.prepare(
        "SELECT * FROM skill_tokens WHERE token=? AND active=1 AND expires_at > datetime('now')"
      ).bind(token).first();
      return Response.json({ ok: !!row, name: row?.name || '' }, { headers: cors });
    }

    // List all tokens
    if (request.method === 'GET') {
      const rows = await env.DB.prepare(
        'SELECT id, token, name, created_at, expires_at, active FROM skill_tokens ORDER BY created_at DESC'
      ).all();
      return Response.json(rows.results, { headers: cors });
    }

    // Create new token
    if (request.method === 'POST') {
      const body = await request.json();
      const { name } = body;
      // Generate random token
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let tk = 'lob_';
      for (let i = 0; i < 24; i++) tk += chars[Math.floor(Math.random() * chars.length)];
      const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await env.DB.prepare(
        'INSERT INTO skill_tokens (token, name, expires_at) VALUES (?,?,?)'
      ).bind(tk, name || '', expires).run();
      return Response.json({ ok: true, token: tk, name: name || '', expires_at: expires }, { headers: cors });
    }

    // Delete token
    if (request.method === 'DELETE') {
      if (!id) return Response.json({ error: 'id required' }, { status: 400, headers: cors });
      await env.DB.prepare('DELETE FROM skill_tokens WHERE id=?').bind(id).run();
      return Response.json({ ok: true }, { headers: cors });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
