
## 2026-05-19 - Segmented Control Accessibility
**Learning:** Segmented controls (like View Mode toggles) implemented as standard buttons without arrow-key navigation logic must not use role='radiogroup' and role='radio', as this breaks screen reader keyboard expectations. Instead, they should be wrapped in role='group' with aria-pressed state on the active button. Icon-only expand/collapse toggles must also define aria-expanded to convey their current state.
**Action:** Always verify if a segmented control handles arrow keys before assigning radio roles; default to role='group' and aria-pressed if they behave like standard buttons.
