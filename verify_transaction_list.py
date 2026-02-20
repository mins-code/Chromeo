from playwright.sync_api import Page, expect, sync_playwright

def verify_transaction_list(page: Page):
    # Navigate to the verification page
    page.goto("http://localhost:3000/verify")

    # Wait for the heading to appear
    heading = page.get_by_text("Transaction List Verification")
    expect(heading).to_be_visible()

    # Verify transactions are rendered
    # Transaction 1: Test Income
    expect(page.get_by_text("Test Income")).to_be_visible()
    expect(page.get_by_text("+₹1,000")).to_be_visible()

    # Transaction 2: Test Expense
    expect(page.get_by_text("Test Expense")).to_be_visible()
    expect(page.get_by_text("-₹500")).to_be_visible()

    # Transaction 3: Recurring Bill
    expect(page.get_by_text("Recurring Bill")).to_be_visible()
    expect(page.get_by_text("-₹200")).to_be_visible()

    # Take screenshot
    page.screenshot(path="verification_transaction_list.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_transaction_list(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification_failure.png")
        finally:
            browser.close()
