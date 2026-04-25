## 2024-05-24 - [Routine Toggle ARIA]
**Learning:** Visual toggle buttons that manage active/inactive states (like the routine toggle in `RoutineCard`) must use the `aria-pressed` attribute reflecting their state to properly convey activation status to screen readers.
**Action:** Always add `aria-pressed={isActive}` to toggle buttons that switch states instead of acting as simple action triggers.
