const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'https://fotan.techforliving.net';
const ADMIN = `${BASE}/admin`;
const OUT = __dirname;
const PWD = 'admin888';

function shot(name) { return path.join(OUT, name); }

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

  // ─── MAIN PAGE ────────────────────────────────
  console.log('📸 主頁...');
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.row', { timeout: 10000 });
  await page.screenshot({ path: shot('main-page.png'), fullPage: false });
  console.log('  ✓ main-page.png');

  // Unchecked tab (default)
  console.log('📸 未簽到 tab...');
  await page.screenshot({ path: shot('unchecked-tab.png'), fullPage: false });
  console.log('  ✓ unchecked-tab.png');

  // Payment page — click first unpaid person
  console.log('📸 付款頁面...');
  const unpaidRow = await page.$('.row');
  if (unpaidRow) {
    await unpaidRow.click();
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: shot('payment-page.png'), fullPage: false });
    console.log('  ✓ payment-page.png');
    // Close overlay if present
    const closeBtn = await page.$('.btn-yes');
    if (closeBtn) { await closeBtn.click(); await new Promise(r => setTimeout(r, 500)); }
  }

  // Switch to checked tab
  console.log('📸 已簽到 tab...');
  const tabs = await page.$$('.tab');
  if (tabs.length > 1) { await tabs[1].click(); await new Promise(r => setTimeout(r, 800)); }
  await page.screenshot({ path: shot('checked-tab.png'), fullPage: false });
  console.log('  ✓ checked-tab.png');

  // Person card from checked tab
  console.log('📸 個人資料卡...');
  const doneRow = await page.$('.row');
  if (doneRow) {
    await doneRow.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: shot('person-card.png'), fullPage: false });
    console.log('  ✓ person-card.png');
    // Close
    const ov = await page.$('.overlay');
    if (ov) { await ov.click(); await new Promise(r => setTimeout(r, 400)); }
  }

  // ─── ADMIN PAGES ────────────────────────────────
  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // Login
  console.log('📸 後台登入...');
  await adminPage.goto(ADMIN, { waitUntil: 'networkidle2' });
  await adminPage.waitForSelector('#login-pwd', { timeout: 10000 });
  await adminPage.screenshot({ path: shot('admin-login.png'), fullPage: false });
  console.log('  ✓ admin-login.png');

  // Do login
  await adminPage.type('#login-pwd', PWD);
  await adminPage.keyboard.press('Enter');
  await adminPage.waitForSelector('#page-content', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  // Overview
  console.log('📸 總覽...');
  await adminPage.screenshot({ path: shot('admin-overview.png'), fullPage: false });
  console.log('  ✓ admin-overview.png');

  // Checkin operations
  console.log('📸 簽到操作...');
  await adminPage.evaluate(() => { const el = document.querySelector('[data-page="checkin"]'); if (el) el.click(); });
  await new Promise(r => setTimeout(r, 1500));
  await adminPage.screenshot({ path: shot('admin-checkin.png'), fullPage: false });
  console.log('  ✓ admin-checkin.png');

  // Meetings page with expanded row
  console.log('📸 會議管理...');
  await adminPage.evaluate(() => { const el = document.querySelector('[data-page="meetings"]'); if (el) el.click(); });
  await new Promise(r => setTimeout(r, 1500));
  // Click first expand toggle
  const expandBtn = await adminPage.$('.toggle-icon');
  if (expandBtn) { await expandBtn.click(); await new Promise(r => setTimeout(r, 800)); }
  await adminPage.screenshot({ path: shot('admin-meetings.png'), fullPage: false });
  console.log('  ✓ admin-meetings.png');

  // Payment modal — click first att-mini
  console.log('📸 付款模態頁...');
  const attMini = await adminPage.$('.att-mini');
  if (attMini) { await attMini.click(); await new Promise(r => setTimeout(r, 1000)); }
  await adminPage.screenshot({ path: shot('admin-payment-modal.png'), fullPage: false });
  console.log('  ✓ admin-payment-modal.png');
  // Close modal
  await adminPage.evaluate(() => { const ov = document.getElementById('modal-overlay'); if (ov) ov.style.display = 'none'; });
  await new Promise(r => setTimeout(r, 300));

  // Members
  console.log('📸 會員管理...');
  await adminPage.evaluate(() => { const el = document.querySelector('[data-page="members"]'); if (el) el.click(); });
  await new Promise(r => setTimeout(r, 1500));
  await adminPage.screenshot({ path: shot('admin-members.png'), fullPage: false });
  console.log('  ✓ admin-members.png');

  // Guests (table view)
  console.log('📸 來賓管理...');
  await adminPage.evaluate(() => { const el = document.querySelector('[data-page="guests"]'); if (el) el.click(); });
  await new Promise(r => setTimeout(r, 2000));
  await adminPage.screenshot({ path: shot('admin-guests.png'), fullPage: false });
  console.log('  ✓ admin-guests.png');

  // Settings
  console.log('📸 系統設定...');
  await adminPage.evaluate(() => { const el = document.querySelector('[data-page="settings"]'); if (el) el.click(); });
  await new Promise(r => setTimeout(r, 1500));
  await adminPage.screenshot({ path: shot('admin-settings.png'), fullPage: false });
  console.log('  ✓ admin-settings.png');

  // Skill page
  console.log('📸 Skill 頁面...');
  await adminPage.evaluate(() => { const el = document.querySelector('[data-page="skill"]'); if (el) el.click(); });
  await new Promise(r => setTimeout(r, 1500));
  await adminPage.screenshot({ path: shot('admin-skill.png'), fullPage: false });
  console.log('  ✓ admin-skill.png');

  // Chatbot panel
  console.log('📸 Chatbot...');
  const chatInput = await adminPage.$('#chat-input');
  if (chatInput) {
    await chatInput.type('你好');
    await adminPage.click('#chat-send');
    await new Promise(r => setTimeout(r, 3000));
  }
  await adminPage.screenshot({ path: shot('admin-chatbot.png'), fullPage: false });
  console.log('  ✓ admin-chatbot.png');

  await browser.close();
  console.log('\n✅ 全部截圖完成！檔案在 screenshots/ 目錄');
})();
