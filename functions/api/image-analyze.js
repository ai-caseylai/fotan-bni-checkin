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
    const { image } = body;
    if (!image) return Response.json({ error: 'image required' }, { status: 400, headers: cors });

    const apiKey = env.QWEN_API_KEY || '';
    if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500, headers: cors });

    const resp = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: '請用繁體中文簡短描述這張圖片的內容（1-3句）。如果是文件/收據，請提取關鍵資訊（金額、日期、名稱等）。' }
          ]
        }]
      })
    });

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || '無法分析此圖片';
    return Response.json({ reply }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
