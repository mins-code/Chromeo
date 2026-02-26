from playwright.sync_api import sync_playwright, expect
import os

def test_transaction_editing(page):
    # Navigate to the verification page
    page.goto("http://127.0.0.1:3000/verify")

    # Wait for the list to load
    expect(page.get_by_text("Groceries")).to_be_visible()

    # Hover over the row to reveal the buttons (if they are hidden by default)
    # Finding the row that contains "Groceries"
    # The structure is somewhat complex, so we'll just hover over the text
    page.get_by_text("Groceries").hover()

    # Click edit button
    # The button has aria-label="Edit transaction"
    # We might need to force click if it's hidden/transitioning
    page.get_by_label("Edit transaction").first.click()

    # Verify the edit form appears
    # Check for inputs
    expect(page.get_by_placeholder("Description")).to_have_value("Groceries")
    expect(page.get_by_placeholder("Amount")).to_have_value("50")

    # Modify the description
    page.get_by_placeholder("Description").fill("Groceries Updated")

    # Verify the description updated in the input
    expect(page.get_by_placeholder("Description")).to_have_value("Groceries Updated")

    # Take a screenshot of the edit mode
    if not os.path.exists("verification"):
        os.makedirs("verification")
    page.screenshot(path="verification/transaction_edit.png")

    # Click cancel
    page.get_by_label("Cancel editing").click()

    # Verify we are back to view mode
    expect(page.get_by_text("Groceries")).to_be_visible()
    expect(page.get_by_placeholder("Description")).not_to_be_visible()

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_transaction_editing(page)
            print("Verification script finished successfully.")
        except Exception as e:
            print(f"Verification failed: {e}")
            if not os.path.exists("verification"):
                os.makedirs("verification")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
