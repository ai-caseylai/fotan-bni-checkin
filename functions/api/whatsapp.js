import { callQwen } from '../lib/chatbot.js';

/**
 * WhatsApp Cloud API Webhook
 *
 * Webhook URL: https://<domain>/api/whatsapp
 *
 * GET  ?hub.mode=subscribe&hub.challenge=XXX&hub.verify_token=YYY  → Meta verification
 * GET  ?action=setup   → Show setup instructions & subscribe to Meta
 * GET  ?action=info    → Show current configuration status
 * GET  ?action=messages&chat_id=X&limit=100  → Fetch message logs
 * GET  ?action=chats   → List unique chat threads
 * POST                  → Receive WhatsApp webhook events (messages, statuses)
 *
 * Setup:
 * 1. Go to Meta Business Suite > WhatsApp > API Setup
 * 2. Set webhook URL to: https://<domain>/api/whatsapp
 * 3. Set verify token (choose any string, then save in DB settings as whatsapp_verify_token)
 * 4. Save your permanent access token as whatsapp_token in DB settings
 * 5. Save your phone number ID as whatsapp_phone_id in DB settings
 */

let tablesEnsured = false;

export async function onRequest(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // ── Webhook Verification (GET) ──
    // Meta sends: ?hub.mode=subscribe&hub.challenge=XXX&hub.verify_token=YYY
    if (request.method === 'GET' && url.searchParams.has('hub.mode')) {
      return handleVerification(env, url);
    }

    // ── Admin: Setup webhook ──
    if (request.method === 'GET' && action === 'setup') {
      return handleSetup(env, url);
    }

    // ── Admin: Get webhook info ──
    if (request.method === 'GET' && action === 'info') {
      return handleInfo(env);
    }

    // ── Admin: Get message log ──
    if (request.method === 'GET' && action === 'messages') {
      return handleMessages(env, url);
    }

    // ── Admin: Get chat list ──
    if (request.method === 'GET' && action === 'chats') {
      return handleChats(env);
    }

    // ── Main webhook handler (POST) ──
    if (request.method === 'POST') {
      await ensureTables(env);
      return handleWebhook(env, request, context);
    }

    return Response.json({ error: 'Bad request' }, { status: 400 });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}

// ── Auto-create tables if not yet migrated ──
async function ensureTables(env) {
  if (tablesEnsured) return;
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        profile_name TEXT DEFAULT '',
        role TEXT NOT NULL DEFAULT 'user',
        content TEXT DEFAULT '',
        wa_msg_id TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_wa_msg_chat ON whatsapp_messages(chat_id, created_at)').run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS whatsapp_contacts (
        wa_id TEXT PRIMARY KEY,
        profile_name TEXT DEFAULT '',
        first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS whatsapp_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wa_id TEXT NOT NULL,
        filename TEXT DEFAULT '',
        r2_key TEXT DEFAULT '',
        content_type TEXT DEFAULT '',
        file_size INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_wa_files_waid ON whatsapp_files(wa_id, created_at)').run();
    tablesEnsured = true;
  } catch (e) {
    console.error('ensureTables error:', e.message);
  }
}

// ── Webhook Verification ──
async function handleVerification(env, url) {
  const mode = url.searchParams.get('hub.mode');
  const challenge = url.searchParams.get('hub.challenge');
  const token = url.searchParams.get('hub.verify_token');

  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_verify_token'").first();
  const verifyToken = row?.value || 'fotan-whatsapp-bot';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified successfully');
    return new Response(challenge, { status: 200 });
  }

  console.log('WhatsApp webhook verification failed');
  return new Response('Verification failed', { status: 403 });
}

// ── Setup ──
async function handleSetup(env, url) {
  const baseUrl = url.origin;
  const webhookUrl = baseUrl + '/api/whatsapp';

  const phoneRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_phone_id'").first();
  const tokenRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_token'").first();
  const verifyRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_verify_token'").first();

  const phoneId = phoneRow?.value || '';
  const accessToken = tokenRow?.value || '';
  const verifyToken = verifyRow?.value || 'fotan-whatsapp-bot';

  // Save default verify token if not set
  if (!verifyRow) {
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('whatsapp_verify_token', ?) ON CONFLICT(key) DO NOTHING"
    ).bind(verifyToken).run();
  }

  // Optionally subscribe the webhook to the app
  let subscribeResult = null;
  if (phoneId && accessToken) {
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v22.0/${phoneId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );
      subscribeResult = await resp.json();
    } catch (e) {
      subscribeResult = { error: e.message };
    }
  }

  return Response.json({
    ok: true,
    webhook_url: webhookUrl,
    verify_token: verifyToken,
    phone_id: phoneId || '(not set)',
    has_access_token: !!accessToken,
    subscribe_result: subscribeResult,
    instructions: {
      step1: 'Go to Meta Business Suite > WhatsApp > Configuration',
      step2: `Set webhook URL to: ${webhookUrl}`,
      step3: `Set verify token to: ${verifyToken}`,
      step4: 'Subscribe to messages webhook fields',
      step5: `Save settings in DB:\n  whatsapp_phone_id = <your phone number ID>\n  whatsapp_token = <your permanent access token>`
    }
  });
}

// ── Info ──
async function handleInfo(env) {
  const phoneRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_phone_id'").first();
  const tokenRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_token'").first();
  const verifyRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_verify_token'").first();
  const whitelistRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_whitelist'").first();

  const phoneId = phoneRow?.value || '';
  const accessToken = tokenRow?.value || '';

  // Get current subscription info
  let subscriptions = null;
  if (phoneId && accessToken) {
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v22.0/${phoneId}/conversations?limit=1`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      subscriptions = await resp.json();
    } catch (e) { /* ignore */ }
  }

  const countRow = await env.DB.prepare('SELECT COUNT(*) as c FROM whatsapp_messages').first();

  return Response.json({
    configured: !!(phoneId && accessToken),
    phone_id: phoneId || '(not set)',
    has_token: !!accessToken,
    verify_token: verifyRow?.value || 'fotan-whatsapp-bot',
    whitelist: whitelistRow?.value || '(all allowed)',
    total_messages: countRow?.c || 0,
    last_conversation: subscriptions
  });
}

// ── Messages Log ──
async function handleMessages(env, url) {
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const chatId = url.searchParams.get('chat_id') || '';
  let query = 'SELECT * FROM whatsapp_messages';
  let params = [];
  if (chatId) { query += ' WHERE chat_id=?'; params.push(chatId); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  const rows = await env.DB.prepare(query).bind(...params).all();
  return Response.json(rows.results.reverse());
}

// ── Chat List ──
async function handleChats(env) {
  const rows = await env.DB.prepare(
    "SELECT chat_id, profile_name, MAX(created_at) as last_msg, COUNT(*) as msg_count FROM whatsapp_messages GROUP BY chat_id ORDER BY last_msg DESC"
  ).all();
  return Response.json(rows.results);
}

// ── Main Webhook (POST) ──
// Return 200 IMMEDIATELY. Process messages with waitUntil so they run
// after the response is sent. Meta requires < 3s ack or marks delivery failed.
async function handleWebhook(env, request, ctx) {
  const body = await request.json();
  console.log('WhatsApp webhook:', JSON.stringify(body).slice(0, 300));

  const entries = body.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value || {};
      const messages = value.messages || [];
      const contacts = value.contacts || [];

      for (const msg of messages) {
        const contact = contacts.find(c => c.wa_id === msg.from) || { profile: { name: msg.from } };
        // Use waitUntil to keep processing after response is sent
        ctx.waitUntil(handleIncomingMessage(env, msg, contact).catch(e => {
          console.error('handleIncomingMessage error:', e.message);
        }));
      }

      const statuses = value.statuses || [];
      for (const status of statuses) {
        console.log('WhatsApp status:', status.id, status.status);
      }
    }
  }

  return new Response('OK', { status: 200 });
}

// ── Handle Incoming Message ──
async function handleIncomingMessage(env, msg, contact) {
  const from = msg.from; // wa_id (phone number)
  const profileName = contact?.profile?.name || from;
  const msgId = msg.id;
  const timestamp = msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000).toISOString() : new Date().toISOString();

  try {
    // Text message
    if (msg.type === 'text' && msg.text?.body) {
      const text = msg.text.body;
      await logMessage(env, from, profileName, 'user', text, msgId);

      // Run chatbot
      const reply = await processChat(env, from, profileName, text);
      if (reply) {
        await logMessage(env, from, profileName, 'bot', reply, msgId);
      }
      return;
    }

    // Image
    if (msg.type === 'image') {
      await logMessage(env, from, profileName, 'user', '[圖片]', msgId);
      const caption = msg.image?.caption || '';
      await handleImage(env, from, profileName, msg.image, caption);
      return;
    }

    // Document
    if (msg.type === 'document') {
      const docName = msg.document?.filename || 'file';
      await logMessage(env, from, profileName, 'user', '[檔案] ' + docName, msgId);
      const caption = msg.document?.caption || '';
      await handleDocument(env, from, profileName, msg.document, caption);
      return;
    }

    // Audio (voice message)
    if (msg.type === 'audio') {
      await logMessage(env, from, profileName, 'user', '[語音]', msgId);
      await sendWhatsAppMessage(env, from, '🎤 收到語音訊息，但我暫時未識聽廣東話語音～請打字同我講啦！😊');
      return;
    }

    // Location
    if (msg.type === 'location') {
      await logMessage(env, from, profileName, 'user', '[位置]', msgId);
      return;
    }

    // Unknown type
    await logMessage(env, from, profileName, 'user', '[' + msg.type + ']', msgId);
  } catch (e) {
    console.error('handleIncomingMessage error:', e.message);
    await logMessage(env, from, profileName, 'bot', '⚠️ 錯誤：' + e.message, msgId);
  }
}

// ── Load conversation history (last 1 hour, max 20 messages) ──
async function loadRecentHistory(env, waId) {
  try {
    const rows = await env.DB.prepare(
      `SELECT role, content FROM whatsapp_messages
       WHERE chat_id = ?
         AND created_at > datetime('now', '-1 hour')
       ORDER BY created_at ASC
       LIMIT 20`
    ).bind(waId).all();

    // Deduplicate: only keep the latest consecutive user-bot pairs
    // to avoid confusing the model with stale/incomplete tool call sequences
    const messages = [];
    for (const row of rows.results) {
      const role = row.role === 'bot' ? 'assistant' : 'user';
      // Avoid duplicate consecutive user messages (take latest)
      if (messages.length > 0 && messages[messages.length - 1].role === role && role === 'user') {
        messages[messages.length - 1] = { role, content: row.content };
      } else if (row.content && !row.content.startsWith('[') && row.content.length > 2) {
        messages.push({ role, content: row.content });
      }
    }
    return messages;
  } catch (e) {
    console.error('loadRecentHistory error:', e.message);
    return [];
  }
}

// ── Chat Processing ──
async function processChat(env, from, profileName, text) {
  const apiKey = env.QWEN_API_KEY || '';
  if (!apiKey) {
    await sendWhatsAppMessage(env, from, '⚠️ AI 服務尚未設定。');
    return '⚠️ AI 服務尚未設定。';
  }

  // Save user identity for personalization
  await env.DB.prepare(
    "INSERT INTO whatsapp_contacts (wa_id, profile_name, last_seen) VALUES (?, ?, datetime('now')) ON CONFLICT(wa_id) DO UPDATE SET profile_name = ?, last_seen = datetime('now')"
  ).bind(from, profileName, profileName).run();

  // Load last 1 hour of conversation history for context
  const history = await loadRecentHistory(env, from);

  // Build conversation: system prompt is handled by callQwen, just pass history + current
  const messages = [...history, { role: 'user', content: text }];

  const result = await callQwen(env, messages, apiKey);
  let reply = result.reply || '抱歉，我無法處理這個請求。';

  // Remove markdown formatting for WhatsApp
  reply = reply.replace(/\*\*/g, '*').replace(/```[\s\S]*?```/g, '…').replace(/`/g, '');

  // Split long messages
  if (reply.length <= 3800) {
    await sendWhatsAppMessage(env, from, reply);
  } else {
    const chunks = [];
    for (let i = 0; i < reply.length; i += 3800) {
      chunks.push(reply.slice(i, i + 3800));
    }
    for (const chunk of chunks) {
      await sendWhatsAppMessage(env, from, chunk);
    }
  }

  return reply;
}

// ── Image Handler ──
async function handleImage(env, from, profileName, image, caption) {
  try {
    const tokenRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_token'").first();
    const accessToken = tokenRow?.value;
    if (!accessToken || !image?.id) {
      await sendWhatsAppMessage(env, from, '⚠️ 圖片下載失敗（缺少設定）');
      return;
    }

    // Download image from WhatsApp
    const mediaUrl = `https://graph.facebook.com/v22.0/${image.id}`;
    const mediaResp = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const mediaData = await mediaResp.json();
    const downloadUrl = mediaData?.url;

    if (!downloadUrl) {
      await sendWhatsAppMessage(env, from, '⚠️ 圖片下載連結獲取失敗');
      return;
    }

    const imgResp = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const bytes = new Uint8Array(await imgResp.arrayBuffer());
    const ts = Date.now();
    const key = `whatsapp-img-${from.replace(/[^0-9]/g, '')}-${ts}.jpg`;

    await env.R2.put(key, bytes, {
      httpMetadata: { contentType: image.mime_type || 'image/jpeg', cacheControl: 'public, max-age=86400' }
    });

    await env.DB.prepare(
      'INSERT INTO whatsapp_files (wa_id, filename, r2_key, content_type, file_size) VALUES (?,?,?,?,?)'
    ).bind(from, `whatsapp_img_${ts}.jpg`, key, image.mime_type || 'image/jpeg', bytes.length).run();

    let reply = `📸 圖片已儲存！\nR2: ${key}\n大小: ${formatSize(bytes.length)}`;

    // AI analysis of image
    const apiKey = env.QWEN_API_KEY || '';
    if (apiKey) {
      try {
        const base64 = btoa(String.fromCharCode(...bytes));
        const dataUri = `data:image/jpeg;base64,${base64}`;

        const userMsg = caption
          ? { role: 'user', content: [{ type: 'image_url', image_url: { url: dataUri } }, { type: 'text', text: caption }] }
          : { role: 'user', content: [{ type: 'image_url', image_url: { url: dataUri } }, { type: 'text', text: '請分析這張圖片，如果是付款憑證(PayMe/FPS/銀行轉帳)，提取付款人姓名、金額、電話等資訊。' }] };

        const result = await callQwen(env, [userMsg], apiKey);
        if (result.reply) {
          reply += '\n🔍 ' + result.reply;
          await sendWhatsAppMessage(env, from, result.reply);
        }
      } catch (e) { /* ignore AI failure */ }
    }

    await sendWhatsAppMessage(env, from, reply);
    return;
  } catch (e) {
    await sendWhatsAppMessage(env, from, '⚠️ 圖片處理失敗：' + e.message);
  }
}

// ── Document Handler ──
async function handleDocument(env, from, profileName, document, caption) {
  try {
    const tokenRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_token'").first();
    const accessToken = tokenRow?.value;
    if (!accessToken || !document?.id) {
      await sendWhatsAppMessage(env, from, '⚠️ 檔案下載失敗（缺少設定）');
      return;
    }

    const mediaUrl = `https://graph.facebook.com/v22.0/${document.id}`;
    const mediaResp = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const mediaData = await mediaResp.json();
    const downloadUrl = mediaData?.url;

    if (!downloadUrl) {
      await sendWhatsAppMessage(env, from, '⚠️ 檔案下載連結獲取失敗');
      return;
    }

    const docResp = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const bytes = new Uint8Array(await docResp.arrayBuffer());
    const ts = Date.now();
    const ext = (document.filename || 'file').split('.').pop() || 'bin';
    const key = `whatsapp-file-${from.replace(/[^0-9]/g, '')}-${ts}.${ext}`;

    await env.R2.put(key, bytes, {
      httpMetadata: { contentType: document.mime_type || 'application/octet-stream', cacheControl: 'public, max-age=86400' }
    });

    await env.DB.prepare(
      'INSERT INTO whatsapp_files (wa_id, filename, r2_key, content_type, file_size) VALUES (?,?,?,?,?)'
    ).bind(from, document.filename || `file_${ts}`, key, document.mime_type || '', bytes.length).run();

    const isPdf = document.mime_type === 'application/pdf';
    const reply = `${isPdf ? '📄' : '📁'} 檔案已儲存！\n檔名: ${document.filename || '—'}\nR2: ${key}\n大小: ${formatSize(bytes.length)}`;
    await sendWhatsAppMessage(env, from, reply);

    if (caption) {
      const apiKey = env.QWEN_API_KEY || '';
      if (apiKey) {
        try {
          const result = await callQwen(env, [{ role: 'user', content: caption }], apiKey);
          if (result.reply) {
            await sendWhatsAppMessage(env, from, result.reply);
          }
        } catch (e) { /* ignore */ }
      }
    }
    return;
  } catch (e) {
    await sendWhatsAppMessage(env, from, '⚠️ 檔案處理失敗：' + e.message);
  }
}

// ── Send WhatsApp Message ──
async function sendWhatsAppMessage(env, to, text) {
  try {
    const phoneRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_phone_id'").first();
    const tokenRow = await env.DB.prepare("SELECT value FROM settings WHERE key='whatsapp_token'").first();
    const phoneId = phoneRow?.value;
    const accessToken = tokenRow?.value;

    if (!phoneId || !accessToken) {
      console.log('WhatsApp send skipped: missing phone_id or token');
      return false;
    }

    const resp = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text }
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('WhatsApp send error:', JSON.stringify(data));
    }
    return resp.ok;
  } catch (e) {
    console.error('sendWhatsAppMessage error:', e.message);
    return false;
  }
}

// ── Database Logging ──
async function logMessage(env, waId, profileName, role, content, msgId) {
  await env.DB.prepare(
    'INSERT INTO whatsapp_messages (chat_id, profile_name, role, content, wa_msg_id) VALUES (?,?,?,?,?)'
  ).bind(waId, profileName, role, content || '', msgId || '').run();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
