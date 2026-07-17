const puppeteer = require('puppeteer');
const path = require('path');
const BASE = 'https://fotan.techforliving.net';
const OUT = path.join(__dirname);
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  
  // Payment modal - click first unchecked person
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await sleep(3000);
  
  // Click "未簽到" tab first
  await page.evaluate(() => {
    const btn = document.getElementById('bar-unchecked');
    if (btn) btn.click();
  });
  await sleep(1500);
  
  // Click first row
  const clicked = await page.evaluate(() => {
    const row = document.querySelector('.row[data-type]');
    if (row) { row.click(); return true; }
    return false;
  });
  console.log('Clicked:', clicked);
  await sleep(2500);
  
  // Check for overlay/modal
  const hasOverlay = await page.evaluate(() => !!document.querySelector('.overlay, .dbox'));
  console.log('Has overlay:', hasOverlay);
  
  await page.screenshot({ path: path.join(OUT, '03-payment-modal.png'), fullPage: false });
  console.log('✓ 03-payment-modal');
  
  // Close overlay
  await page.evaluate(() => {
    const ov = document.querySelector('.overlay');
    if (ov) ov.remove();
    const dim = document.querySelector('.dimmed');
    if (dim) dim.classList.remove('dimmed');
  });
  await sleep(500);
  
  // Switch to checked tab
  await page.evaluate(() => {
    const btn = document.getElementById('bar-checked');
    if (btn) btn.click();
  });
  await sleep(1500);
  
  // Click first checked person
  await page.evaluate(() => {
    const row = document.querySelector('.row[data-type]');
    if (row) row.click();
  });
  await sleep(2000);
  
  await page.screenshot({ path: path.join(OUT, '04-person-card.png'), fullPage: false });
  console.log('✓ 04-person-card');
  
  await browser.close();
  console.log('Done!');
})();
