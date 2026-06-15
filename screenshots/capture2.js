const puppeteer = require('puppeteer');
const path = require('path');
const OUT = __dirname;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

  await page.goto('https://fotan.techforliving.net', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.row', { timeout: 10000 });

  // Find a PAID person (text includes "已付款") and click
  console.log('🔍 搵已付款嘉賓...');
  const paidPerson = await page.evaluateHandle(() => {
    const rows = document.querySelectorAll('.row');
    for (const row of rows) {
      if (row.textContent.includes('已付款')) return row;
    }
    return null;
  });
  const row = paidPerson.asElement();
  if (row) {
    await row.click();
    await new Promise(r => setTimeout(r, 800));

    // Confirm checkin dialog
    console.log('📸 確認簽到對話框...');
    await page.screenshot({ path: path.join(OUT, 'confirm-checkin.png'), fullPage: false });
    console.log('  ✓ confirm-checkin.png');

    // Click confirm
    const confirmBtn = await page.$('.btn-yes');
    if (confirmBtn) {
      await confirmBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    // Switch to checked tab
    console.log('📸 簽到完成頁...');
    await page.screenshot({ path: path.join(OUT, 'checkin-done.png'), fullPage: false });
    console.log('  ✓ checkin-done.png');

    // Go back to unchecked and then checked tab to refresh
    await page.goto('https://fotan.techforliving.net', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const tabs = await page.$$('.tab');
    if (tabs.length > 1) { await tabs[1].click(); await new Promise(r => setTimeout(r, 800)); }

    // Click the first checked-in person for card
    console.log('📸 個人資料卡...');
    const checkedRow = await page.$('.row');
    if (checkedRow) {
      await checkedRow.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(OUT, 'person-card.png'), fullPage: false });
      console.log('  ✓ person-card.png');
    } else {
      console.log('  ⚠️ 未有已簽到記錄');
    }
  } else {
    console.log('  ⚠️ 搵唔到已付款嘉賓');
  }

  await browser.close();
  console.log('\n✅ 完成');
})();
