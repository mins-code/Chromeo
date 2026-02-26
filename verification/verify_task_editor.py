from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_task_editor(page: Page):
    print("Navigating to verify page...")
    page.goto("http://localhost:3001/verify")

    print("Waiting for dialog...")
    editor = page.get_by_role("dialog")
    expect(editor).to_be_visible()

    # 0. Set Due Date to show Notification Settings
    print("Setting Due Date...")

    date_btn = page.get_by_label("Due Date & Time")
    expect(date_btn).to_be_visible()
    date_btn.click()

    # Click "Now" to set a date
    now_btn = page.get_by_role("button", name="Now")
    expect(now_btn).to_be_visible()
    now_btn.click()

    # IMPORTANT: Close the date picker!
    done_btn = page.get_by_role("button", name="Done")
    expect(done_btn).to_be_visible()
    done_btn.click()

    # Wait for picker to close (it has animation)
    expect(done_btn).not_to_be_visible()

    print("Checking for Notification settings...")
    expect(page.get_by_text("Notification for this task")).to_be_visible()


    print("Checking Notification Mode Toggle...")
    mode_group = page.get_by_role("radiogroup", name="Notification Mode")
    expect(mode_group).to_be_visible()

    time_before_btn = mode_group.get_by_role("radio", name="Time Before")
    specific_time_btn = mode_group.get_by_role("radio", name="Specific Time")

    expect(time_before_btn).to_be_visible()
    expect(specific_time_btn).to_be_visible()
    expect(time_before_btn).to_have_attribute("aria-checked", "true")


    print("Checking Notification Time Presets...")
    time_group = page.get_by_role("radiogroup", name="Notification Time")
    expect(time_group).to_be_visible()

    # Check a preset - use exact=True
    min5_btn = time_group.get_by_role("radio", name="5 min", exact=True)
    expect(min5_btn).to_be_visible()

    # Click 5 min
    min5_btn.click()
    expect(min5_btn).to_have_attribute("aria-checked", "true")

    # Check Custom button
    custom_btn = time_group.get_by_role("radio", name="Custom")
    expect(custom_btn).to_be_visible()
    custom_btn.click()
    expect(custom_btn).to_have_attribute("aria-checked", "true")
    expect(min5_btn).to_have_attribute("aria-checked", "false")

    # Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/task_editor_a11y.png")
    print("Verification successful!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_task_editor(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise e
        finally:
            browser.close()
