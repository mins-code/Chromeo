
## 2024-04-30 - Fix Segmented Controls Accessibility
**Learning:** Segmented controls (e.g., View Mode in CalendarView) implemented as standard buttons without custom arrow-key navigation logic must NOT use `role='radiogroup'` and `role='radio'`. This breaks screen reader expectations. Instead, using a wrapper with `role='group'` and `aria-pressed={isActive}` on the active `<button>` properly communicates selection semantics. Dropdown toggles within these controls must also explicitly define `aria-expanded` and `aria-haspopup` attributes.
**Action:** Apply `role='group'` and `aria-pressed` for segmented view toggles instead of `radiogroup`, and ensure dropdown toggles correctly use `aria-expanded` and `aria-haspopup`.
