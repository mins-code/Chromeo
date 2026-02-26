from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_modals(page: Page):
    # Navigate to the verification page
    page.goto("http://localhost:3000/verification")

    # Wait for the page to load
    expect(page.get_by_text("Verification Palette")).to_be_visible()

    # --- CLONE DAY MODAL ---
    print("Testing Clone Day Modal...")
    page.get_by_role("button", name="Open Clone Modal").click()

    # Wait for modal
    modal = page.get_by_role("dialog", name="Clone Day Plan")
    expect(modal).to_be_visible()

    # Check autofocus on Target Date input
    target_date_input = page.locator("#target-date")
    expect(target_date_input).to_be_visible()

    # Check label association
    target_date_label = page.locator("label[for='target-date']")
    expect(target_date_label).to_have_text("Target Date")

    # Check if input is focused
    focused_id = page.evaluate("document.activeElement.id")
    print(f"Focused element ID: {focused_id}")
    if focused_id != "target-date":
        print("WARNING: Target Date input is NOT focused!")
    else:
        print("SUCCESS: Target Date input is focused.")

    # Check Shift Times label association
    shift_times_input = page.locator("#shift-times-toggle")
    shift_times_label = page.locator("label[for='shift-times-toggle']")
    expect(shift_times_label).to_contain_text("Shift Times")

    # Take screenshot of Clone Modal
    page.screenshot(path="verification/clone_modal.png")

    # Close modal (click Cancel)
    page.get_by_role("button", name="Cancel").click()
    expect(modal).not_to_be_visible()


    # --- SAVE TEMPLATE MODAL ---
    print("Testing Save Template Modal...")
    page.get_by_role("button", name="Open Save Modal").click()

    # Wait for modal
    modal = page.locator("form").filter(has_text="Save as Template") # Modal title is "Save as Template"
    expect(page.get_by_text("Save as Template", exact=True)).to_be_visible()

    # Check label association
    name_input = page.locator("#template-name")
    name_label = page.locator("label[for='template-name']")
    expect(name_label).to_have_text("Template Name")

    description_input = page.locator("#template-description")
    description_label = page.locator("label[for='template-description']")
    expect(description_label).to_contain_text("Description")

    # Check autofocus
    focused_id = page.evaluate("document.activeElement.id")
    print(f"Focused element ID: {focused_id}")
    if focused_id != "template-name":
         print("WARNING: Template Name input is NOT focused!")
    else:
         print("SUCCESS: Template Name input is focused.")

    # Take screenshot
    page.screenshot(path="verification/save_template_modal.png")

    # Close modal
    page.get_by_role("button", name="Cancel").click()


    # --- DELETE ACCOUNT MODAL ---
    print("Testing Delete Account Modal...")
    page.get_by_role("button", name="Open Delete Modal").click()

    # Wait for modal
    modal = page.get_by_role("dialog", name="Delete Account")
    expect(modal).to_be_visible()

    # Check label association for confirm input
    confirm_input = page.locator("#confirm-delete")
    confirm_label = page.locator("label[for='confirm-delete']")
    expect(confirm_label).to_contain_text("Type DELETE to confirm")

    # Take screenshot
    page.screenshot(path="verification/delete_account_modal.png")

    # Close modal
    page.get_by_role("button", name="Cancel").click()

    print("Verification complete!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_modals(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
