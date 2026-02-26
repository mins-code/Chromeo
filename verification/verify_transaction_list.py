from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    # Go to verify page
    page.goto("http://127.0.0.1:3000/verify")

    # Wait for list to load
    page.wait_for_selector("text=Groceries")

    # Hover over the row to show edit button
    row = page.locator("div.group").filter(has_text="Groceries").first
    row.hover()

    # Click edit button inside the row
    row.get_by_label("Edit transaction").click()

    # Check if edit form appears
    expect(page.get_by_placeholder("Description")).to_have_value("Groceries")

    # Edit description
    page.get_by_placeholder("Description").fill("Groceries Updated")

    # Click save
    page.get_by_label("Save changes").click()

    # Verify update
    expect(page.get_by_text("Groceries Updated")).to_be_visible()

    # Take screenshot
    page.screenshot(path="verification/transaction_list_verified.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
