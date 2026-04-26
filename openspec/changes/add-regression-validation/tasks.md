## 1. Validation Assets

- [x] 1.1 Move the ad hoc workspace verification data into repo-owned regression fixtures for workspace snapshot metadata and artifact content.
- [x] 1.2 Add a stable Playwright validation script set for the workspace search, filter, preview, and selection-separation flow.

## 2. Verification Workflow

- [x] 2.1 Add a documented local workflow for running renderer typecheck plus the workspace regression validation commands.
- [x] 2.2 Make the scripted validation fail explicitly when search, preview, or selection expectations regress.

## 3. Change Verification

- [x] 3.1 Run desktop renderer typechecking after the regression-validation assets land.
- [x] 3.2 Execute the scripted regression validation and confirm it covers markdown, JSON, and log preview cases.
