## 2026-05-02 - Segmented Control Accessibility
**Learning:** Segmented controls implemented as standard buttons without arrow-key navigation logic must NOT use `role='radiogroup'`. Instead, use a wrapper with `role='group'` and `aria-pressed={isActive}` on the active `<button>`. Dropdown toggles within these controls must explicitly define `aria-expanded` and `aria-haspopup`.
**Action:** Apply `role='group'` and `aria-pressed` states to custom segmented controls instead of radio roles.
