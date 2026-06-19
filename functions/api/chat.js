import { callQwen } from '../lib/chatbot.js';

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
    const { messages } = body;
    if (!messages || !messages.length) return Response.json({ error: 'messages required' }, { status: 400, headers: cors });

    const apiKey = env.QWEN_API_KEY || '';
    if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500, headers: cors });

    const result = await callQwen(env, messages, apiKey);
    return Response.json({ reply: result.reply, tools_used: result.tools_used || [] }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
