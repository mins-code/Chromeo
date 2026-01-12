## 2024-05-24 - Input Component Accessibility
**Learning:** The `Input` component was rendering error messages but lacked `aria-invalid` and `aria-describedby` attributes, which are critical for screen readers to associate the error with the input field. Also, the password toggle in `Auth` had `tabIndex={-1}`, creating a keyboard trap/exclusion.
**Action:** Always verify form components include these ARIA attributes and that interactive elements are keyboard accessible (avoid `tabIndex={-1}` unless necessary).

## 2024-05-24 - Custom Select Accessibility
**Learning:** Custom select/dropdown components often lack keyboard navigation support (Enter/Space to open, Arrow keys to navigate, Enter to select, Esc to close) and ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="listbox"`), making them inaccessible to screen reader and keyboard-only users.
**Action:** Implement full keyboard support and ARIA roles for custom interactive components like Select, or use a library that handles this.

## 2024-05-25 - CommandBar Accessibility
**Learning:** The `CommandBar` implemented a custom combobox pattern but lacked the `combobox` role, `aria-expanded`, and `aria-activedescendant` attributes. While it supported keyboard navigation visually, screen reader users had no feedback about the currently selected item while traversing results.
**Action:** When building custom search/command interfaces, always implement the full ARIA Combobox pattern (role="combobox", aria-controls, aria-activedescendant, role="listbox", role="option") to ensure virtual focus is announced.
