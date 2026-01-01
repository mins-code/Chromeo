
from playwright.sync_api import sync_playwright

def verify_input_labels():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app (port 3000 as per vite.config.ts)
            page.goto("http://localhost:3000")

            # Wait for content to load
            page.wait_for_load_state("networkidle")

            # Let's take a screenshot first to see where we are
            page.screenshot(path="/home/jules/verification/initial_load.png")

            # Find all inputs and check if they have associated labels
            inputs = page.locator("input").all()
            print(f"Found {len(inputs)} inputs")

            for i, input_el in enumerate(inputs):
                id_attr = input_el.get_attribute("id")
                print(f"Input {i} ID: {id_attr}")

                if id_attr:
                    # check if there is a label with for=id_attr
                    labels = page.locator(f"label[for='{id_attr}']")
                    count = labels.count()
                    print(f"  Labels for {id_attr}: {count}")
                else:
                    print(f"  Input {i} has NO ID!")

            page.screenshot(path="/home/jules/verification/inputs_verification.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_input_labels()
