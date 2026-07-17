const puppeteer = require('puppeteer');
const path = require('path');

const ADMIN = 'https://fotan.techforliving.net/admin';
const ADMIN_PWD = 'admin888';
const OUT = path.join(__dirname);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // ===== LOGIN =====
  console.log('🔐 登入後台...');
  await page.goto(ADMIN, { waitUntil: 'networkidle2' });
  await sleep(3000);

  // Wait for login overlay to be visible
  await page.waitForSelector('#login-pwd', { visible: true, timeout: 10000 });
  console.log('  login form visible');

  // Ensure overlay is shown
  await page.evaluate(() => {
    document.getElementById('login-overlay').style.display = 'flex';
  });
  await sleep(500);

  // Type password (leave username empty for admin login)
  await page.click('#login-pwd');
  await page.type('#login-pwd', ADMIN_PWD, { delay: 80 });
  console.log('  password typed');

  // Click submit
  await page.click('button[type="submit"]');
  console.log('  submit clicked');
  await sleep(3000);

  // Check if login succeeded (overlay should be hidden)
  const loggedIn = await page.evaluate(() => {
    const ov = document.getElementById('login-overlay');
    return !ov || ov.style.display === 'none';
  });
  console.log('  logged in:', loggedIn);

  if (!loggedIn) {
    // Try direct doLogin call
    console.log('  retrying with direct doLogin...');
    await page.evaluate((pwd) => {
      document.getElementById('login-pwd').value = pwd;
      if (typeof doLogin === 'function') doLogin();
    }, ADMIN_PWD);
    await sleep(3000);
  }

  // ===== SCREENSHOTS =====
  console.log('📸 截圖開始...');

  // 5. Dashboard
  await page.click('a[data-page="overview"]');
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, '05-admin-dashboard.png'), fullPage: false });
  console.log('  ✓ 05-admin-dashboard');

  // 6. Checkin
  await page.click('a[data-page="checkin"]');
  await sleep(2500);
  // Click start checkin
  try {
    const btns = await page.$$('button');
    for (const btn of btns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('開始簽到')) { await btn.click(); await sleep(2000); break; }
    }
  } catch(e) {}
  await page.screenshot({ path: path.join(OUT, '06-admin-checkin.png'), fullPage: false });
  console.log('  ✓ 06-admin-checkin');

  // 7. Meetings
  await page.click('a[data-page="meetings"]');
  await sleep(2000);
  try {
    await page.click('.expand-tr');
    await sleep(1500);
  } catch(e) {}
  await page.screenshot({ path: path.join(OUT, '07-admin-meetings.png'), fullPage: false });
  console.log('  ✓ 07-admin-meetings');

  // 8. Members
  await page.click('a[data-page="members"]');
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, '08-admin-members.png'), fullPage: false });
  console.log('  ✓ 08-admin-members');

  // 9. Guests
  await page.click('a[data-page="guests"]');
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, '09-admin-guests.png'), fullPage: false });
  console.log('  ✓ 09-admin-guests');

  // 10. Settings
  await page.click('a[data-page="settings"]');
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT, '10-admin-settings.png'), fullPage: false });
  console.log('  ✓ 10-admin-settings');

  // 11. Skill
  await page.click('a[data-page="skill"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '11-admin-skill.png'), fullPage: false });
  console.log('  ✓ 11-admin-skill');

  // 12. Users
  await page.click('a[data-page="users"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '12-admin-users.png'), fullPage: false });
  console.log('  ✓ 12-admin-users');

  // 13. WhatsApp certs
  await page.click('a[data-page="wacert"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '13-admin-wacert.png'), fullPage: false });
  console.log('  ✓ 13-admin-wacert');

  // 14. Chatbot
  await page.click('a[data-page="overview"]');
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '14-admin-chatbot.png'), fullPage: false });
  console.log('  ✓ 14-admin-chatbot');

  // 14b. Seating
  await page.click('a[data-page="seating"]');
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '14b-admin-seating.png'), fullPage: false });
  console.log('  ✓ 14b-admin-seating');

  await browser.close();
  console.log('\n✅ 完成！');
})();
