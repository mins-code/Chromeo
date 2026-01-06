
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_input_accessibility(page: Page):
    # Navigate to the test page
    page.goto("http://localhost:3000/test-a11y")

    # Wait for the input to appear
    page.wait_for_selector("input")

    # Find the input by label
    input_field = page.get_by_label("Test Input")

    # Verify aria-invalid is true
    expect(input_field).to_have_attribute("aria-invalid", "true")

    # Get aria-describedby ID
    described_by_id = input_field.get_attribute("aria-describedby")
    assert described_by_id is not None

    # Verify the error message exists with that ID
    error_message = page.locator(f"#{described_by_id}")
    expect(error_message).to_be_visible()
    expect(error_message).to_have_text("This is a test error")
    expect(error_message).to_have_attribute("role", "alert")

    print("Verification passed!")

    # Take screenshot
    page.screenshot(path="verification/input_a11y_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_input_accessibility(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            exit(1)
        finally:
            browser.close()
