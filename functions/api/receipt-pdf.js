import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { loadChineseFont } from '../lib/font-loader.js';

const PAGE_W = 595.28, PAGE_H = 841.89, MARGIN = 42.5;
const USABLE_W = PAGE_W - MARGIN * 2;
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.38, 0.38, 0.38);
const LIGHT_GRAY = rgb(0.55, 0.55, 0.55);
const LINE_COLOR = rgb(0.78, 0.78, 0.78);
const HEADER_COLOR = rgb(0.07, 0.12, 0.19);
const GREEN = rgb(0.09, 0.62, 0.29);

function pt(mm) { return mm * 2.8346457; }

// CJK-aware text width
function tw(text, font, size) {
  let w = 0;
  for (const ch of String(text)) {
    w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? size : size * 0.55;
  }
  return w;
}

// Draw text helper
function T(page, text, x, y, font, size, opts = {}) {
  if (!text) return;
  const { anchor = 'left', color = BLACK } = opts;
  const w = tw(text, font, size);
  let dx = x;
  if (anchor === 'center') dx = x - w / 2;
  else if (anchor === 'right') dx = x - w;
  page.drawText(String(text), { x: dx, y, font, size, color });
}

function H(page, x1, x2, y, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color: LINE_COLOR });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const certId = url.searchParams.get('cert_id');

  if (!certId) return new Response('Missing cert_id', { status: 400 });

  try {
    // Fetch cert and person data
    const cert = await env.DB.prepare('SELECT * FROM whatsapp_cert WHERE id=?').bind(certId).first();
    if (!cert) return new Response('Cert not found', { status: 404 });

    let person = null;
    if (cert.person_type && cert.person_id) {
      const table = cert.person_type === 'member' ? 'members' : 'guests';
      person = await env.DB.prepare(`SELECT name, tel FROM ${table} WHERE id=?`).bind(cert.person_id).first();
    }

    const personName = cert.person_name || (person ? person.name : '未關聯');
    const personTel = person ? person.tel : '';
    const dateStr = cert.created_at
      ? new Date(cert.created_at.replace(' ', 'T') + 'Z').toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })
      : '—';
    const certIdStr = String(cert.id).padStart(6, '0');

    // ── Build PDF ──
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    let font, helvetica, helveticaBold;
    try {
      const fontData = await loadChineseFont();
      font = await doc.embedFont(fontData);
    } catch (e) { /* fallback to Helvetica */ }
    helvetica = await doc.embedFont(StandardFonts.Helvetica);
    helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    if (!font) font = helvetica;

    // Embed the payment proof image
    let proofImage = null;
    if (cert.r2_key) {
      try {
        const obj = await env.R2.get(cert.r2_key);
        if (obj) {
          const buf = new Uint8Array(await obj.arrayBuffer());
          const isJpg = cert.r2_key.toLowerCase().endsWith('.jpg') || cert.r2_key.toLowerCase().endsWith('.jpeg');
          proofImage = isJpg ? await doc.embedJpg(buf) : await doc.embedPng(buf);
        }
      } catch (e) { /* ignore */ }
    }

    const page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    // ── HEADER: Org name ──
    T(page, '火炭會', MARGIN, y, font, 11, { color: GRAY });
    y -= pt(5);

    // ── TITLE ──
    const title = '付款收據';
    const titleW = tw(title, font, 22);
    T(page, title, PAGE_W / 2, y, font, 22, { anchor: 'center', color: HEADER_COLOR });
    y -= pt(8);

    // ── Receipt number & date ──
    T(page, `收據編號: #${certIdStr}`, PAGE_W / 2, y, font, 9, { anchor: 'center', color: LIGHT_GRAY });
    y -= pt(3.5);
    T(page, `發出日期: ${dateStr}`, PAGE_W / 2, y, font, 9, { anchor: 'center', color: LIGHT_GRAY });
    y -= pt(8);

    H(page, MARGIN, PAGE_W - MARGIN, y);
    y -= pt(10);

    // ── INFO GRID (2 columns, 2 rows) ──
    const col1X = MARGIN;
    const col2X = MARGIN + USABLE_W / 2 + pt(10);
    const labelSize = 8;
    const valueSize = 12;
    const rowH = pt(13);

    function infoBlock(label, value, cx, cy, extra = '') {
      T(page, label, cx, cy, font, labelSize, { color: GRAY });
      T(page, value, cx, cy - pt(4.5), font, valueSize);
      if (extra) T(page, extra, cx, cy - pt(8.5), font, 8, { color: GRAY });
    }

    infoBlock('付款人', personName, col1X, y, personTel);
    infoBlock('WhatsApp 號碼', cert.from_number || '—', col2X, y);
    y -= rowH;

    infoBlock('上傳日期', dateStr, col1X, y);
    infoBlock('狀態', '已確認', col2X, y);
    y -= rowH + pt(4);

    // ── NOTES ──
    if (cert.note || cert.comment) {
      y -= pt(4);
      if (cert.note) {
        T(page, '備註', MARGIN, y, font, labelSize, { color: GRAY });
        y -= pt(4.5);
        T(page, cert.note, MARGIN, y, font, 9);
        y -= pt(12);
      }
      if (cert.comment) {
        T(page, '相片備註', MARGIN, y, font, labelSize, { color: GRAY });
        y -= pt(4.5);
        T(page, cert.comment, MARGIN, y, font, 9);
        y -= pt(12);
      }
    }

    // ── DIVIDER ──
    y -= pt(6);
    H(page, MARGIN, PAGE_W - MARGIN, y);
    y -= pt(10);

    // ── PAYMENT PROOF IMAGE ──
    T(page, '付款憑證', MARGIN, y, font, labelSize, { color: GRAY });
    y -= pt(6);

    if (proofImage) {
      const d = proofImage.scale(1);
      const maxW = USABLE_W - pt(4);
      const maxH = pt(160);
      const s = Math.min(maxW / d.width, maxH / d.height, 1);
      const imgW = d.width * s;
      const imgH = d.height * s;
      page.drawRectangle({
        x: MARGIN, y: y - imgH,
        width: imgW, height: imgH,
        borderColor: LINE_COLOR, borderWidth: 0.5,
      });
      page.drawImage(proofImage, { x: MARGIN, y: y - imgH, width: imgW, height: imgH });
      y -= imgH + pt(8);
    } else {
      T(page, '(暫無憑證圖片)', MARGIN, y, font, 9, { color: LIGHT_GRAY });
      y -= pt(12);
    }

    // ── FOOTER ──
    y = MARGIN + pt(20);
    H(page, MARGIN, PAGE_W - MARGIN, y);
    y -= pt(8);
    T(page, '此收據由 火炭會 系統自動生成', PAGE_W / 2, y, font, 7, { anchor: 'center', color: LIGHT_GRAY });
    T(page, `生成日期: ${new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}`, PAGE_W / 2, y - pt(3.5), font, 7, { anchor: 'center', color: LIGHT_GRAY });

    const pdfBytes = await doc.save();

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${certIdStr}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}
