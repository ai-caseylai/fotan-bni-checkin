export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const am = url.searchParams.get('am') || '388';
  const ua = request.headers.get('user-agent') || '';
  const isMobile = /iPhone|iPad|Android/i.test(ua);

  let mobileScript = '';
  if (isMobile) {
    mobileScript = '<script>setTimeout(function(){window.open("alipayhk://","_blank")},500);<\/script>';
  }

  const html = '<!DOCTYPE html><html lang="zh-HK"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Alipay HK 付款</title>' +
    '<style>' +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'body{font-family:-apple-system,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}' +
      '.box{background:#fff;border-radius:16px;padding:32px 24px;max-width:360px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08)}' +
      '.title{font-size:16px;font-weight:700;margin-bottom:8px;color:#1677ff}' +
      '.amt{font-size:40px;font-weight:800;margin:8px 0}' +
      '.qr{width:200px;height:200px;margin:0 auto 12px;display:block}' +
      '.hint{font-size:12px;color:#94a3b8;line-height:1.6}' +
    '</style>' +
    '</head><body>' +
    '<div class="box">' +
      '<div class="title">💙 Alipay HK</div>' +
      '<div class="amt">HK$' + am + '</div>' +
      '<img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('https://www.alipayhk.com/') + '" alt="Alipay">' +
      '<div class="hint">打開AlipayHK App掃描付款</div>' +
    '</div>' +
    mobileScript +
    '</body></html>';

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-cache' }
  });
}
