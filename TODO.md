## TODO

- [] STYLE: improve visual styling and branding of the options page
- [] FEAT: add TS type annotations anywhere appropriate throughout the codebase. Create type definitions and interfaces if needed.
- [] FEAT: Test coverage report. Add summary to main npm run test command: # and names of suites passed/failed.

## DELEGATED
- [] CLEANUP: look at all comments in the codebase to make sure they make sense, and are needed. Where possible, let the code be self explanatory. But leave comments that improve readability and maintainability.
- [] CLEANUP: Update readme based on recent changes
- [] FEAT: explore using TS for scripts/ and anywhere .js files are still used. Validate that it works. This may involve changing babel settings or using ts-node or a similar tool. Does this make sense to do?
- [] BUG: actually prevent new rules being added for validation criteria: must be url, must not be empty, must not be duplicate, source and dest must not be the same. Write tests to ensure the validation works.


## DOING
- [] FEAT: also expose the options page as a popup.

## DONE

- [x] CI: add github action to publish new version to chrome web store
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