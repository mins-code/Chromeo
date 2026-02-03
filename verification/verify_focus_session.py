
import time
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000/tasks")
            page.wait_for_load_state("networkidle")

            # Find the task card (specifically the H3 title)
            # We use first because there might be other matches, but we just need one to interact with
            task_card_title = page.locator("h3", has_text="Test Focus Task").first
            task_card = task_card_title.locator("..").locator("..") # Go up to container if needed, or just hover title

            expect(task_card_title).to_be_visible()
            print("Task card found.")

            # Hover to reveal buttons
            print("Hovering task card...")
            task_card_title.hover()

            # Click the Focus button
            print("Clicking Start Focus Session...")
            focus_btn = page.get_by_label("Start Focus Session").first
            focus_btn.click(force=True)

            # Wait for modal
            print("Waiting for Focus Session modal...")
            modal = page.get_by_role("dialog")
            expect(modal).to_be_visible()

            # Check for text inside the modal
            expect(modal.get_by_text("Focus Mode")).to_be_visible()
            expect(modal.get_by_role("heading", name="Test Focus Task")).to_be_visible()

            print("Focus Session modal is open.")
            page.screenshot(path="verification/3_modal_open.png")

            # Test Escape key
            print("Pressing Escape...")
            page.keyboard.press("Escape")

            # Verify modal is closed
            print("Verifying modal closed...")
            expect(modal).not_to_be_visible()

            print("Focus Session modal closed successfully.")
            page.screenshot(path="verification/4_modal_closed.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
