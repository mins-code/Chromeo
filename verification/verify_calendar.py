from playwright.sync_api import Page, expect, sync_playwright

def verify_calendar(page: Page):
    # 1. Go to the calendar page.
    page.goto("http://localhost:3000/calendar")

    # 2. Wait for calendar to load.
    # CalendarView has a header with "Month", "Week", "Day" buttons.
    # I'll wait for "Month" button.
    page.wait_for_selector('button[aria-label="Month view"]')

    # 3. Take screenshot
    page.screenshot(path="/home/jules/verification/calendar_view.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_calendar(page)
        finally:
            browser.close()
