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
    const { filename, data, content_type } = body;
    if (!data) return Response.json({ error: 'data required' }, { status: 400, headers: cors });

    const base64 = data.replace(/^data:[^;]+;base64,/, '');
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const ts = Date.now();
    const ext = (filename || 'file').split('.').pop() || 'bin';
    const key = `chat-upload-${ts}.${ext}`;

    await env.R2.put(key, bytes, {
      httpMetadata: {
        contentType: content_type || 'application/octet-stream',
        cacheControl: 'public, max-age=86400'
      }
    });

    return Response.json({
      ok: true,
      key,
      filename: filename || key,
      size: bytes.length,
      url: `/api/image?name=${key}`
    }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
