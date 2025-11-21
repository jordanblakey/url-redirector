from playwright.sync_api import sync_playwright, expect
import os
import http.server
import socketserver
import threading
import time

PORT = 8001

def start_server():
    os.chdir(os.path.join(os.getcwd(), 'url-redirector'))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("serving at port", PORT)
        httpd.serve_forever()

def verify_options_page():
    # Start server in a thread
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()

    # Give it a moment to start
    time.sleep(2)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Inject mock chrome
        mock_chrome = """
        window.chrome = {
            storage: {
                local: {
                    get: (keys, callback) => {
                        setTimeout(() => {
                           const rules = JSON.parse(localStorage.getItem('rules') || '[]');
                           callback({ rules });
                        }, 0);
                    },
                    set: (items, callback) => {
                        setTimeout(() => {
                           if (items.rules) {
                               localStorage.setItem('rules', JSON.stringify(items.rules));
                           }
                           if (callback) callback();
                        }, 0);
                    }
                }
            },
            tabs: {
                query: (q, cb) => cb([]),
                update: (id, props) => {}
            }
        };
        """
        page.add_init_script(mock_chrome)

        page.goto(f"http://localhost:{PORT}/options.html")

        # Verify basic elements
        expect(page.locator("#sourceUrl")).to_be_visible()
        expect(page.locator("#targetUrl")).to_be_visible()

        # Add a rule
        page.fill("#sourceUrl", "example.com")
        page.fill("#targetUrl", "google.com")
        page.click("#addRuleBtn")

        # Wait for rule to appear
        expect(page.locator(".rule-item")).to_have_count(1)

        # Take screenshot
        screenshot_path = os.path.join(os.getcwd(), '..', 'verification', 'options_verification.png')
        # Adjust path because we changed cwd in start_server
        # Actually, verify_options.py is in /app/verification usually?
        # Wait, start_server does os.chdir. This affects the whole process!
        # So we are now in url-redirector.

        if not os.path.exists('../verification'):
             os.makedirs('../verification')

        screenshot_path = '../verification/options_verification.png'
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_options_page()
