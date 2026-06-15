const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'https://fotan.techforliving.net/docs/';
const DOCS = { user: '使用手冊', admin: '後台管理手冊', api: 'API手冊', developer: '開發文件', requirements: '需求書' };

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  for (const [key, name] of Object.entries(DOCS)) {
    console.log('📄 生成 ' + name + '...');
    await page.goto(BASE + '?doc=' + key, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));
    await page.pdf({
      path: path.join(__dirname, '..', 'docs', 'fotan-' + name + '.pdf'),
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true
    });
    console.log('  ✓ fotan-' + name + '.pdf');
  }

  await browser.close();
  console.log('\n✅ 全部 PDF 已生成！在 docs/ 目錄');
})();
