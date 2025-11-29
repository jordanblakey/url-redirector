# Creating High-Fidelity Graphic Assets

## Figma Source

The URL Redirector screens, icons, and Chrome Web Store assets are maintained in Figma.

- **Figma File:** [URL Redirector Design](https://www.figma.com/design/rTrJwTPfute4FiZwULEJGg/URL-Redirector)

### Chrome Web Store Assets

When updating store assets, please export them to:
`docs/static/chrome_web_store`

---

## Generating High-Fidelity Screenshots

When building marketing assets for the Chrome Web Store (CWS), standard 1:1 screenshots often look blurry when scaled up on high-density displays or inside promotional tiles.

Instead of rebuilding your UI in Figma from scratch, use these two methods to extract your actual production UI as high-resolution assets.

### Prerequisite: Open Popup as a Tab

Extension popups are sandboxed in small containers. To get a clean capture, you need to open the popup as a full page.

1. Right-click your extension icon and select **Inspect Popup**.
2. In the DevTools Console, run:
   ```javascript
   window.location.href;
   ```
3. Copy the URL (e.g., `chrome-extension://[ID]/popup.html`) and paste it into a standard browser tab.

---

### Method 1: The "Super-Raster" (DevTools High-DPI)

**Best for:** Quick mocks, complex gradients, or shadows that might break in vector conversion.

This method tricks Chrome into rendering the page at 3x or 4x pixel density, producing a PNG that is crisp enough for 4K displays.

1. Open your popup in a full tab (see above).
2. Open DevTools (**F12**) and toggle the **Device Toolbar** (`Ctrl+Shift+M`).
3. In the top toolbar, look for the **DPR** (Device Pixel Ratio) dropdown.
   > **Note:** If missing, click the three dots `...` on the right of the toolbar → "Add device pixel ratio".
4. Set **DPR** to **3.0** or **4.0**.
5. In the **Elements** panel, right-click the root element you want to capture (e.g., `<body>` or `#app`).
6. Select **Capture node screenshot**.

**Result:** A massive, pixel-perfect PNG (e.g., 1200px+ width) that looks sharp when dragged into Figma/Canva.

---

### Method 2: The "True Vector" (PDF Extraction)

**Best for:** Full editability. Allows you to change text, colors, and layout inside design tools without coding.

This method exports the DOM as a vector PDF, then converts it to SVG. This creates individual layers for text, shapes, and paths.

#### Step 1: Export to PDF

1. Open your popup in a full tab.
2. Press `Ctrl+P` to Print.
3. **Destination:** Save as PDF.
4. **Important:** Under "More settings", check **Background graphics**.
5. Save the file (e.g., `ui_render.pdf`).

#### Step 2: Convert to SVG (Linux/Ubuntu)

Figma and other web-based design tools often cannot import raw PDFs accurately. Converting to SVG ensures layers are preserved.

1. Install the poppler utilities (if not already installed):
   ```bash
   sudo apt install poppler-utils
   ```
2. Convert the PDF to SVG using `pdftocairo`:
   ```bash
   pdftocairo -svg ui_render.pdf ui_render.svg
   ```

#### Step 3: Import to Design Tool

1. Drag `ui_render.svg` into Figma/Sketch/Inkscape.
2. Ungroup the selection (`Ctrl+Shift+G`) to access individual elements.
3. You can now edit the text (e.g., change "cnn.com" to "example.com") directly in the design tool.

---

### Comparison

| Feature         | Method 1 (Super-Raster)   | Method 2 (True Vector)              |
| :-------------- | :------------------------ | :---------------------------------- |
| **Resolution**  | High (Raster)             | Infinite (Vector)                   |
| **Editability** | None (Static Image)       | Full (Text/Colors editable)         |
| **Accuracy**    | 100% (Rendered by Chrome) | 95% (Some complex shadows may vary) |
| **Speed**       | Fast (< 30s)              | Moderate (Requires CLI)             |

---

## 🐧 Figma Linux: Local Fonts Guide

**Target:** Chrome on Ubuntu (No extensions required)

### Part 1: One-Time Setup (The Bridge)

Install the Figma Agent. The official installer is often broken on Linux. Install the community agent manually:

```bash
# Create directory and download the binary
mkdir -p ~/.local/bin
curl -L -o ~/.local/bin/figma-agent https://github.com/neetly/figma-agent-linux/releases/latest/download/figma-agent-x86_64-unknown-linux-gnu

# Make it executable
chmod +x ~/.local/bin/figma-agent
```

### Part 2: Daily Startup

#### Step 1: Start the Agent

Open a terminal and run this command. Keep this window open while designing.

```bash
~/.local/bin/figma-agent
```

> **Success output:** "Listening on 127.0.0.1:44950"

#### Step 2: Launch & Spoof (The DevTools Trick)

Figma blocks local fonts on Linux. You must use Chrome DevTools to pretend you are on Windows.

1. Open Figma in Chrome.
2. Press **F12** to open Developer Tools.
3. Press **Esc** to open the bottom drawer (if not visible).
4. Click the **Network conditions** tab (next to Console).
   > **Note:** If missing, click the 3-dots on the left of the drawer → **More tools** → **Network conditions**.
5. Uncheck **Use browser default**.
6. Select **Chrome - Windows** from the list.
7. **Keep the DevTools window OPEN.**

#### Step 3: Connect

1. Reload the page (`Ctrl+R`) with DevTools still open.
2. Select a text layer → Font Picker → **Installed by you**.
3. If prompted, click **Connect**.

### Troubleshooting

- **Error:** "Address already in use"
  - **Cause:** The agent is already running in another tab, or a zombie process is holding the port.
  - **Fix:** Run `killall figma-agent`, then try again.

- **Error:** "Connection successful" but 0 fonts found
  - **Cause:** The agent is looking in system folders but your fonts are in `~/.fonts`.
  - **Fix:** Restart the agent with your specific path:
    ```bash
    ~/.local/bin/figma-agent --font-dirs ~/.fonts
    ```

- **Error:** Fonts disappear suddenly
  - **Cause:** You likely closed the DevTools panel or the Terminal window.
  - **Fix:** Re-open DevTools (ensure "Windows" is selected), reload, and check the terminal is running.
