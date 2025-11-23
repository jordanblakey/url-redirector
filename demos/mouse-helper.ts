import { Page } from '@playwright/test';

// Injects a visual mouse cursor into the page to make Playwright's actions visible
async function installMouseHelper(page: Page) {
    await page.addInitScript(() => {
        const install = () => {
            // Create the mouse cursor element
            const box = document.createElement('div');
            box.classList.add('playwright-mouse-cursor');

            const styleElement = document.createElement('style');
            styleElement.innerHTML = `
                .playwright-mouse-cursor {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.9);
                    border-radius: 50%;
                    background: rgba(120, 0, 255, 0.5);
                    box-shadow: 0 0 10px rgba(120, 0, 255, 0.5);
                    pointer-events: none;
                    z-index: 2147483647;
                    transition: transform 0.1s, background 0.1s;
                    transform: translate(-50%, -50%);
                    display: none;
                }
                .playwright-mouse-cursor.active {
                    background: rgba(120, 0, 255, 0.9);
                    box-shadow: 0 0 15px rgba(120, 0, 255, 0.8);
                    transform: translate(-50%, -50%) scale(0.8);
                }
            `;

            document.head.appendChild(styleElement);
            document.body.appendChild(box);

            document.addEventListener('mousemove', event => {
                box.style.display = 'block';
                box.style.left = event.clientX + 'px';
                box.style.top = event.clientY + 'px';
            });

            document.addEventListener('mousedown', () => {
                box.classList.add('active');
            });

            document.addEventListener('mouseup', () => {
                box.classList.remove('active');
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', install);
        } else {
            install();
        }
    });
}

export default installMouseHelper;
