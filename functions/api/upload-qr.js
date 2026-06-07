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
    const { name, data } = body; // name: 'wechatpay' or 'alipay', data: base64 string
    if (!name || !data) return Response.json({ error: 'name and data required' }, { status: 400, headers: cors });

    const base64 = data.replace(/^data:image\/\w+;base64,/, '');
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    await env.R2.put('qr-' + name + '.png', bytes, {
      httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=3600' }
    });

    return Response.json({ ok: true, url: '/api/image?name=qr-' + name }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
