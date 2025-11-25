from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"PAGE CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Define mock script
        mock_script = """
        window.chrome = {
            runtime: {
                getManifest: () => ({ version: '1.0.0' })
            },
            storage: {
                local: {
                    get: (keys, callback) => callback({ rules: [] }),
                    set: (data, callback) => {
                        console.log('Mock storage set called');
                        // Simulate callback async
                        setTimeout(() => {
                           if (callback) callback();
                        }, 0);
                    }
                },
                onChanged: {
                    addListener: () => {}
                }
            },
            tabs: {
                query: (q, cb) => cb([])
            }
        };
        """

        page.add_init_script(mock_script)

        # Use localhost server
        page.goto("http://localhost:8000/dist/html/options.html")

        # 1. Verify Button Text Change
        page.fill('#sourceUrl', 'shuffle-test.com')

        # Dispatch input event explicitly
        page.evaluate("document.getElementById('sourceUrl').dispatchEvent(new Event('input'))")

        # Force a small wait
        page.wait_for_timeout(500)

        # Log the button text
        btn_text = page.inner_text('#addRuleBtn')
        print(f"Button Text: {btn_text}")

        page.screenshot(path='verification/1_shuffle_button.png')

        # 2. Add Shuffle Rule and Verify Display
        page.click('#addRuleBtn')

        page.wait_for_timeout(500)

        page.screenshot(path='verification/2_shuffle_rule_added.png')

        browser.close()

if __name__ == "__main__":
    run()
