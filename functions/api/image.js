export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  if (!name) return new Response('Missing name', { status: 400 });

  try {
    let obj = await env.R2.get(name);
    if (!obj) obj = await env.R2.get(name + '.png');
    if (!obj) return new Response('Not found', { status: 404 });

    const headers = {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600'
    };

    // ?download=1 or &download → force download with filename
    if (url.searchParams.has('download')) {
      const filename = name.includes('/') ? name.split('/').pop() : name;
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    }

    return new Response(obj.body, { headers });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
