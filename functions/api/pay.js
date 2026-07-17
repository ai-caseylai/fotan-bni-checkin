export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const attId = url.searchParams.get('id');

  if (!attId || isNaN(attId)) {
    return new Response('Missing or invalid attendance id', { status: 400 });
  }

  try {
    // Load attendance record with person and meeting info
    const att = await env.DB.prepare(`
      SELECT a.*, m.date, m.type as meeting_type,
        m.member_fee, m.committee_fee, m.guest_fee, m.early_bird_fee, m.walk_in_fee
      FROM attendance a
      JOIN meetings m ON a.meeting_id = m.id
      WHERE a.id = ?
    `).bind(attId).first();

    if (!att) {
      return new Response('Attendance record not found', { status: 404 });
    }

    // Get person name
    let personName = 'Unknown';
    if (att.person_type === 'member') {
      const m = await env.DB.prepare('SELECT name, tel FROM members WHERE id=?').bind(att.person_id).first();
      if (m) personName = m.name;
    } else if (att.person_type === 'guest') {
      const g = await env.DB.prepare('SELECT name, tel FROM guests WHERE id=?').bind(att.person_id).first();
      if (g) personName = g.name;
    }

    // Get settings
    const settingsRows = await env.DB.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.results.forEach(r => { settings[r.key] = r.value; });

    const paymeLink = settings.paymeLink || '';
    const fpsPhone = settings.fpsPhone || '';
    const aliLink = settings.aliLink || '';
    const wcLink = settings.wcLink || '';

    // Determine fee
    const lunchFee = parseInt(settings.lunchFee) || 388;
    let displayFee = lunchFee;
    let feeLabel = '午餐費用';
    const tier = att.price_tier || '';
    if (tier === 'early_bird') {
      displayFee = att.early_bird_fee || lunchFee;
      feeLabel = '早鳥價';
    } else if (tier === 'walk_in') {
      displayFee = att.walk_in_fee || lunchFee;
      feeLabel = '臨場價';
    } else if (att.person_type === 'guest') {
      displayFee = att.guest_fee || lunchFee;
      feeLabel = '來賓價';
    } else {
      displayFee = att.member_fee || lunchFee;
      feeLabel = '會員價';
    }

    const paid = att.payment === 'paid' || att.payment === 'free';
    const isFree = att.payment === 'free';
    const paymentMethods = att.payment_method || '';

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    const ua = request.headers.get('user-agent') || '';
    const isMobile = /iPhone|iPad|Android/i.test(ua);

    // Build payment buttons HTML
    let payButtons = '';
    if (!paid) {
      if (paymeLink) {
        payButtons += '<a href="' + esc(paymeLink) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;border-radius:12px;background:#e31b5f;color:#fff;text-decoration:none;font-size:16px;font-weight:700;margin-bottom:10px">💳 PayMe · 點擊付款 HK$' + displayFee + '</a>';
      }
      if (wcLink) {
        payButtons += '<a href="' + esc(wcLink) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;border-radius:12px;background:#07c160;color:#fff;text-decoration:none;font-size:16px;font-weight:700;margin-bottom:10px">💚 WeChat Pay · 點擊付款 HK$' + displayFee + '</a>';
      }
      if (aliLink) {
        payButtons += '<a href="' + esc(aliLink) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;border-radius:12px;background:#1677ff;color:#fff;text-decoration:none;font-size:16px;font-weight:700;margin-bottom:10px">💙 Alipay HK · 點擊付款 HK$' + displayFee + '</a>';
      }
      if (fpsPhone) {
        payButtons += '<div style="background:#f8fafc;border:2px solid #6366f1;border-radius:12px;padding:16px;text-align:center;margin-bottom:10px">' +
          '<div style="font-weight:700;font-size:15px;color:#6366f1;margin-bottom:8px">🏦 FPS 轉數快</div>' +
          '<div style="font-size:13px;color:#64748b;margin-bottom:8px">電話：' + esc(fpsPhone) + '</div>' +
          '<div style="font-size:24px;font-weight:800;color:#6366f1;margin-bottom:8px">HK$' + displayFee + '</div>' +
          '<div style="font-size:11px;color:#94a3b8">打開銀行App，輸入電話及金額轉帳</div>' +
          '</div>';
      }
      if (!payButtons) {
        payButtons = '<div style="text-align:center;padding:20px;color:#94a3b8">暫未設定付款方式<br><small>請聯絡管理員</small></div>';
      }
    }

    const html = '<!DOCTYPE html><html lang="zh-HK"><head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<title>付款 — ' + esc(personName) + '</title>' +
      '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f1f5f9;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}' +
        '.card{background:#fff;border-radius:16px;padding:28px 20px;max-width:380px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08)}' +
        '.header{text-align:center;margin-bottom:20px}' +
        '.name{font-size:22px;font-weight:700;margin-bottom:4px}' +
        '.meeting{font-size:13px;color:#64748b;margin-bottom:12px}' +
        '.status{display:inline-block;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600}' +
        '.status-paid{background:#dcfce7;color:#10b981}' +
        '.status-free{background:#dbeafe;color:#3b82f6}' +
        '.status-unpaid{background:#fef3c7;color:#f59e0b}' +
        '.amount-section{text-align:center;padding:16px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:16px 0}' +
        '.symbol{font-size:12px;color:#64748b;margin-bottom:4px}' +
        '.amt{font-size:40px;font-weight:800}' +
        '.pay-section{margin-top:16px}' +
        '.ref{text-align:center;font-size:10px;color:#cbd5e1;margin-top:16px}' +
      '</style>' +
      '</head><body>' +
      '<div class="card">' +
        '<div class="header">' +
          '<div class="name">' + esc(personName) + '</div>' +
          '<div class="meeting">📅 ' + esc(att.date) + ' · ' + (att.meeting_type === 'regular' ? '例會' : att.meeting_type === 'anniversary' ? '週年聚餐' : '特別會議') + '</div>' +
          '<span class="status ' + (paid ? (isFree ? 'status-free' : 'status-paid') : 'status-unpaid') + '">' +
            (isFree ? '🆓 免費' : (paid ? '✅ 已付款' : '⚠️ 未付款')) +
          '</span>' +
          (paymentMethods === 'receipt_uploaded' ? ' <span style="font-size:10px;color:#94a3b8">(已上傳憑證)</span>' : '') +
        '</div>' +
        '<div class="amount-section">' +
          '<div class="symbol">' + esc(feeLabel) + '</div>' +
          '<div class="amt">HK$' + displayFee + '</div>' +
        '</div>' +
        '<div class="pay-section">' +
          (paid
            ? '<div style="text-align:center;padding:20px;color:#10b981;font-size:48px">✅</div><div style="text-align:center;font-size:14px;color:#10b981;font-weight:600">已完成付款</div>'
            : payButtons) +
        '</div>' +
        '<div class="ref">Ref: #' + attId + '</div>' +
      '</div>' +
      '</body></html>';

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-cache' }
    });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
