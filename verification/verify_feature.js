import { sync_playwright } from 'playwright';

function run() {
  with (sync_playwright()) {
    const browser = chromium.launch({ headless: true });
    const page = browser.newPage();
    try {
      page.goto('http://127.0.0.1:3000');
      // Adding a simple screenshot to make sure the app works and rendering correctly.
      page.waitForTimeout(2000);
      page.screenshot({ path: '/home/jules/verification/verification.png' });
    } finally {
      browser.close();
    }
  }
}

run();