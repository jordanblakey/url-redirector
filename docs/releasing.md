# Release Process

To release a new version of the extension:

1.  **Ensure you are on the main branch** and have pulled the latest changes.
2.  **Run the release command**:
    ```bash
    npm run release <major|minor|patch>
    # Example: npm run release patch
    ```
    This command will automatically:
    *   Check for a failed release from the previous version. If it finds one, it will re-release the same version.
    *   If not, it will update the version in `package.json` and `manifest.json`.
    *   Bundle the extension.
    *   Submit the new version to the Chrome Web Store.
    *   Create a git commit and tag.
    *   Push the commit and tag to GitHub.
    *   Create a GitHub Release.

> [!IMPORTANT]
> The submission process requires `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, and `CWS_REFRESH_TOKEN` environment variables to be set (or available via Google Secret Manager).

## Dry Run

You can also run the release script in dry run mode to see what it will do without actually making any changes:

```bash
npm run release <major|minor|patch> -- --dry-run
# Example: npm run release patch -- --dry-run
```
