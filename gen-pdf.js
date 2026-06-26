const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SHOTS_DIR = path.join(__dirname, 'screenshots');
const DOCS_DIR = path.join(__dirname, 'docs');

// Simple markdown to HTML converter
function md2html(md) {
  let html = md;

  // Images (must come before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const imgPath = path.resolve(DOCS_DIR, src);
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      const ext = path.extname(imgPath).slice(1);
      const b64 = data.toString('base64');
      return `<img src="data:image/${ext};base64,${b64}" alt="${alt}" style="max-width:100%;border-radius:8px;margin:16px 0;box-shadow:0 2px 12px rgba(0,0,0,0.1)">`;
    }
    return `<p><em>[圖片: ${alt}]</em></p>`;
  });

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Tables
  const lines = html.split('\n');
  let result = [];
  let inTable = false;
  let tableRows = [];
  let headerSep = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.match(/^\|[\s\-:|]+\|$/)) {
        headerSep = true;
        continue;
      }
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      // Flush table
      let tbl = '<table><thead><tr>';
      const header = tableRows[0];
      for (const h of header) {
        tbl += `<th>${h}</th>`;
      }
      tbl += '</tr></thead><tbody>';
      for (let j = 1; j < tableRows.length; j++) {
        tbl += '<tr>';
        for (const c of tableRows[j]) {
          tbl += `<td>${c}</td>`;
        }
        tbl += '</tr>';
      }
      tbl += '</tbody></table>';
      result.push(tbl);
      tableRows = [];
      inTable = false;
      headerSep = false;
    }
    result.push(line);
  }

  // Flush remaining table
  if (inTable && tableRows.length > 0) {
    let tbl = '<table><thead><tr>';
    const header = tableRows[0];
    for (const h of header) {
      tbl += `<th>${h}</th>`;
    }
    tbl += '</tr></thead><tbody>';
    for (let j = 1; j < tableRows.length; j++) {
      tbl += '<tr>';
      for (const c of tableRows[j]) {
        tbl += `<td>${c}</td>`;
      }
      tbl += '</tr>';
    }
    tbl += '</tbody></table>';
    result.push(tbl);
  }

  html = result.join('\n');

  // Unordered lists
  html = html.replace(/((?:^- .+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^- /, '');
      return `<li>${content}</li>`;
    }).join('\n');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^\d+\. /, '');
      return `<li>${content}</li>`;
    }).join('\n');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs (double newlines)
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs and fix block elements inside p
  html = html.replace(/<p><(h[1-4]|table|ul|ol|hr|blockquote)/g, '<$1');
  html = html.replace(/<\/(h[1-4]|table|ul|ol|blockquote)><\/p>/g, '</$1>');
  html = html.replace(/<p><\/p>/g, '');

  // Fix blockquote content
  html = html.replace(/<blockquote>/g, '<blockquote><p>');
  html = html.replace(/<\/blockquote>/g, '</p></blockquote>');

  return html;
}

async function run() {
  console.log('📄 讀取 FEATURES.md...');
  const md = fs.readFileSync(path.join(DOCS_DIR, 'FEATURES.md'), 'utf8');
  const body = md2html(md);

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>火炭會聚會簽到系統 — 銷售功能手冊</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+HK:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Noto Sans HK', -apple-system, 'Segoe UI', sans-serif;
    font-size: 14px; line-height: 1.8; color: #1e293b;
    max-width: 800px; margin: 0 auto; padding: 40px 32px;
    background: #fff;
  }
  h1 { font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 8px; color: #0d9488; }
  h2 { font-size: 22px; font-weight: 700; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #0d9488; color: #0f172a; }
  h3 { font-size: 18px; font-weight: 700; margin: 28px 0 12px; color: #0f172a; }
  h4 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; color: #334155; }
  p { margin: 8px 0; }
  ul, ol { margin: 8px 0 8px 24px; }
  li { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { background: #0d9488; color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
  blockquote { border-left: 4px solid #0d9488; background: #f0fdfa; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; font-size: 16px; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  img { display: block; max-width: 100%; height: auto; border-radius: 12px; margin: 20px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.12); page-break-inside: avoid; }
  strong { color: #0f172a; }
  @media print {
    body { padding: 0; max-width: 100%; }
    h2 { page-break-before: always; }
    h2:first-of-type { page-break-before: avoid; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;

  // Write the HTML for debugging
  const htmlPath = path.join(DOCS_DIR, 'FEATURES.html');
  fs.writeFileSync(htmlPath, fullHtml);
  console.log(`  ✅ HTML: ${htmlPath}`);

  // Convert to PDF
  console.log('🖨  轉 PDF...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const pdfPath = path.join(DOCS_DIR, 'fotan-銷售功能手冊.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '16mm', right: '16mm' },
    printBackground: true,
    displayHeaderFooter: false,
  });
  console.log(`  ✅ PDF: ${pdfPath}`);

  await browser.close();
  console.log('\n🎉 完成！');
}

run().catch(e => { console.error(e.message); process.exit(1); });
