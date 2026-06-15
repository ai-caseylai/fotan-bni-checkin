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
    const { token, guests } = body;

    // Verify token
    if (!token) return Response.json({ ok: false, error: 'token required' }, { headers: cors });
    const tok = await env.DB.prepare(
      "SELECT * FROM skill_tokens WHERE token=? AND active=1 AND expires_at > datetime('now')"
    ).bind(token).first();
    if (!tok) return Response.json({ ok: false, error: 'invalid or expired token' }, { headers: cors });

    if (!guests || !Array.isArray(guests) || !guests.length) {
      return Response.json({ ok: false, error: 'guests array required' }, { headers: cors });
    }

    // Get latest meeting
    let mid = await env.DB.prepare('SELECT id FROM meetings ORDER BY date DESC LIMIT 1').first();
    mid = mid ? mid.id : null;
    if (!mid) return Response.json({ ok: false, error: 'no meeting found' }, { headers: cors });

    let added = 0, skipped = 0, paid = 0, unpaid = 0;
    const results = [];

    for (const g of guests) {
      const name = String(g.name || '').trim();
      if (!name) continue;
      // Parse payment from various formats
      let payStatus = '';
      const rawPay = String(g.payment || '').toLowerCase();
      if (rawPay === 'paid' || rawPay === '已付款' || rawPay.includes('paid') || rawPay.includes('💰')) {
        payStatus = 'paid'; paid++;
      } else if (rawPay === 'free' || rawPay === '免費' || rawPay === '免付款' || rawPay.includes('free') || rawPay.includes('🆓')) {
        payStatus = 'free';
      } else {
        unpaid++;
      }

      // Check duplicate in guests + members
      const existGuest = await env.DB.prepare('SELECT id FROM guests WHERE name=? AND active=1').bind(name).first();
      const existMember = await env.DB.prepare('SELECT id FROM members WHERE name=? AND active=1').bind(name).first();
      if (existGuest || existMember) { skipped++; results.push({ name, status: 'skipped', reason: 'duplicate' }); continue; }

      const result = await env.DB.prepare(
        'INSERT INTO guests (name, professional, tel, invited_by, meeting_id) VALUES (?,?,?,?,?)'
      ).bind(name, g.professional || '', g.tel || '', g.invited_by || '', mid).run();
      const guestId = result.meta.last_row_id;

      await env.DB.prepare(
        'INSERT INTO attendance (meeting_id, person_type, person_id, payment) VALUES (?,?,?,?)'
      ).bind(mid, 'guest', guestId, payStatus).run();

      added++;
      results.push({ name, status: 'added', payment: payStatus || 'unpaid', guest_id: guestId });
    }

    return Response.json({
      ok: true,
      meeting_id: mid,
      added, skipped, paid_count: paid, unpaid_count: unpaid,
      message: `已匯入 ${added} 位來賓（跳過 ${skipped} 位重複），${paid} 位已付款，${unpaid} 位未付款`,
      results: results.slice(0, 20)
    }, { headers: cors });

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { headers: cors });
  }
}
