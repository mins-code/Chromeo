## 2026-04-24 - Accessible Segmented Controls
**Learning:** Segmented controls that do not implement arrow-key navigation should use `role='group'` with `aria-pressed` rather than `role='radiogroup'` to properly align with keyboard expectations.
**Action:** Applied `role='group'` and `aria-pressed` to the View Mode toggles in CalendarView, and added `aria-expanded` and `aria-haspopup` to its dropdown.
