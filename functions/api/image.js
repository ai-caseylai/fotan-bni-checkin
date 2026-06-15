export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  if (!name) return new Response('Missing name', { status: 400 });

  try {
    let obj = await env.R2.get(name);
    if (!obj) obj = await env.R2.get(name + '.png');
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
