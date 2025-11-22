from playwright.sync_api import sync_playwright

def verify_styles():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Verify Options Page
        page = browser.new_page()
        page.goto("http://localhost:8080/dist/options.html")
        page.screenshot(path="options_verification.png")
        print("Captured options_verification.png")

        # Verify Popup Page
        page = browser.new_page()
        page.goto("http://localhost:8080/dist/popup.html")
        page.screenshot(path="popup_verification.png")
        print("Captured popup_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_styles()
