// RESTful User Approval API — token-authenticated, time-limited
// GET  /api/user-approvals?token=xxx          → list pending users
// POST /api/user-approvals?token=xxx          → approve/reject {username, action:"approve"|"reject"}
// POST /api/user-approvals?token=xxx&gen=1    → generate a new token (admin only via cookie)

export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const token = url.searchParams.get('token') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const gen = url.searchParams.get('gen');

  try {
    // ── Generate new token (cookie-based admin auth) — checked FIRST ──
    if (gen === '1' && request.method === 'POST') {
      const cookie = request.headers.get('Cookie') || '';
      const match = cookie.match(/fotan_auth=([^;]+)/);
      if (!match) return Response.json({ error: '未登入' }, { status: 403, headers: cors });

      const authToken = match[1];
      let isAdmin = (authToken === btoa('admin:admin'));
      if (!isAdmin) {
        const pwdRow = await env.DB.prepare("SELECT value FROM settings WHERE key='admin_password'").first();
        if (pwdRow && authToken === btoa(pwdRow.value)) isAdmin = true;
      }
      if (!isAdmin) {
        // Check manager
        try {
          const decoded = atob(authToken);
          if (decoded.includes(':')) {
            const [username, role] = decoded.split(':');
            if (role === 'manager') {
              const userRow = await env.DB.prepare("SELECT * FROM users WHERE username=? AND status='approved'").bind(username).first();
              if (userRow && userRow.role === 'manager') isAdmin = true;
            }
          }
        } catch(e) {}
      }
      if (!isAdmin) return Response.json({ error: '權限不足' }, { status: 403, headers: cors });

      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let newToken = 'appr_';
      for (let i = 0; i < 32; i++) newToken += chars[Math.floor(Math.random() * chars.length)];
      const ttlHours = parseInt(url.searchParams.get('ttl')) || 24;
      const expiresAt = Date.now() + ttlHours * 3600 * 1000;

      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('approve_token', ?)")
        .bind(JSON.stringify({ token: newToken, expires_at: expiresAt, created_at: Date.now() })).run();

      return Response.json({
        ok: true,
        token: newToken,
        expires_at: new Date(expiresAt).toISOString(),
        ttl_hours: ttlHours
      }, { headers: cors });
    }

    // ── Token verification (all operations below require valid token) ──
    const tokenRow = await env.DB.prepare(
      "SELECT value FROM settings WHERE key='approve_token'"
    ).first();
    if (!tokenRow) return Response.json({ error: '未設定審批 token，請管理員先生成' }, { status: 401, headers: cors });

    let tokenData;
    try { tokenData = JSON.parse(tokenRow.value); } catch(e) {
      return Response.json({ error: 'token 格式錯誤' }, { status: 500, headers: cors });
    }

    if (!token || token !== tokenData.token) {
      return Response.json({ error: 'token 無效' }, { status: 401, headers: cors });
    }
    if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
      return Response.json({ error: 'token 已過期，請管理員重新生成' }, { status: 401, headers: cors });
    }

    // ── GET — list pending users ──
    if (request.method === 'GET') {
      const users = await env.DB.prepare(
        "SELECT id, username, role, status, created_at FROM users WHERE status='pending' ORDER BY created_at ASC"
      ).all();
      return Response.json({ ok: true, users: users.results }, { headers: cors });
    }

    // ── POST — approve or reject a user ──
    if (request.method === 'POST') {
      const body = await request.json();
      const { username, action } = body;

      if (!username) return Response.json({ error: '缺少 username' }, { status: 400, headers: cors });
      if (!action || !['approve', 'reject'].includes(action)) {
        return Response.json({ error: 'action 必須是 approve 或 reject' }, { status: 400, headers: cors });
      }

      const userRow = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first();
      if (!userRow) return Response.json({ error: '用戶不存在' }, { status: 404, headers: cors });

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await env.DB.prepare("UPDATE users SET status=? WHERE username=?").bind(newStatus, username).run();

      return Response.json({
        ok: true,
        username: username,
        status: newStatus,
        message: action === 'approve' ? '已批核' : '已拒絕'
      }, { headers: cors });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
