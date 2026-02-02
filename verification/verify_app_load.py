from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000")
            page.goto("http://localhost:3000")

            # Wait for content to load. Since we expect Auth page, we can wait for something specific.
            # But just waiting for load state is a good start.
            page.wait_for_load_state("networkidle")

            print("Taking screenshot")
            page.screenshot(path="verification/verify_app_load.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
