# Release Process

The release process is managed by an on-demand GitHub Actions workflow. This ensures a consistent, tested, and automated release to the Chrome Web Store (CWS) and GitHub.

## Prerequisites

1.  **Version Bump**: Manually update the `version` field in `package.json`. Follow semantic versioning (`major.minor.patch`).
2.  **Commit and Merge**: Ensure your changes, including the version bump in `package.json`, are committed and merged into the `main` branch. The workflow should always be run from the `main` branch.

## How to Release

1.  **Navigate to the Actions tab** in the GitHub repository.
2.  **Select the "Publish to Chrome Web Store (On-Demand)" workflow** from the list on the left.
3.  **Click the "Run workflow" dropdown button** on the right.
4.  **Confirm the branch is `main`**.
5.  **Enter Release Notes**: In the "Release notes" text field, provide a brief summary of the changes for this version. These notes will be used in the body of the GitHub Release.
6.  **Click "Run workflow"**.

## What the Workflow Does

The workflow will automate the following steps:

1.  **Runs Tests**: Executes the full test suite (`npm run test`) to ensure there are no regressions.
2.  **Bundles the Extension**: Creates a production-ready `.zip` file of the extension.
3.  **Publishes to CWS**: Uploads and publishes the new version to the Chrome Web Store.
4.  **Creates a GitHub Release**: Creates a new release on GitHub, tagged with the version from `package.json`, and includes the release notes you provided.

This automated process replaces the previous `npm version` and manual submission scripts.
