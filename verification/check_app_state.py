
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")
            page.wait_for_load_state("networkidle")

            # Check if we are redirected to login or if we see the main app
            print(f"Page title: {page.title()}")

            # Take a screenshot of the initial state
            page.screenshot(path="verification/initial_state.png")
            print("Initial screenshot taken.")

            # Look for a task card or the 'Start Focus Session' button
            # The 'Play' button on TaskCard triggers onFocus

            # We might need to mock auth or data if the app is empty or behind login

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
