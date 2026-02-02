
from playwright.sync_api import sync_playwright, expect

def verify_routine_editor_a11y():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")
            page.wait_for_timeout(2000)

            # Click Cycle pattern
            print("Selecting Cycle pattern...")
            cycle_btn = page.get_by_role("button", name="Cycle")
            cycle_btn.click()

            # Check for color picker button
            print("Checking color picker button...")
            # We expect the first item
            # Updated to match "Current color:"
            color_btn = page.get_by_role("button", name="Change color for Day 1. Current color: Red")

            expect(color_btn).to_be_visible()

            print("SUCCESS: Color picker button found with correct ARIA label!")

            # Take screenshot
            page.screenshot(path="verification/routine_editor_cycle.png")
            print("Screenshot saved to verification/routine_editor_cycle.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_routine_editor_a11y()
