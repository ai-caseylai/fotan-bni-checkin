import { callQwen } from '../lib/chatbot.js';

const BOT_TOKEN = '8563702597:AAFLYVplx4MijOanXLR7uxjFLFpfmQ0G31A';
const BASE_URL = 'https://fotan.techforliving.net';

export async function onRequest(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Webhook setup
    if (request.method === 'GET' && action === 'setup') {
      const webhookUrl = BASE_URL + '/api/telegram';
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });
      const data = await resp.json();
      return Response.json({ ok: data.ok, description: data.description, webhook_url: webhookUrl });
    }

    // Webhook info
    if (request.method === 'GET' && action === 'info') {
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const data = await resp.json();
      return Response.json(data);
    }

    // Delete webhook
    if (request.method === 'GET' && action === 'delete') {
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
      const data = await resp.json();
      return Response.json(data);
    }

    // Get message log for admin
    if (request.method === 'GET' && action === 'messages') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const chatId = url.searchParams.get('chat_id') || '';
      let query = 'SELECT * FROM telegram_messages';
      let params = [];
      if (chatId) { query += ' WHERE chat_id=?'; params.push(chatId); }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      const rows = await env.DB.prepare(query).bind(...params).all();
      return Response.json(rows.results.reverse());
    }

    // Get unique chat list
    if (request.method === 'GET' && action === 'chats') {
      const rows = await env.DB.prepare(
        "SELECT chat_id, first_name, username, MAX(created_at) as last_msg, COUNT(*) as msg_count FROM telegram_messages GROUP BY chat_id ORDER BY last_msg DESC"
      ).all();
      return Response.json(rows.results);
    }

    // Main webhook handler
    if (request.method === 'POST') {
      const body = await request.json();
      const update = body;

      if (update.message) {
        await handleMessage(env, update.message);
      }

      return new Response('OK');
    }

    return Response.json({ error: 'Bad request' }, { status: 400 });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}

async function isAllowed(env, chatId) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='telegram_whitelist'").first();
  if (!row || !row.value) return true; // no whitelist = allow all
  const list = row.value.split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(String(chatId));
}

async function logMsg(env, chatId, role, content, msg) {
  const firstName = (msg && msg.from && msg.from.first_name) || '';
  const username = (msg && msg.from && msg.from.username) || '';
  await env.DB.prepare(
    'INSERT INTO telegram_messages (chat_id, username, first_name, role, content) VALUES (?,?,?,?,?)'
  ).bind(String(chatId), username, firstName, role, content || '').run();
}

async function handleMessage(env, msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const caption = msg.caption || '';
  const firstName = (msg.from && msg.from.first_name) || '';
  const username = (msg.from && msg.from.username) || '';

  // Whitelist check (only for non-command messages)
  if (text && text !== '/start' && text !== '/help') {
    if (!(await isAllowed(env, chatId))) {
      await logMsg(env, chatId, 'user', text, msg);
      await logMsg(env, chatId, 'bot', '[已封鎖] 未授權用戶', msg);
      return; // silently ignore
    }
  }

  try {
    // /start command
    if (text === '/start' || text === '/start@fotanbot') {
      await logMsg(env, chatId, 'user', '/start', msg);
      const reply = `Yo ${firstName}！我係龍蝦仔🦞 火炭會聚會助手！\n\n有咩幫到你？\n• 最近有咩聚會呀？\n• 邊個未找數？\n• 幫你搵會員聯絡\n• 加新來賓\n• 睇下統計數據\n\n📸 send相/PDF俾我會自動save低㗎！`;
      await sendMessage(chatId, reply);
      await logMsg(env, chatId, 'bot', reply, msg);
      return;
    }

    // /help command
    if (text === '/help' || text === '/help@fotanbot') {
      await logMsg(env, chatId, 'user', '/help', msg);
      const reply = `📋 可用功能：\n\n🔍 查詢會議、出席、付款狀態\n👤 搜尋會員及聯絡資料\n➕ 新增來賓（自動關聯最新會議）\n📊 會員統計及付款摘要\n📸 上傳圖片 → 儲存到雲端 R2\n📄 上傳 PDF → 儲存到雲端 R2`;
      await sendMessage(chatId, reply);
      await logMsg(env, chatId, 'bot', reply, msg);
      return;
    }

    // Photo upload
    if (msg.photo && msg.photo.length > 0) {
      await logMsg(env, chatId, 'user', '[圖片]', msg);
      await handlePhoto(env, msg, chatId);
      return;
    }

    // Document upload
    if (msg.document) {
      const docName = msg.document.file_name || '檔案';
      await logMsg(env, chatId, 'user', '[檔案] ' + docName, msg);
      await handleDocument(env, msg, chatId);
      return;
    }

    // Text message → chatbot
    if (text) {
      await logMsg(env, chatId, 'user', text, msg);
      await handleChat(env, chatId, text, msg);
      return;
    }

    if (caption) {
      await logMsg(env, chatId, 'user', caption, msg);
      await handleChat(env, chatId, caption, msg);
      return;
    }
  } catch (e) {
    await logMsg(env, chatId, 'bot', '⚠️ 錯誤：' + e.message, msg);
    await sendMessage(chatId, '⚠️ 處理訊息時發生錯誤');
  }
}

async function handleChat(env, chatId, text, msg) {
  await sendChatAction(chatId, 'typing');
  const apiKey = env.QWEN_API_KEY || '';
  if (!apiKey) {
    await sendMessage(chatId, '⚠️ AI 服務尚未設定。');
    await logMsg(env, chatId, 'bot', '⚠️ AI 服務尚未設定', msg);
    return;
  }

  const result = await callQwen(env, [{ role: 'user', content: text }], apiKey);
  const reply = result.reply || '抱歉，我無法處理這個請求。';
  if (reply.length <= 4000) {
    await sendMessage(chatId, reply);
  } else {
    for (let i = 0; i < reply.length; i += 4000) {
      await sendMessage(chatId, reply.slice(i, i + 4000));
    }
  }
  await logMsg(env, chatId, 'bot', reply, msg);
}

async function handlePhoto(env, msg, chatId) {
  await sendChatAction(chatId, 'upload_document');
  try {
    const photo = msg.photo[msg.photo.length - 1];
    const fileInfo = await getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    const resp = await fetch(fileUrl);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    const ts = Date.now();
    const key = `telegram-img-${chatId}-${ts}.jpg`;

    await env.R2.put(key, bytes, {
      httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' }
    });

    await env.DB.prepare(
      'INSERT INTO telegram_files (chat_id, filename, r2_key, content_type, file_size) VALUES (?,?,?,?,?)'
    ).bind(String(chatId), 'photo_' + ts + '.jpg', key, 'image/jpeg', bytes.length).run();

    let reply = `📸 圖片已儲存！\nR2 key: ${key}\n大小: ${formatSize(bytes.length)}`;
    await sendMessage(chatId, reply);

    // AI analysis
    const apiKey = env.QWEN_API_KEY || '';
    if (apiKey) {
      try {
        const aiResp = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({
            model: 'qwen-vl-plus',
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: fileUrl } },
              { type: 'text', text: '請用繁體中文簡短描述這張圖片的內容（1-2句）。如果是收據或文件，提取關鍵資訊。' }
            ]}]
          })
        });
        const aiData = await aiResp.json();
        const aiReply = aiData.choices?.[0]?.message?.content;
        if (aiReply) {
          await sendMessage(chatId, '🔍 ' + aiReply);
          reply += '\n🔍 ' + aiReply;
        }
      } catch (e) { /* ignore AI failure */ }
    }

    await logMsg(env, chatId, 'bot', reply, msg);
  } catch (e) {
    await sendMessage(chatId, '⚠️ 圖片儲存失敗');
    await logMsg(env, chatId, 'bot', '⚠️ 圖片儲存失敗：' + e.message, msg);
  }
}

async function handleDocument(env, msg, chatId) {
  await sendChatAction(chatId, 'upload_document');
  try {
    const doc = msg.document;
    const fileInfo = await getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    const resp = await fetch(fileUrl);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    const ts = Date.now();
    const ext = (doc.file_name || 'file').split('.').pop() || 'bin';
    const key = `telegram-file-${chatId}-${ts}.${ext}`;

    await env.R2.put(key, bytes, {
      httpMetadata: {
        contentType: doc.mime_type || 'application/octet-stream',
        cacheControl: 'public, max-age=86400'
      }
    });

    await env.DB.prepare(
      'INSERT INTO telegram_files (chat_id, filename, r2_key, content_type, file_size) VALUES (?,?,?,?,?)'
    ).bind(String(chatId), doc.file_name || ('file_' + ts), key, doc.mime_type || '', bytes.length).run();

    const isPdf = doc.mime_type === 'application/pdf';
    const reply = `${isPdf ? '📄' : '📁'} 檔案已儲存！\n檔名: ${doc.file_name || '—'}\nR2 key: ${key}\n大小: ${formatSize(bytes.length)}`;
    await sendMessage(chatId, reply);
    await logMsg(env, chatId, 'bot', reply, msg);
  } catch (e) {
    await sendMessage(chatId, '⚠️ 檔案儲存失敗');
    await logMsg(env, chatId, 'bot', '⚠️ 檔案儲存失敗：' + e.message, msg);
  }
}

// ── Telegram API helpers ──

async function getFile(fileId) {
  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const data = await resp.json();
  return data.result;
}

async function sendMessage(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.error('sendMessage error:', e.message);
  }
}

async function sendChatAction(chatId, action) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action })
    });
  } catch (e) { /* ignore */ }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
