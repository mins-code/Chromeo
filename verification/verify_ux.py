from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating...")
        page.goto("http://127.0.0.1:3000/budget")
        page.wait_for_load_state("networkidle")

        print("Finding control...")
        # Get the container
        container = page.locator("div[role='radiogroup']")
        if container.count() == 0:
            print("Radiogroup not found!")
            # Dump HTML
            # print(page.content())
        else:
            print("Radiogroup found.")
            print(f"Label: {container.get_attribute('aria-label')}")

            # Find month button
            month_btn = container.locator("button", has_text="month")
            if month_btn.count() > 0:
                print("Month button found.")
                print(f"Role: {month_btn.get_attribute('role')}")
                print(f"Aria-Checked: {month_btn.get_attribute('aria-checked')}")
                print(f"Type: {month_btn.get_attribute('type')}")
            else:
                print("Month button NOT found.")

        page.screenshot(path="verification/verification.png")
        print("Screenshot saved.")
        browser.close()

if __name__ == "__main__":
    run()
