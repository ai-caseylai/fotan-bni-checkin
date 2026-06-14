export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone') || '97188675';
  const am = url.searchParams.get('am') || '388';
  const ua = request.headers.get('user-agent') || '';
  const isMobile = /iPhone|iPad|Android/i.test(ua);

  let mobileScript = '';
  if (isMobile) {
    mobileScript = '<script>' +
      'var schemes=["alipayhk://","payme://"];' +
      'var i=0;' +
      'function tryNext(){' +
        'if(i>=schemes.length)return;' +
        'var w=window.open(schemes[i],"_blank");' +
        'i++;' +
        'setTimeout(function(){if(!w||w.closed)tryNext()},2500);' +
      '}' +
      'setTimeout(tryNext,500);' +
    '<\/script>';
  }

  const html = '<!DOCTYPE html><html lang="zh-HK"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>FPS 轉數快付款</title>' +
    '<style>' +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'body{font-family:-apple-system,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}' +
      '.box{background:#fff;border-radius:16px;padding:32px 24px;max-width:360px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08)}' +
      '.title{font-size:16px;font-weight:700;margin-bottom:8px}' +
      '.amt{font-size:40px;font-weight:800;margin:8px 0}' +
      '.phone{font-size:14px;color:#64748b;margin-bottom:16px}' +
      '.qr{width:200px;height:200px;margin:0 auto 12px;display:block}' +
      '.hint{font-size:12px;color:#94a3b8;line-height:1.6}' +
    '</style>' +
    '</head><body>' +
    '<div class="box">' +
      '<div class="title">🏦 FPS 轉數快</div>' +
      '<div class="amt">HK$' + am + '</div>' +
      '<div class="phone">收款電話：' + phone + '</div>' +
      '<img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('https://fotan.techforliving.net/api/fps-redirect?phone='+phone+'&am='+am) + '" alt="FPS">' +
      '<div class="hint">打開銀行App掃描QR Code付款<br>或手動轉數快至 ' + phone + '</div>' +
    '</div>' +
    mobileScript +
    '</body></html>';

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-cache' }
  });
}
