from playwright.sync_api import Page, expect, sync_playwright
import os

def test_datetime_picker(page: Page):
    print("Starting test...")
    # 1. Arrange: Go to the app
    page.goto("http://localhost:3000")
    print("Navigated to page")

    # Wait for the picker to be visible
    expect(page.get_by_text("Select Date & Time")).to_be_visible()
    print("Label visible")

    # 2. Act: Click the trigger button to open the calendar
    trigger_button = page.get_by_label("Select Date & Time")
    trigger_button.click()
    print("Clicked trigger")

    # 3. Assert: Verify the calendar popover is visible
    expect(page.get_by_role("button", name="Pick")).to_be_visible()
    print("Popover visible")

    # 4. Act: Select a date (e.g., the 15th of the current month)
    page.get_by_role("button", name="15", exact=True).click()
    print("Selected date")

    # 5. Act: Click "Done"
    page.get_by_role("button", name="Done").click()
    print("Clicked Done")

    # 6. Assert: Verify the value is set (clear button appears)
    expect(page.get_by_label("Clear date")).to_be_visible()
    print("Clear button visible")

    # 7. Screenshot
    output_path = os.path.join(os.getcwd(), "verification/datetime_picker.png")
    page.screenshot(path=output_path)
    print(f"Screenshot saved to {output_path}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_datetime_picker(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
