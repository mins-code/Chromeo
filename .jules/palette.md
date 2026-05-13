## 2026-05-13 - Segmented Controls A11y
**Learning:** Segmented controls implemented as standard buttons without arrow-key navigation must use role='group' and aria-pressed, not radio roles. Dropdown toggles within these controls must also explicitly define aria-expanded and aria-haspopup attributes to communicate selection semantics properly.
**Action:** Applied role='group' to wrapper, aria-pressed to view toggle buttons, and aria-expanded/aria-haspopup to the custom interval dropdown in CalendarView.
