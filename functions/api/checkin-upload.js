export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await request.json();
    const { attendance_id, data } = body;
    if (!attendance_id || !data) return Response.json({ error: 'attendance_id and data required' }, { status: 400, headers: cors });

    // Upload to R2
    const key = `receipt-att-${attendance_id}.jpg`;
    const base64 = data.replace(/^data:image\/\w+;base64,/, '');
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    await env.R2.put(key, bytes, {
      httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' }
    });

    // Update attendance payment status
    await env.DB.prepare("UPDATE attendance SET payment='paid', payment_method='receipt_uploaded' WHERE id=?")
      .bind(attendance_id).run();

    // If person_type is member, also save to member_receipts
    const att = await env.DB.prepare('SELECT * FROM attendance WHERE id=?').bind(attendance_id).first();
    if (att && att.person_type === 'member') {
      await env.DB.prepare('INSERT INTO member_receipts (member_id, filename) VALUES (?,?)')
        .bind(att.person_id, `簽到憑證-${attendance_id}.jpg`).run();
    }

    return Response.json({ ok: true, url: `/api/image?name=receipt-att-${attendance_id}` }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
