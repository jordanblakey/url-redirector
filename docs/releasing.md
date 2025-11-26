# Release Process

To release a new version of the extension:

1.  **Ensure you are on the main branch** and have pulled the latest changes.
2.  **Run the version command**:
    ```bash
    npm version <major|minor|patch>
    # Example: npm version patch
    ```
    This command will automatically:
    *   Update the version in `package.json` and `manifest.json`.
    *   Create a git commit and tag.
    *   **Submit the new version to the Chrome Web Store** (via `postversion` hook).
    *   Push the commit and tag to GitHub.
    *   Create a GitHub Release.

> [!CAUTION]
> **Do NOT run `npm run version <arg>`**.
> You must run `npm version <arg>` directly.
> The `version` script in `package.json` is a lifecycle hook used internally by `npm version`, not a standalone script.

> [!IMPORTANT]
> The submission process requires `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, and `CWS_REFRESH_TOKEN` environment variables to be set (or available via Google Secret Manager).

## Manual Submission / Dry Run

You can also run the submission script manually:

```bash
# Dry Run (Default) - Checks credentials and bundle, but does NOT upload
npm run cws:submit

# Actual Submission
npm run cws:submit -- --submit
```
