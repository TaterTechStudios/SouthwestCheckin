const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const CONFIRMATION = process.env.SW_CONFIRMATION;
const FIRST_NAME   = process.env.SW_FIRST_NAME;
const LAST_NAME    = process.env.SW_LAST_NAME;

if (!CONFIRMATION || !FIRST_NAME || !LAST_NAME) {
  console.error('Missing required env vars: SW_CONFIRMATION, SW_FIRST_NAME, SW_LAST_NAME');
  process.exit(1);
}

async function clickIfVisible(page, selector, description) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log(`Clicking: ${description}`);
    await el.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true, ignoreHTTPSErrors: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log(`Checking in ${FIRST_NAME} ${LAST_NAME} for flight ${CONFIRMATION}...`);

    // Step 1: Load check-in page
    await page.goto('https://www.southwest.com/air/check-in/index.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.screenshot({ path: '/home/user/checkin-1-loaded.png', fullPage: true });

    // Step 2: Fill confirmation number and name
    await page.fill('#confirmationNumber', CONFIRMATION);
    await page.fill('#passengerFirstName', FIRST_NAME);
    await page.fill('#passengerLastName', LAST_NAME);
    await page.screenshot({ path: '/home/user/checkin-2-filled.png' });

    // Step 3: Submit initial form
    await page.click('#form-mixin--submit-button');
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.screenshot({ path: '/home/user/checkin-3-after-submit.png', fullPage: true });

    // Step 4: Check-in confirmation page — click the "Check in" button if present
    await clickIfVisible(page,
      'button:has-text("Check in"), [data-qa="check-in-button"]',
      'Check in confirmation button'
    );
    await page.screenshot({ path: '/home/user/checkin-4-after-confirm.png', fullPage: true });

    // Step 5: Hazardous materials acknowledgment
    const hazmatHandled =
      await clickIfVisible(page, 'button:has-text("No")', 'Hazmat "No" button') ||
      await clickIfVisible(page, '[data-qa="hazmat-no"], [id*="hazmat"] button', 'Hazmat button (data-qa)') ||
      await clickIfVisible(page, 'button:has-text("I agree")', 'Hazmat "I agree" button') ||
      await clickIfVisible(page, 'button:has-text("Continue")', 'Continue button');

    if (hazmatHandled) {
      await page.screenshot({ path: '/home/user/checkin-5-after-hazmat.png', fullPage: true });
    } else {
      console.log('No hazmat prompt detected — may already be past it or selector changed.');
    }

    // Step 6: Final "Check in" or "Confirm" button after hazmat
    await clickIfVisible(page,
      'button:has-text("Check in"), button:has-text("Confirm"), [data-qa="confirm-check-in"]',
      'Final confirm button'
    );
    await page.screenshot({ path: '/home/user/checkin-6-final.png', fullPage: true });

    // Step 7: Verify success
    const pageText = await page.innerText('body');

    if (/boarding pass|checked in|check.?in complete/i.test(pageText)) {
      console.log('SUCCESS: Checked in! Boarding pass available.');
    } else if (/not yet available|too early/i.test(pageText)) {
      console.log('ERROR: Check-in window not open yet.');
      process.exit(1);
    } else if (/not found|invalid/i.test(pageText)) {
      console.log('ERROR: Confirmation number or name not recognized.');
      process.exit(1);
    } else {
      console.log('UNKNOWN: Could not confirm check-in status. Review screenshots.');
    }

  } catch (err) {
    console.error('Check-in failed:', err.message);
    await page.screenshot({ path: '/home/user/checkin-error.png', fullPage: true }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
