## 2024-04-19 - Segmented control accessibility
**Learning:** Segmented controls implemented as standard buttons without arrow-key navigation logic must NOT use `role='radiogroup'` and `role='radio'`. Instead, use `aria-pressed` on the active `<button>` to properly communicate selection semantics.
**Action:** Use `aria-pressed` for button groups acting as visual toggle segments.
