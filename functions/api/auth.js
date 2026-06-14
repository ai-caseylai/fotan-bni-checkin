export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    if (request.method === 'POST' && action === 'login') {
      const { password } = await request.json();
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
      if (!row) {
        if (password === 'admin888') {
          await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").bind(password).run();
          return setCookie(password, '登入成功', cors);
        }
        return Response.json({ error: 'Invalid password' }, { status: 401, headers: cors });
      }
      if (password !== row.value) {
        return Response.json({ error: 'Invalid password' }, { status: 401, headers: cors });
      }
      return setCookie(password, '登入成功', cors);
    }

    if (action === 'check') {
      const cookie = request.headers.get('Cookie') || '';
      const match = cookie.match(/fotan_auth=([^;]+)/);
      if (!match) return Response.json({ ok: false }, { headers: cors });
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
      const valid = row && match[1] === btoa(row.value);
      return Response.json({ ok: valid }, { headers: cors });
    }

    if (request.method === 'POST' && action === 'change_pwd') {
      const { password } = await request.json();
      if (!password || password.length < 4) return Response.json({ error: '密碼至少4位' }, { status: 400, headers: cors });
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
      if (row) {
        await env.DB.prepare("UPDATE settings SET value=? WHERE key='admin_password'").bind(password).run();
      } else {
        await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").bind(password).run();
      }
      return setCookie(password, '密碼已更新', cors);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400, headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}

function setCookie(password, msg, cors) {
  const token = btoa(password);
  return new Response(JSON.stringify({ ok: true, message: msg }), {
    headers: {
      ...cors,
      'Set-Cookie': `fotan_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    }
  });
}
