## TODO

- [] BUG: Monocart reporter sourcemap pathing errors. Failed to fix twice now. Consider alternatives.

## DELEGATED

- [] FEATURE: Microcopy ideas for rule counts. Randomized.
- [] UX: Move input examples from labels into placeholder text. Cleaner and more standard.
- [] UX: Alpha sort rules by source url.
- [] UX: Buttons a bit small on Popup. Fitts' Law.

## DOING

## DONE

- [x] CLEANUP: reorg to assets/ folder
- [x] CI: understand the different coverage categories. improve branch coverage if needed.
- [x] BUG: "Active Rules" is a bit misleading with new pause/resume feature. "Redirection Rules"? "Rules"?
- [x] BUG: adding a rule to popup should immediately redirect tabs currently on the source url. Write test.
- [x] BUG: is there an alternative layout for URL Redirector E2E Coverage Report when running npm tests? The current layout hides the pass/fail status and you have to scroll up.
- [x] BUG: persist badge for 10 seconds
- [x] BUG: prevent new rules by validation criteria: must be url, must not be empty, must not be duplicate, source and dest must not be the same. Write tests.
- [x] BUG: resuming should immediately redirect tabs currently on the source url. Write test.
- [x] BUG: resuming should immediately redirect tabs currently on the source url. Write test.
- [x] BUG: types.js should not be in dist
- [x] BUG: when new rules are added, reloads should redirect tabs currently on the source url.
- [x] BUG: why are CSS files in the coverage report?
- [x] CI: add github action to publish new version to chrome web store
- [x] CI: add github actions to run tests on PR
- [x] CI: add script to run tests suites (Playwright)
- [x] CI: create a versioning strategy for the extension
- [x] CI: run tests on precommit hook
- [x] CLEANUP: bundles should go in a gitignored build/ top level directory.
- [x] CLEANUP: combine CSS for popup and options pages if feasible.
- [x] CLEANUP: evaluate the use of 'any' in the codebase. Replace with appropriate types where desirable.
- [x] CLEANUP: look at all comments in the codebase to make sure they make sense, and are needed.
- [x] CLEANUP: there are too many top level test directories. playwright-report, test-results, test.
- [x] CLEANUP: understand the purpose of sourcemaps in dist/ and remove them if not needed. What's the value?
- [x] CLEANUP: Update readme based on recent changes
- [x] FEAT: Add a test coverage report.
- [x] FEAT: add script to bundle extension (crx)
- [x] FEAT: add TS type annotations anywhere appropriate throughout the codebase. Create type definitions and interfaces if needed.
- [x] FEAT: also expose the options page as a popup.
- [x] FEAT: badge indicating a redirection event
- [x] FEAT: create a utility script to read dotenv from Secret Manager. Refactor check-cws-status to use it.
- [x] FEAT: explore using TS for scripts/ and anywhere .js files are still used. Validate that it works.
- [x] FEAT: generate an appropriate icon for the extension.
- [x] FEAT: redirection count per rule
- [x] FEAT: submit a rule on enter keypress
- [x] FEAT:convert to typescript
- [x] STYLE: make the rule display one line like source -> target