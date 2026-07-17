const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'docs');

// Read USER_GUIDE.md and convert to simple HTML
const md = fs.readFileSync(path.join(OUT, 'USER_GUIDE.md'), 'utf8');

// Simple markdown to HTML converter
function md2html(md) {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<p style="text-align:center"><img src="$2" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0"></p><p style="text-align:center;font-size:12px;color:#64748b">$1</p>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0">')
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:13px;overflow-x:auto">$1</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-: ]+$/.test(c.trim()))) return ''; // separator row
      const tag = line.match(/^\|[- :|]+\|$/) ? '' : 'td';
      return '<tr>' + cells.map(c => {
        const trimmed = c.trim();
        return '<td style="border:1px solid #e2e8f0;padding:6px 12px;font-size:13px">' + trimmed + '</td>';
      }).join('') + '</tr>';
    })
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0d9488">$1</a>')
    // List items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Paragraphs (lines not starting with tags)
    .replace(/^(?!<[a-z/]|$)(.+)$/gm, '<p>$1</p>')
    // Line breaks
    .replace(/\n\n/g, '\n');

  // Wrap table rows
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, (match) => {
    if (!match.includes('<table>') && !match.includes('</table>')) {
      return '<table style="border-collapse:collapse;width:100%;margin:12px 0">' + match + '</table>';
    }
    return match;
  });

  // Wrap list items
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
    if (!match.includes('<ul>')) {
      return '<ul style="padding-left:24px;line-height:1.8">' + match + '</ul>';
    }
    return match;
  });

  return html;
}

const htmlContent = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #0f172a;
    line-height: 1.8;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    font-size: 14px;
  }
  h1 { font-size: 28px; border-bottom: 3px solid #0d9488; padding-bottom: 12px; margin-top: 0; }
  h2 { font-size: 20px; color: #0d9488; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  h3 { font-size: 16px; color: #0f172a; margin-top: 24px; }
  hr { margin: 24px 0; border: none; border-top: 1px solid #e2e8f0; }
  p { margin: 8px 0; }
  img { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  pre { background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  td, th { border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 13px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
</style>
</head>
<body>
${md2html(md)}
</body>
</html>`;

const htmlPath = path.join(OUT, 'user-guide.html');
fs.writeFileSync(htmlPath, htmlContent);
console.log('HTML written');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.join(OUT, 'fotan-使用手冊.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });
  await browser.close();
  console.log('PDF generated: fotan-使用手冊.pdf');
})();
