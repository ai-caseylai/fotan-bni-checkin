export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);

  async function verifyToken(token) {
    if (!token) return null;
    const row = await env.DB.prepare(
      "SELECT * FROM skill_tokens WHERE token=? AND active=1 AND expires_at > datetime('now')"
    ).bind(token).first();
    return row || null;
  }

  try {
    // GET — list all
    if (request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (id) {
        const row = await env.DB.prepare('SELECT * FROM whatsapp_cert WHERE id=?').bind(id).first();
        if (!row) return Response.json({ error: 'not found' }, { status: 404, headers: cors });
        return Response.json(row, { headers: cors });
      }
      // ?missing=1 — list people from last meeting without certs
      if (url.searchParams.get('missing') === '1') {
        const lastMeeting = await env.DB.prepare('SELECT * FROM meetings ORDER BY date DESC LIMIT 1').first();
        if (!lastMeeting) return Response.json({ meeting: null, people: [] }, { headers: cors });

        const att = await env.DB.prepare(
          'SELECT a.person_type, a.person_id, a.payment FROM attendance a WHERE a.meeting_id=?'
        ).bind(lastMeeting.id).all();

        const certs = await env.DB.prepare('SELECT from_number FROM whatsapp_cert').all();
        const certPhones = new Set(certs.results.map(r => r.from_number.replace(/[^0-9]/g, '').slice(-8)));

        // Get all members and guests
        const members = await env.DB.prepare('SELECT id, name, tel FROM members WHERE active=1').all();
        const guests = await env.DB.prepare('SELECT id, name, tel FROM guests WHERE active=1').all();

        const personMap = {};
        for (const m of members.results) personMap[`member:${m.id}`] = m;
        for (const g of guests.results) personMap[`guest:${g.id}`] = g;

        const missing = [];
        for (const a of att.results) {
          const key = `${a.person_type}:${a.person_id}`;
          const p = personMap[key];
          if (!p) continue;
          const phone8 = (p.tel || '').replace(/[^0-9]/g, '').slice(-8);
          if (!phone8 || certPhones.has(phone8)) continue;
          missing.push({ person_type: a.person_type, person_id: a.person_id, name: p.name, tel: p.tel, payment: a.payment });
        }

        return Response.json({ meeting: lastMeeting, people: missing }, { headers: cors });
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

    // PUT — link cert to person
    if (request.method === 'PUT') {
      const body = await request.json();
      const { id, person_type, person_id, person_name } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400, headers: cors });
      if (!person_type || !person_id) return Response.json({ error: 'person_type and person_id required' }, { status: 400, headers: cors });

      await env.DB.prepare(
        'UPDATE whatsapp_cert SET person_type=?, person_id=?, person_name=? WHERE id=?'
      ).bind(person_type, person_id, person_name || '', id).run();

      return Response.json({ ok: true }, { headers: cors });
    }

    // POST — create (base64 photo) — requires valid token
    if (request.method === 'POST') {
      const body = await request.json();
      const { token, from_number, data, comment, note, person_type, person_id, person_name } = body;
      if (!token) return Response.json({ error: 'token required' }, { status: 401, headers: cors });
      const tok = await verifyToken(token);
      if (!tok) return Response.json({ error: 'invalid or expired token' }, { status: 401, headers: cors });
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
        'INSERT INTO whatsapp_cert (from_number, filename, r2_key, comment, note, content_type, file_size, person_type, person_id, person_name) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).bind(from_number, `${ts}.jpg`, r2Key, comment || '', note || '', 'image/jpeg', bytes.length, person_type || '', person_id || 0, person_name || '').run();

      return Response.json({ ok: true, r2_key: r2Key, url: `/api/image?name=${r2Key}` }, { headers: cors });
    }

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
