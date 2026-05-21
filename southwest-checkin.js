const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const CONFIRMATION = process.env.SW_CONFIRMATION;
const FIRST_NAME   = process.env.SW_FIRST_NAME;
const LAST_NAME    = process.env.SW_LAST_NAME;

if (!CONFIRMATION || !FIRST_NAME || !LAST_NAME) {
  console.error('Missing required env vars: SW_CONFIRMATION, SW_FIRST_NAME, SW_LAST_NAME');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log(`Checking in ${FIRST_NAME} ${LAST_NAME} for flight ${CONFIRMATION}...`);

    await page.goto('https://www.southwest.com/air/check-in/index.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.screenshot({ path: '/home/user/checkin-loaded.png', fullPage: true });

    // Fill in the check-in form
    await page.fill('[name="confirmationNumber"], #confirmationNumber, [data-qa="confirmation-number"]', CONFIRMATION);
    await page.fill('[name="firstName"], #firstName, [data-qa="last-name"]', FIRST_NAME);
    await page.fill('[name="lastName"], #lastName, [data-qa="last-name"]', LAST_NAME);

    await page.screenshot({ path: '/home/user/checkin-before-submit.png' });

    // Submit the form
    await page.click('[type="submit"], button:has-text("Check in")');
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    await page.screenshot({ path: '/home/user/checkin-after-submit.png' });

    // Check for success or error
    const pageText = await page.innerText('body');

    if (/boarding pass|check.?in successful|you're checked in/i.test(pageText)) {
      console.log('SUCCESS: Checked in! Boarding pass available.');
    } else if (/not yet available|too early/i.test(pageText)) {
      console.log('ERROR: Check-in window not open yet.');
      process.exit(1);
    } else if (/not found|invalid|error/i.test(pageText)) {
      console.log('ERROR: Confirmation number or name not recognized.');
      process.exit(1);
    } else {
      console.log('UNKNOWN: Could not confirm check-in status. See screenshot.');
    }

    // Try to select all available boarding passes
    const checkAllBtn = page.locator('button:has-text("Check in"), [data-qa="select-all"]').first();
    if (await checkAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkAllBtn.click();
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({ path: '/home/user/checkin-boarding-pass.png' });
      console.log('Boarding pass screenshot saved.');
    }

  } catch (err) {
    console.error('Check-in failed:', err.message);
    await page.screenshot({ path: '/home/user/checkin-error.png' }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
