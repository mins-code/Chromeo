from playwright.sync_api import sync_playwright, expect
import re

def test_timepicker_accessibility(page):
    # 1. Arrange: Go to Routines page
    print("Navigating to /routines...")
    page.goto("http://localhost:3000/routines")

    # 2. Act: Open Routine Editor
    print("Clicking Add Routine...")
    # Using a broad match for "Routine" button if exact text fails, but "Add Routine" is in the header.
    # We use .first because there might be multiple buttons (header + empty state)
    page.get_by_role("button", name="Add Routine").first.click()

    # 3. Find the TimePicker
    print("Looking for TimePicker trigger...")
    # The label is "Time", so aria-label should be "Select time for Time"
    trigger = page.get_by_role("button", name="Select time for Time")

    expect(trigger).to_be_visible()
    print("TimePicker trigger found and visible.")

    # 4. Open the dropdown
    print("Opening dropdown...")
    trigger.click()

    # 5. Verify spinners have ARIA labels
    print("Verifying ARIA labels...")
    inc_hours = page.get_by_role("button", name="Increase hours")
    expect(inc_hours).to_be_visible()
    print("Increase hours button found.")

    inc_minutes = page.get_by_role("button", name="Increase minutes")
    expect(inc_minutes).to_be_visible()
    print("Increase minutes button found.")

    am_pm = page.get_by_role("button", name=re.compile("Switch to (AM|PM)"))
    expect(am_pm).to_be_visible()
    print("AM/PM toggle found.")

    # 6. Screenshot
    page.screenshot(path="verification/timepicker_accessible.png")
    print("Screenshot saved to verification/timepicker_accessible.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_timepicker_accessibility(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
