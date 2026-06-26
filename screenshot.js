const puppeteer = require('puppeteer');
const path = require('path');

const SHOTS = path.join(__dirname, 'screenshots');
const BASE = 'https://fotan.techforliving.net';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function shot(page, name) {
  return page.screenshot({ path: path.join(SHOTS, name), fullPage: false })
    .then(() => console.log(`  ✅ ${name}`));
}

async function run() {
  console.log('🚀 啟動...\n');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 180000,
  });

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true });
  const desktop = await browser.newPage();
  await desktop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  try {
    // ═══════════════════════
    // 📱 MOBILE CHECK-IN
    // ═══════════════════════
    console.log('📱 來賓簽到頁面...');

    await mobile.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(8000);

    // 1. Unchecked tab
    await shot(mobile, '01-簽到首頁-未簽到.png');

    // 2. Click unpaid row via evaluate
    try {
      const clicked = await mobile.evaluate(() => {
        const rows = document.querySelectorAll('.row');
        for (const r of rows) {
          const s = r.querySelector('span');
          if (s && s.textContent.includes('未付款')) { r.click(); return true; }
        }
        if (rows.length > 0) { rows[0].click(); return true; }
        return false;
      });
      if (clicked) {
        await sleep(2000);
        await shot(mobile, '02-人員詳情-付款.png');
      }
    } catch (e) { console.log(`  ⚠️  點擊: ${e.message}`); }

    // 3. Checked tab
    try {
      await mobile.evaluate(() => {
        const btn = document.getElementById('bar-checked');
        if (btn) btn.click();
      });
      await sleep(2000);
      await shot(mobile, '03-已簽到名單.png');
    } catch (e) { console.log(`  ⚠️  checked: ${e.message}`); }

    // 4-6. Other tabs
    for (const [txt, file] of [['流程','04-節目流程.png'],['遊戲','05-遊戲資訊.png'],['委員','06-委員介紹.png']]) {
      try {
        await mobile.evaluate(t => {
          const btns = document.querySelectorAll('button.tab-item');
          for (const b of btns) { if (b.textContent.includes(t)) { b.click(); return; } }
        }, txt);
        await sleep(1500);
        await shot(mobile, file);
      } catch (e) { console.log(`  ⚠️  ${txt}: ${e.message}`); }
    }

    // ═══════════════════════
    // 🖥  ADMIN
    // ═══════════════════════
    console.log('\n🖥  管理後台...');

    await desktop.goto(BASE + '/admin', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(5000);

    const needsLogin = await desktop.evaluate(() => !!document.querySelector('input[type="password"]'));
    if (needsLogin) {
      await desktop.type('input[type="password"]', 'admin888');
      await desktop.evaluate(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      });
      await sleep(5000);
      console.log('  已登入');
    }

    const pages = [
      ['overview', '07-後台總覽.png'],
      ['checkin', '08-簽到操作.png'],
      ['meetings', '09-會議管理.png'],
      ['members', '10-會員管理.png'],
      ['guests', '11-來賓管理.png'],
      ['seating', '12-餐桌排位.png'],
      ['settings', '13-系統設定.png'],
    ];

    for (const [dataPage, file] of pages) {
      try {
        await desktop.evaluate(dp => {
          const el = document.querySelector(`[data-page="${dp}"]`);
          if (el) el.click();
        }, dataPage);
        await sleep(3500);
        await shot(desktop, file);
      } catch (e) { console.log(`  ⚠️  ${dataPage}: ${e.message}`); }
    }

    console.log('\n🎉 完成！');
  } catch (err) {
    console.error('❌', err.message);
  } finally {
    await browser.close();
  }
}
run();
