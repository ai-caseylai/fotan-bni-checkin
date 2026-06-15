export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let dateFilter = '';
    const params = [];
    if (from) { dateFilter += ' AND date >= ?'; params.push(from); }
    if (to) { dateFilter += ' AND date <= ?'; params.push(to); }

    const meetings = await env.DB.prepare(`SELECT * FROM meetings WHERE 1=1 ${dateFilter} ORDER BY date DESC`).bind(...params).all();
    const totalMeetings = meetings.results.length;

    const allAttendance = [];
    for (const m of meetings.results) {
      const att = await env.DB.prepare('SELECT * FROM attendance WHERE meeting_id=?').bind(m.id).all();
      allAttendance.push(...att.results.map(a => ({ ...a, meeting_date: m.date })));
    }

    const memberCount = (await env.DB.prepare('SELECT COUNT(*) as c FROM members WHERE active=1').first()).c;

    // Calculate revenue for latest meeting
    let revenue = 0;
    const latest = meetings.results[0];
    if (latest) {
      const revRow = await env.DB.prepare(
        `SELECT SUM(CASE WHEN a.payment IN ('paid','free') THEN
          CASE
            WHEN a.price_tier='early_bird' THEN COALESCE(NULLIF(m.early_bird_fee,0), 388)
            WHEN a.price_tier='walk_in' THEN COALESCE(NULLIF(m.walk_in_fee,0), 388)
            WHEN a.price_tier='committee' THEN COALESCE(NULLIF(m.committee_fee,0), 388)
            WHEN a.person_type='guest' THEN COALESCE(NULLIF(m.guest_fee,0), 388)
            WHEN a.person_type='member' THEN COALESCE(NULLIF(m.member_fee,0), 388)
            ELSE COALESCE(NULLIF(m.member_fee,0), 388)
          END
        ELSE 0 END) as total
        FROM attendance a JOIN meetings m ON a.meeting_id=m.id WHERE a.meeting_id=?`
      ).bind(latest.id).first();
      revenue = revRow?.total || 0;
    }

    const stats = {
      total_meetings: totalMeetings,
      total_attendance: allAttendance.length,
      member_count: memberCount,
      member_attendance: allAttendance.filter(a => a.person_type === 'member').length,
      guest_attendance: allAttendance.filter(a => a.person_type === 'guest').length,
      observer_attendance: allAttendance.filter(a => a.person_type === 'observer').length,
      paid_count: allAttendance.filter(a => a.payment && a.payment.toLowerCase() !== 'unpaid' && a.payment !== '').length,
      unpaid_count: allAttendance.filter(a => a.payment === '' || a.payment.toLowerCase() === 'unpaid').length,
      revenue: revenue,
      avg_arrival: '',
      recent_meetings: meetings.results.slice(0, 10)
    };

    const times = allAttendance.filter(a => a.arrival_time).map(a => a.arrival_time);
    if (times.length > 0) {
      const mins = times.map(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
      });
      const avgMin = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
      stats.avg_arrival = `${String(Math.floor(avgMin / 60)).padStart(2, '0')}:${String(avgMin % 60).padStart(2, '0')}`;
    }

    return Response.json(stats, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
