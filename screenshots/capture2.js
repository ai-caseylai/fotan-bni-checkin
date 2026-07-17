const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'https://fotan.techforliving.net';
const ADMIN = BASE + '/admin';
const OUT = path.join(__dirname);
const ADMIN_PWD = 'admin888';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  
  // === Main page modals (mobile) ===
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  
  // Payment modal
  await mobile.goto(BASE, { waitUntil: 'networkidle2' });
  await sleep(2000);
  const rows = await mobile.$$('.row');
  if (rows.length > 0) {
    await rows[0].click();
    await sleep(2000);
    await mobile.screenshot({ path: path.join(OUT, '03-payment-modal.png'), fullPage: false });
    console.log('✓ 03-payment-modal');
  }

  // Person card (in checked tab)
  await mobile.evaluate(() => { const o = document.querySelector('.overlay'); if (o) o.remove(); document.getElementById('bar-checked')?.click(); });
  await sleep(1500);
  const done = await mobile.$$('.row');
  if (done.length > 0) {
    await done[0].click();
    await sleep(1500);
    await mobile.screenshot({ path: path.join(OUT, '04-person-card.png'), fullPage: false });
    console.log('✓ 04-person-card');
  }
  await mobile.close();

  // === Admin login ===
  const desk = await browser.newPage();
  await desk.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await desk.goto(ADMIN, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await desk.type('#login-pwd', ADMIN_PWD, { delay: 50 });
  await desk.click('button[type="submit"]');
  await sleep(2000);

  // Wacert page
  try { await desk.click('a[data-page="wacert"]'); await sleep(2000); } catch(e) {}
  await desk.screenshot({ path: path.join(OUT, '13-admin-wacert.png'), fullPage: false });
  console.log('✓ 13-admin-wacert');

  // Chatbot visible
  await desk.click('a[data-page="overview"]');
  await sleep(2000);
  await desk.screenshot({ path: path.join(OUT, '14-admin-chatbot.png'), fullPage: false });
  console.log('✓ 14-admin-chatbot');
  await desk.close();

  // === Login / Register pages (mobile) ===
  const m2 = await browser.newPage();
  await m2.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  
  await m2.goto(BASE + '/login.html', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await m2.screenshot({ path: path.join(OUT, '15-login.png'), fullPage: false });
  console.log('✓ 15-login');

  await m2.goto(BASE + '/register.html', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await m2.screenshot({ path: path.join(OUT, '16-register.png'), fullPage: false });
  console.log('✓ 16-register');
  await m2.close();

  await browser.close();
  console.log('\n✅ Done!');
})();
