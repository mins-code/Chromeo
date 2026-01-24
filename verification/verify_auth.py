from playwright.sync_api import sync_playwright

def test_auth_load(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(5000) # Wait for load
    page.screenshot(path="verification/auth_page.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_auth_load(page)
        finally:
            browser.close()
