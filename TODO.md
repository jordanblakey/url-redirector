## TODO
[] CI: Push initial version through Chrome Web Store review process

## DELEGATED
[] CI: improve unit and e2e test coverage for ui.ts.
[] FEATURE: Shuffle Mode after a source url is provided, if target input is empty, change the button text to "Add Shuffle Rule". Change it back to "Add Rule" when Target URL is provided. In the rule display, it should say :shuffle: shuffle. When the target URL is visited, a random URL is selected from list of recommended URLS.


## DOING

## DONE
[x] BUG: Tab order should skip the copy buttons altogether, in the source and target url fields
[x] BUG: Unpausing a rule on the popup page no longer immediately redirects.
[x] CLEANUP: Remove any css that isn't referenced anywhere. Remove redundant rules. Add section comments grouping related rules. Nest where possible.
[x] CLEANUP: Refactor duplicated logic in the src folder. Clean old comments, dead code. Particularly in ui.ts. popup.ts. background.ts and options.ts
[x] FEATURE: Add a "use" button on hover to inputs that makes the placeholder the value.
[x] BUG: "Active Rules" is a bit misleading with new pause/resume feature. "Redirection Rules"? "Rules"?
[x] BUG: adding a rule to popup should immediately redirect tabs currently on the source url. Write test.
[x] BUG: is there an alternative layout for URL Redirector E2E Coverage Report when running npm tests? The current layout hides the pass/fail status and you have to scroll up.
[x] BUG: long urls are truncated. Especially in the popup.
[x] BUG: persist badge for 10 seconds
[x] BUG: prevent new rules by validation criteria: must be url, must not be empty, must not be duplicate, source and dest must not be the same. Write tests.
[x] BUG: Prevent the entry of rules where a rule with the same source url exists
[x] BUG: resuming should immediately redirect tabs currently on the source url. Write test.
[x] BUG: types.js should not be in dist
[x] BUG: Use flash messages instead of alerts.
[x] BUG: when new rules are added, reloads should redirect tabs currently on the source url.
[x] BUG: why are CSS files in the coverage report?
[x] CI: add github action to publish new version to chrome web store
[x] CI: add github actions to run tests on PR
[x] CI: add script to run tests suites (Playwright)
[x] CI: create a versioning strategy for the extension
[x] CI: run tests on precommit hook
[x] CI: understand the different coverage categories. improve branch coverage if needed.
[x] CI: Write instructions for Chrome Web Store reviewer to test the extension.
[x] CLEANUP: bundles should go in a gitignored build/ top level directory.
[x] CLEANUP: combine CSS for popup and options pages if feasible.
[x] CLEANUP: evaluate the use of 'any' in the codebase. Replace with appropriate types where desirable.
[x] CLEANUP: look at all comments in the codebase to make sure they make sense, and are needed.
[x] CLEANUP: reorg to assets/ folder
[x] CLEANUP: there are too many top level test directories. playwright-report, test-results, test.
[x] CLEANUP: understand the purpose of sourcemaps in dist/ and remove them if not needed. What's the value?
[x] CLEANUP: unify tsconfig
[x] CLEANUP: Update readme based on recent changes
[x] FEAT: Add a test coverage report.
[x] FEAT: add script to bundle extension (crx)
[x] FEAT: add TS type annotations anywhere appropriate throughout the codebase. Create type definitions and interfaces if needed.
[x] FEAT: also expose the options page as a popup.
[x] FEAT: badge indicating a redirection event
[x] FEAT: create a utility script to read dotenv from Secret Manager. Refactor check-cws-status to use it.
[x] FEAT: explore using TS for scripts/ and anywhere .js files are still used. Validate that it works.
[x] FEAT: generate an appropriate icon for the extension.
[x] FEAT: redirection count per rule
[x] FEAT: submit a rule on enter keypress
[x] FEAT:convert to typescript
[x] FEATURE: Add a "demo" recording of the extension for the Chrome Web Store.
[x] FEATURE: Automated demo recording - named recording. migrate to top level folder demos/. visible mouse actions.
[x] FEATURE: Automated demo recording utility.
[x] Feature: Convert the "Pause" button into a Temporary Snooze (e.g., 5-10 minutes)UI: Visual indicator that the rule is "Snoozed" (maybe a countdown or a different icon color) so the user knows it will come back.
[x] FEATURE: Expand messages.ts to include more microcopy options.
[x] Feature: Implement "Thematic Matching" logic for placeholders (map specific source categories to relevant target categories, e.g., Video → Education vs. Social Scroll → Deep Reading) to replace pure randomization.
[x] FEATURE: Include preset templates for common distracting sites paired with healthier alternatives. Hook into the psychology of why people use these sites and satisfy it in a different way. Bad habit? Replace with a good one.
[x] FEATURE: Microcopy ideas for rule counts. Randomized.
[x] FEATURE: Randomly select a top distracting site to populate source and wholesome site populate target placeholder text
[x] STYLE: make the rule display one line like source -> target
[x] UX: Alpha sort rules by source url.
[x] UX: Buttons a bit small on Popup. Fitts' Law.
[x] UX: Move input examples from labels into placeholder text. Cleaner and more standard.

---

## Ambitious and Not Necessarily Good Ideas

### Juice
[] FEATURE: Visually show how many times a rule has been used with a shaded area in the background https://www.figma.com/design/rTrJwTPfute4FiZwULEJGg/URL-Redirector-Screens?node-id=5-9&t=EH0NU01TjYsU23fw-0. The rule with the most usage should have about 90% of the background shaded. A bar graph. Sort by usage.

### Rule Sorting
[] FEATURE: Revisit sorting if alpha is not the best. Pinned rules. Usage sorting. Pinning + selectable sorting. Sort selection memory.