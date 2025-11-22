## TODO

- [] STYLE: improve visual styling and branding of the options page
- [] CI: add github actions to test, build and publish new version to chrome web store
- [] FEAT: also expose the options page as a popup.
- [] FEAT: create a utility script to read dotenv from Secret Manager. Refactor check-cws-status to use it.

## DOING

## DONE

- [x] CI: create a versioning strategy for the extension
- [x] CI: add github actions to run tests on PR
- [x] BUG: when new rules are added, reloads should redirect tabs currently on the source url.
- [x] FEAT: generate an appropriate icon for the extension.
- [x] FEAT: badge indicating a redirection event
- [x] FEAT: redirection count per rule
- [x] FEAT: submit a rule on enter keypress
- [x] STYLE: make the rule display one line like source -> target
- [x] convert to typescript
- [x] run tests on precommit hook
- [x] add script to run tests suites (Playwright)
- [x] FEAT: add script to bundle extension (crx)
- [x] BUG: persist badge for 10 seconds
- [x] CLEANUP: there are too many top level test directories. playwright-report, test-results, test.
- [x] CLEANUP: bundles should go in a gitignored build/ top level directory.