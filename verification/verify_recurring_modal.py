from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to ensure 'Recurring' text is visible (hidden on mobile)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        # Navigate directly to Day Planner where the modal button exists
        print("Navigating to Day Planner...")
        page.goto("http://localhost:3000/day-planner")

        # Wait for app to load
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except:
            print("Timed out waiting for networkidle, continuing...")

        # Click 'Recurring' button using the newly added aria-label
        print("Looking for Recurring button...")

        # Now we can use the label we just added!
        recurring_btn = page.get_by_label("Recurring Plan")

        if not recurring_btn.is_visible():
             print("Recurring button not visible by label.")
             page.screenshot(path="verification/failed_to_find_button.png")
             return

        recurring_btn.click()

        # Wait for modal header
        print("Waiting for modal...")
        expect(page.get_by_text("Recurring Plan Settings")).to_be_visible()

        # Verify Weekday Labels (My Change)
        # Should find "Repeat on Sunday", "Repeat on Monday", etc.
        sunday_btn = page.get_by_label("Repeat on Sunday")
        monday_btn = page.get_by_label("Repeat on Monday")

        expect(sunday_btn).to_be_visible()
        expect(monday_btn).to_be_visible()
        print("SUCCESS: Found buttons with accessible labels 'Repeat on Sunday/Monday'")

        # Verify Frequency Button State (My Change)
        # 'Weekly' should be pressed by default
        weekly_btn = page.get_by_role("button", name="Weekly")
        expect(weekly_btn).to_be_visible()

        # Check aria-pressed attribute
        is_pressed = weekly_btn.get_attribute("aria-pressed")
        print(f"Weekly button aria-pressed: {is_pressed}")

        if is_pressed != "true":
             print("ERROR: Weekly button should be pressed!")
        else:
             print("SUCCESS: Weekly button is pressed.")

        daily_btn = page.get_by_role("button", name="Daily")
        is_daily_pressed = daily_btn.get_attribute("aria-pressed")
        print(f"Daily button aria-pressed: {is_daily_pressed}")

        if is_daily_pressed != "false":
            print("ERROR: Daily button should NOT be pressed!")
        else:
            print("SUCCESS: Daily button is not pressed.")

        # Take screenshot of the modal
        page.screenshot(path="verification/recurring_modal.png")
        print("Screenshot saved to verification/recurring_modal.png")

        browser.close()

if __name__ == "__main__":
    run()
