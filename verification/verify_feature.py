from playwright.sync_api import Page, expect, sync_playwright

def test_app_load(page: Page):
  page.goto("http://127.0.0.1:3000")
  page.wait_for_timeout(2000)
  page.screenshot(path="/home/jules/verification/verification.png")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_app_load(page)
    finally:
      browser.close()