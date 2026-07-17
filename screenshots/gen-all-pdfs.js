const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DOCS = path.join(__dirname, '..', 'docs');

function md2html(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<p style="text-align:center"><img src="$2" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;margin:12px 0"></p><p style="text-align:center;font-size:11px;color:#64748b">$1</p>')
    .replace(/^---$/gm, '<hr>')
    .replace(/```([^`]+)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\|(.+)\|/g, (line) => {
      const cells = line.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-: ]+$/.test(c.trim()))) return '';
      return '<tr>' + cells.map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
    })
    .replace(/(<tr>[\s\S]*?<\/tr>)/g, (m) => m.includes('<table>') ? m : '<table>' + m + '</table>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, (m) => m.includes('<ul>') ? m : '<ul>' + m + '</ul>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^(?!<[a-z/]|$)(.+)$/gm, '<p>$1</p>');
}

const template = (title, body) => `<!DOCTYPE html><html lang="zh-HK"><head><meta charset="UTF-8">
<style>
  body{font-family:-apple-system,sans-serif;color:#0f172a;line-height:1.8;max-width:800px;margin:0 auto;padding:40px;font-size:13px}
  h1{font-size:26px;border-bottom:3px solid #0d9488;padding-bottom:12px}
  h2{font-size:18px;color:#0d9488;margin-top:28px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  h3{font-size:15px;margin-top:20px}
  hr{margin:20px 0;border:none;border-top:1px solid #e2e8f0}
  p{margin:6px 0}
  img{max-width:100%;border-radius:8px;border:1px solid #e2e8f0}
  code{background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:12px}
  pre{background:#f1f5f9;padding:10px;border-radius:8px;font-size:12px;overflow-x:auto}
  table{border-collapse:collapse;width:100%;margin:10px 0}
  td,th{border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;text-align:left}
  th{background:#f8fafc;font-weight:600}
  ul{padding-left:20px;line-height:1.8}
</style></head><body><h1>${title}</h1>${body}</body></html>`;

async function genPDF(filename, title, mdFile) {
  const md = fs.readFileSync(path.join(DOCS, mdFile), 'utf8');
  const html = template(title, md2html(md));
  const htmlPath = path.join(DOCS, filename.replace('.pdf', '.html'));
  fs.writeFileSync(htmlPath, html);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.join(DOCS, filename),
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' }
  });
  await browser.close();
  console.log('✓ ' + filename);
}

(async () => {
  await genPDF('fotan-使用手冊.pdf', '火炭會聚會簽到系統 — 使用手冊', 'USER_GUIDE.md');
  await genPDF('fotan-開發手冊.pdf', '火炭會聚會簽到系統 — 開發手冊', 'DEVELOPER.md');
  await genPDF('fotan-後台管理手冊.pdf', '火炭會聚會簽到系統 — 後台管理手冊', 'ADMIN_GUIDE.md');
  console.log('\n✅ 全部 PDF 完成！');
})();
