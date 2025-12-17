# Post-Mortem: Build Failure & Refactoring Loop

## Summary
During the final deployment phase of the Omni-Pencil tool, the build process failed repeatedly due to TypeScript `TS6133` (unused variable) errors. Attempts to fix these via the AI agent resulted in a loop of failed fixes and persistent errors. The user intervened to manually clean up the codebase.

## Issue 1: `GraphSystem` Redundancy (`edge` variable)
*   **Problem:** The build reported `edge` was unused in `GraphSystem.ts` loops.
*   **Context:** `GraphSystem` contained two methods for aborting logic: `abortActiveNodes` and `performAbort`. `abortActiveNodes` contained a loop iterating over `this.edges` but the loop body was effectively empty or commented out in previous refactors, leaving `edge` unused.
*   **AI Failure:** The AI checked `draw` method (where `edge` was used) but likely missed the unused loop in `abortActiveNodes` or failed to delete the redundant method entirely.
*   **Fix:** The user removed `abortActiveNodes` entirely and exposed `performAbort` as the public method, removing the dead code.

## Issue 2: `SprigSystem` Unused `dt`
*   **Problem:** `TS6133: 'dt' is declared but its value is never read` in `SprigSystem.ts`.
*   **Context:** The `applyPathMovement` method accepted `dt` as an argument but did not use it (movement was likely logic-based or constant speed per frame without delta scaling, or using a fixed step).
*   **AI Failure:** The AI attempted to rename `dt` to `_dt` in the `update` loop calling convention but struggled to synchronize the method signature change across definition and call site, or the error message was pointing to a different location than assumed.
*   **Fix:** The user removed `dt` from the `applyPathMovement` signature and call, as it was genuinely unnecessary for that specific logic.

## Issue 3: `Toolbar` and `activeMapMode`
*   **Problem:** `TS6133: 'activeMapMode' is declared but its value is never read.`
*   **Context:** The `activeMapMode` property was used to store state, but the state was never queried—only set. The UI label was updated directly in the setter.
*   **AI Failure:** The AI attempted to "read" the variable by using it during initialization, but lifecycle timing (constructor vs draw) made this tricky or ineffective.
*   **Fix:** The user simply removed the `activeMapMode` property and updated the label text directly in `setMapMode`.

## Root Causes of Loop
1.  **Dead Code Blindness:** The AI focused on "fixing the error line" (e.g., renaming variables) rather than asking "why does this code exist?". The empty loop in `abortActiveNodes` was dead code that should have been deleted, not patched.
2.  **Persistent/Stale State:** The AI suspected caching issues because the errors didn't seem to match the code it "saw". In reality, there were multiple occurrences or subtle usages that were missed.
3.  **Refactor Debris:** The codebase had accumulated unused imports (`Ticker`, `Graphics`, `TaskIntent`) and properties (`p2x`, `p2y`) from previous iterations of the tools. The user performed a holistic sweep to remove these, whereas the AI was reactive to specific error messages.

## Action Items
*   **Holistic Cleanup:** When refactoring, explicitly check for and remove unused imports/methods immediately.
*   **Dead Code:** If a function body is empty or commented out, delete the function (unless it's a required interface stub).
*   **Verify Usage:** When TS reports "unused", verify if the variable *should* be used. If not, remove it from the signature if possible, rather than just prefixing `_`.
