const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'https://fotan.techforliving.net';
const ADMIN = BASE + '/admin';
const OUT = path.join(__dirname);
const ADMIN_PWD = 'admin888';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });

  // ====== MAIN PAGE ======
  console.log('📱 主頁截圖...');
  
  // 1. Main page - unchecked tab
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '01-main-unchecked.png'), fullPage: false });
  console.log('  ✓ 01-main-unchecked.png');

  // 2. Main page - checked tab
  await page.evaluate(() => document.getElementById('bar-checked')?.click());
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, '02-main-checked.png'), fullPage: false });
  console.log('  ✓ 02-main-checked.png');

  // 3. Main page - click a person to see payment modal
  await page.evaluate(() => document.getElementById('bar-unchecked')?.click());
  await sleep(1000);
  const rows = await page.$$('.row');
  if (rows.length > 0) {
    await rows[0].click();
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, '03-payment-modal.png'), fullPage: false });
    // Close modal
    await page.evaluate(() => { const ov = document.querySelector('.overlay'); if (ov) ov.remove(); });
    await sleep(500);
  }
  console.log('  ✓ 03-payment-modal.png');

  // 4. Person detail card (in checked tab)
  await page.evaluate(() => document.getElementById('bar-checked')?.click());
  await sleep(1000);
  const doneRows = await page.$$('.row');
  if (doneRows.length > 0) {
    await doneRows[0].click();
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, '04-person-card.png'), fullPage: false });
    await page.evaluate(() => { const ov = document.querySelector('.overlay'); if (ov) ov.remove(); });
    await sleep(500);
  }
  console.log('  ✓ 04-person-card.png');

  // ====== ADMIN PAGES ======
  // Set desktop viewport for admin
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // Login to admin
  console.log('🖥️ 後台截圖...');
  await page.goto(ADMIN, { waitUntil: 'networkidle2' });
  await sleep(1500);
  // Fill login form
  await page.type('#login-pwd', ADMIN_PWD, { delay: 50 });
  await page.click('button[type="submit"]');
  await sleep(2000);

  // 5. Dashboard
  await page.goto(ADMIN, { waitUntil: 'networkidle2' });
  await sleep(2000);
  // Click overview if not already
  try { await page.click('a[data-page="overview"]'); await sleep(1500); } catch(e) {}
  await page.screenshot({ path: path.join(OUT, '05-admin-dashboard.png'), fullPage: false });
  console.log('  ✓ 05-admin-dashboard.png');

  // 6. Checkin operations
  await page.click('a[data-page="checkin"]');
  await sleep(2000);
  // Click start checkin
  try {
    await page.click('button'); // the "開始簽到" button
    await sleep(2000);
  } catch(e) {}
  await page.screenshot({ path: path.join(OUT, '06-admin-checkin.png'), fullPage: false });
  console.log('  ✓ 06-admin-checkin.png');

  // 7. Meeting management
  await page.click('a[data-page="meetings"]');
  await sleep(2000);
  // Expand first meeting
  try {
    await page.click('.expand-tr');
    await sleep(1500);
  } catch(e) {}
  await page.screenshot({ path: path.join(OUT, '07-admin-meetings.png'), fullPage: false });
  console.log('  ✓ 07-admin-meetings.png');

  // 8. Member management
  await page.click('a[data-page="members"]');
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, '08-admin-members.png'), fullPage: false });
  console.log('  ✓ 08-admin-members.png');

  // 9. Guest management
  await page.click('a[data-page="guests"]');
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, '09-admin-guests.png'), fullPage: false });
  console.log('  ✓ 09-admin-guests.png');

  // 10. System settings
  await page.click('a[data-page="settings"]');
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, '10-admin-settings.png'), fullPage: false });
  console.log('  ✓ 10-admin-settings.png');

  // 11. Skill page
  await page.click('a[data-page="skill"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '11-admin-skill.png'), fullPage: false });
  console.log('  ✓ 11-admin-skill.png');

  // 12. User management
  await page.click('a[data-page="users"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '12-admin-users.png'), fullPage: false });
  console.log('  ✓ 12-admin-users.png');

  // 13. WhatsApp certs
  await page.click('a[data-page="wacert"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '13-admin-wacert.png'), fullPage: false });
  console.log('  ✓ 13-admin-wacert.png');

  // 14. Chatbot
  await page.screenshot({ path: path.join(OUT, '14-admin-chatbot.png'), fullPage: false });
  console.log('  ✓ 14-admin-chatbot.png');

  // ====== LOGIN/REGISTER ======
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });

  // 15. Login page
  await page.goto(BASE + '/login.html', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '15-login.png'), fullPage: false });
  console.log('  ✓ 15-login.png');

  // 16. Register page
  await page.goto(BASE + '/register.html', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '16-register.png'), fullPage: false });
  console.log('  ✓ 16-register.png');

  await browser.close();
  console.log('\n✅ 全部截圖完成！');
})();
