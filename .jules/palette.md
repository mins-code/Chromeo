## 2026-05-10 - Segmented Control Accessibility
**Learning:** Segmented controls implemented as standard buttons without arrow-key navigation logic must use `role='group'` on the wrapper and `aria-pressed` on the buttons, instead of `role='radiogroup'` and `role='radio'` which break screen reader keyboard expectations.
**Action:** Always verify if segmented controls have arrow-key navigation before assigning radio roles; default to group/aria-pressed for standard button wrappers.
