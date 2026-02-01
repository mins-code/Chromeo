from playwright.sync_api import sync_playwright, expect
import json

def test_task_card_accessibility(page):
    print("Starting verification...")

    # Mock the tasks API response
    # Supabase usually returns array for select
    tasks_data = [
        {
            "id": "1",
            "title": "Test Accessible Task",
            "description": "This is a test task for accessibility verification",
            "status": "TODO",
            "priority": "HIGH",
            "type": "TASK",
            "tags": ["a11y"],
            "subtasks": [],
            "user_id": "test-user-id",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
            "dependencyIds": [],
            "isShared": False
        }
    ]

    def handle_tasks(route):
        print(f"Intercepted tasks request: {route.request.url}")
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(tasks_data)
        )

    page.route("**/rest/v1/tasks*", handle_tasks)

    # Mock other potential calls to avoid errors preventing render
    page.route("**/rest/v1/user_settings*", lambda r: r.fulfill(status=200, body='[]'))
    page.route("**/rest/v1/budgets*", lambda r: r.fulfill(status=200, body='{"limit": 1000, "transactions": [], "recurring": []}'))
    page.route("**/rest/v1/partners*", lambda r: r.fulfill(status=200, body='[]'))
    page.route("**/rest/v1/routines*", lambda r: r.fulfill(status=200, body='[]'))
    page.route("**/rest/v1/calendar_events*", lambda r: r.fulfill(status=200, body='[]'))

    # Go to tasks page
    print("Navigating to /tasks...")
    page.goto("http://localhost:3000/tasks")

    # Wait for task to appear
    print("Waiting for task card...")
    try:
        page.wait_for_selector("text=Test Accessible Task", timeout=10000)
    except Exception as e:
        print("Timeout waiting for task text.")
        page.screenshot(path="verification/timeout.png")
        raise e

    # 1. Verify Card has role="article"
    print("Checking for role='article'...")
    card = page.locator('div[role="article"]').first
    expect(card).to_be_visible()

    # 2. Verify Title is a button
    print("Checking for title button...")
    # We look for a button that contains the text "Test Accessible Task"
    title_button = card.locator('button', has_text="Test Accessible Task")
    expect(title_button).to_be_visible()

    # 3. Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/task_card_verification.png")

    print("Verification successful!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to standard desktop size
        page.set_viewport_size({"width": 1280, "height": 720})
        try:
            test_task_card_accessibility(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
