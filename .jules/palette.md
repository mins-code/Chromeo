## 2024-05-01 - Accessible Segmented Controls and View Toggles
**Learning:** Segmented controls implemented as buttons without standard arrow-key navigation should use `role='group'` and `aria-pressed` instead of `role='radiogroup'`. Icon-only expand/collapse toggles must include `aria-label` and `aria-expanded`.
**Action:** Add `role="group"` and `aria-pressed` to view toggles (CalendarView). Add `aria-expanded` and `aria-label` to view mode toggles (DayView, WeekView, CalendarView custom dropdown).
