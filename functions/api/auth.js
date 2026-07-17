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
          await env.DB.prepare("DELETE FROM settings WHERE key='auth_lock_' || ?").bind(clientIp).run();
        } catch(e) {}
      }
    }

    if (request.method === 'POST' && action === 'login') {
      const body = await request.json();
      const { password } = body;
      const username = (body.username || '').trim();

      // ── User account login (has username field) ──
      if (username) {
        const userRow = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first();
        if (userRow) {
          const hashed = await hashPassword(password);
          if (hashed === userRow.password) {
            if (userRow.status === 'pending') {
              return Response.json({ error: '帳戶尚未獲批核，請等待管理員審核' }, { status: 403, headers: cors });
            }
            if (userRow.status === 'rejected') {
              return Response.json({ error: '帳戶已被拒絕' }, { status: 403, headers: cors });
            }
            await env.DB.prepare("DELETE FROM settings WHERE key='auth_fail_' || ?").bind(clientIp).run();
            await env.DB.prepare("DELETE FROM settings WHERE key='auth_lock_' || ?").bind(clientIp).run();
            return setCookie(username + ':' + (username === 'admin' ? 'admin' : userRow.role), '登入成功', cors);
          }
        }
        return trackFail(env, clientIp, cors);
      }

      // ── Admin password login (no username) ──
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

      if (!validPwd) { return trackFail(env, clientIp, cors); }

      await env.DB.prepare("DELETE FROM settings WHERE key='auth_fail_' || ?").bind(clientIp).run();
      await env.DB.prepare("DELETE FROM settings WHERE key='auth_lock_' || ?").bind(clientIp).run();
      return setCookie('admin:admin', '登入成功', cors);
    }

    if (action === 'check') {
      const cookie = request.headers.get('Cookie') || '';
      const match = cookie.match(/fotan_auth=([^;]+)/);
      if (!match) return Response.json({ ok: false }, { headers: cors });

      const token = match[1];
      // Admin check — backward compat
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
      if (row && token === btoa(row.value)) return Response.json({ ok: true, role: 'admin' }, { headers: cors });
      if (token === btoa('admin:admin')) return Response.json({ ok: true, role: 'admin' }, { headers: cors });

      // User account check
      try {
        const decoded = atob(token);
        if (decoded.includes(':')) {
          const [username, role] = decoded.split(':');
          const userRow = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first();
          if (userRow && userRow.role === role && userRow.status === 'approved') {
            return Response.json({ ok: true, role: role, username: username }, { headers: cors });
          }
        }
      } catch(e) {}

      return Response.json({ ok: false }, { headers: cors });
    }

    // Emergency reset
    if (request.method === 'POST' && action === 'reset_pwd') {
      const { reset_key } = await request.json();
      if (reset_key !== 'fotan-reset-2026') {
        return Response.json({ error: 'reset_key 錯誤' }, { status: 401, headers: cors });
      }
      await env.DB.prepare("DELETE FROM settings WHERE key='admin_password'").run();
      await env.DB.prepare("DELETE FROM settings WHERE key='auth_fail_' || ?").bind(clientIp).run();
      await env.DB.prepare("DELETE FROM settings WHERE key='auth_lock_' || ?").bind(clientIp).run();
      return Response.json({ ok: true, message: '密碼已重置為 admin888' }, { headers: cors });
    }

    if (request.method === 'POST' && action === 'change_pwd') {
      const { oldPassword, password } = await request.json();
      if (!password || password.length < 4) return Response.json({ error: '新密碼至少4位' }, { status: 400, headers: cors });

      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
      if (row && oldPassword !== row.value) {
        return Response.json({ error: '舊密碼錯誤' }, { status: 401, headers: cors });
      }

      if (row) {
        await env.DB.prepare("UPDATE settings SET value=? WHERE key='admin_password'").bind(password).run();
      } else {
        await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").bind(password).run();
      }
      return setCookie('admin:admin', '密碼已更新', cors);
    }

    // ── User Registration ──
    if (request.method === 'POST' && action === 'register') {
      const { username, password, role } = await request.json();

      if (!username || username.trim().length < 3) {
        return Response.json({ error: '用戶名至少3個字元' }, { status: 400, headers: cors });
      }
      if (!password || password.length < 4) {
        return Response.json({ error: '密碼至少4個字元' }, { status: 400, headers: cors });
      }
      if (!role || !['staff', 'manager'].includes(role)) {
        return Response.json({ error: '角色必須是 staff 或 manager' }, { status: 400, headers: cors });
      }

      // Check uniqueness
      const existing = await env.DB.prepare("SELECT id FROM users WHERE username=?").bind(username.trim()).first();
      if (existing) {
        return Response.json({ error: '用戶名已被使用' }, { status: 409, headers: cors });
      }

      const hashed = await hashPassword(password);
      await env.DB.prepare("INSERT INTO users (username, password, role, status) VALUES (?,?,?,'pending')")
        .bind(username.trim(), hashed, role).run();

      return Response.json({ ok: true, message: '註冊成功，請等待管理員審核', username: username.trim(), role: role }, { headers: cors });
    }

    // ── Logout ──
    if (action === 'logout') {
      return new Response(JSON.stringify({ ok: true, message: '已登出' }), {
        headers: {
          ...cors,
          'Set-Cookie': 'fotan_auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure'
        }
      });
    }

    // ── User Management (admin/manager only) ──
    if (action === 'list_users') {
      const auth = await checkAdminAuth(request, env);
      if (!auth.ok) return Response.json({ error: auth.error }, { status: 403, headers: cors });

      const users = await env.DB.prepare("SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC").all();
      return Response.json({ ok: true, users: users.results }, { headers: cors });
    }

    if (request.method === 'POST' && action === 'approve_user') {
      const auth = await checkAdminAuth(request, env);
      if (!auth.ok) return Response.json({ error: auth.error }, { status: 403, headers: cors });

      const { username } = await request.json();
      if (!username) return Response.json({ error: '缺少用戶名' }, { status: 400, headers: cors });

      const userRow = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first();
      if (!userRow) return Response.json({ error: '用戶不存在' }, { status: 404, headers: cors });

      await env.DB.prepare("UPDATE users SET status='approved' WHERE username=?").bind(username).run();
      return Response.json({ ok: true, message: '已批核用戶 ' + username }, { headers: cors });
    }

    if (request.method === 'POST' && action === 'reject_user') {
      const auth = await checkAdminAuth(request, env);
      if (!auth.ok) return Response.json({ error: auth.error }, { status: 403, headers: cors });

      const { username } = await request.json();
      if (!username) return Response.json({ error: '缺少用戶名' }, { status: 400, headers: cors });

      const userRow = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first();
      if (!userRow) return Response.json({ error: '用戶不存在' }, { status: 404, headers: cors });

      await env.DB.prepare("UPDATE users SET status='rejected' WHERE username=?").bind(username).run();
      return Response.json({ ok: true, message: '已拒絕用戶 ' + username }, { headers: cors });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400, headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}

async function trackFail(env, clientIp, cors) {
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

async function hashPassword(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkAdminAuth(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/fotan_auth=([^;]+)/);
  if (!match) return { ok: false, error: '未登入' };

  const token = match[1];

  // Admin login
  if (token === btoa('admin:admin')) return { ok: true, role: 'admin' };
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
  if (row && token === btoa(row.value)) return { ok: true, role: 'admin' };

  // User account — must be manager
  try {
    const decoded = atob(token);
    if (decoded.includes(':')) {
      const [username, role] = decoded.split(':');
      if (role === 'manager') {
        const userRow = await env.DB.prepare("SELECT * FROM users WHERE username=? AND status='approved'").bind(username).first();
        if (userRow && userRow.role === 'manager') return { ok: true, role: 'manager' };
      }
    }
  } catch(e) {}

  return { ok: false, error: '權限不足' };
}

function setCookie(tokenValue, msg, cors) {
  const token = btoa(tokenValue);
  return new Response(JSON.stringify({ ok: true, message: msg }), {
    headers: {
      ...cors,
      'Set-Cookie': `fotan_auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400; Secure`
    }
  });
}
