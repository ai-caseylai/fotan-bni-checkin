export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const tables = ['members', 'guests', 'meetings', 'attendance', 'settings', 'member_receipts'];
    const backup = {};
    for (const t of tables) {
      try {
        const rows = await env.DB.prepare(`SELECT * FROM ${t}`).all();
        backup[t] = rows.results;
      } catch (e) {
        backup[t] = { error: e.message };
      }
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const json = JSON.stringify(backup, null, 2);

    return new Response(json, {
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="fotan-backup-${ts}.json"`
      }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
