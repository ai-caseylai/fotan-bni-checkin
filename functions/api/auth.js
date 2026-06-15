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
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

  try {
    // Rate limit check
    if (action === 'login') {
      const lockRow = await env.DB.prepare("SELECT value FROM settings WHERE key='auth_lock_' || ?").bind(clientIp).first();
      if (lockRow) {
        try {
          const lock = JSON.parse(lockRow.value);
          if (Date.now() - lock.time < 900000) {
            const remain = Math.ceil((900000 - (Date.now() - lock.time)) / 60000);
            return Response.json({ error: '已鎖定，' + remain + ' 分鐘後重試' }, { status: 429, headers: cors });
          }
          // Expired lock, clear it
          await env.DB.prepare("DELETE FROM settings WHERE key='auth_lock_' || ?").bind(clientIp).run();
        } catch(e) {}
      }
    }

    if (request.method === 'POST' && action === 'login') {
      const { password } = await request.json();
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
      let validPwd = false;

      if (!row) {
        validPwd = password === 'admin888';
        if (validPwd) {
          await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").bind(password).run();
        }
      } else {
        validPwd = password === row.value;
      }

      if (!validPwd) {
        // Track failed attempt
        const failKey = 'auth_fail_' + clientIp;
        const failRow = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(failKey).first();
        let fails = 1;
        if (failRow) { try { fails = parseInt(failRow.value) + 1; } catch(e) {} }
        await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)").bind(failKey, String(fails)).run();

        if (fails >= 5) {
          await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)")
            .bind('auth_lock_' + clientIp, JSON.stringify({ time: Date.now(), fails })).run();
          await env.DB.prepare("DELETE FROM settings WHERE key=?").bind(failKey).run();
          return Response.json({ error: '失敗太多次，已鎖定15分鐘' }, { status: 429, headers: cors });
        }
        return Response.json({ error: '密碼錯誤（剩餘 ' + (5 - fails) + ' 次）' }, { status: 401, headers: cors });
      }

      // Clear failed attempts on success
      await env.DB.prepare("DELETE FROM settings WHERE key='auth_fail_' || ?").bind(clientIp).run();
      await env.DB.prepare("DELETE FROM settings WHERE key='auth_lock_' || ?").bind(clientIp).run();
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
      const { oldPassword, password } = await request.json();
      if (!password || password.length < 4) return Response.json({ error: '新密碼至少4位' }, { status: 400, headers: cors });

      // Require old password
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
      if (row && oldPassword !== row.value) {
        return Response.json({ error: '舊密碼錯誤' }, { status: 401, headers: cors });
      }

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
      'Set-Cookie': `fotan_auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400; Secure`
    }
  });
}
