## 2024-05-24 - Input Component Accessibility
**Learning:** The `Input` component was rendering error messages but lacked `aria-invalid` and `aria-describedby` attributes, which are critical for screen readers to associate the error with the input field. Also, the password toggle in `Auth` had `tabIndex={-1}`, creating a keyboard trap/exclusion.
**Action:** Always verify form components include these ARIA attributes and that interactive elements are keyboard accessible (avoid `tabIndex={-1}` unless necessary).

## 2024-05-24 - Custom Select Accessibility
**Learning:** Custom select/dropdown components often lack keyboard navigation support (Enter/Space to open, Arrow keys to navigate, Enter to select, Esc to close) and ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="listbox"`), making them inaccessible to screen reader and keyboard-only users.
**Action:** Implement full keyboard support and ARIA roles for custom interactive components like Select, or use a library that handles this.

## 2024-05-24 - Grid Navigation in DatePicker
**Learning:** Date pickers that render days as individual buttons without grid navigation (Arrow keys) force keyboard users to tab through every single day (30+ tab stops) to reach controls after the calendar.
**Action:** Implement "roving tabindex" for grid-like components: set `tabIndex={0}` on the focused item and `tabIndex={-1}` on others, managing focus via Arrow keys. Ensure stable IDs for focus management.
