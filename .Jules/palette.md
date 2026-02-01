## 2024-05-24 - Input Component Accessibility
**Learning:** The `Input` component was rendering error messages but lacked `aria-invalid` and `aria-describedby` attributes, which are critical for screen readers to associate the error with the input field. Also, the password toggle in `Auth` had `tabIndex={-1}`, creating a keyboard trap/exclusion.
**Action:** Always verify form components include these ARIA attributes and that interactive elements are keyboard accessible (avoid `tabIndex={-1}` unless necessary).

## 2024-05-24 - Custom Select Accessibility
**Learning:** Custom select/dropdown components often lack keyboard navigation support (Enter/Space to open, Arrow keys to navigate, Enter to select, Esc to close) and ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="listbox"`), making them inaccessible to screen reader and keyboard-only users.
**Action:** Implement full keyboard support and ARIA roles for custom interactive components like Select, or use a library that handles this.

## 2026-01-17 - Tri-State Toggle Accessibility
**Learning:** A tri-state toggle (e.g., Default/Enabled/Disabled) implemented as a single button needs careful labeling. Simply stating the current state ("Using global") isn't enough for action-oriented controls.
**Action:** Use a dynamic `aria-label` that describes the *next action* (e.g., "Enable notification") rather than the current state, ensuring users know what clicking will do.
## 2026-01-16 - Command Palette Accessibility
**Learning:** The Command Palette (`CommandBar`) used `<button>` elements for results but kept focus on the input, which confuses screen readers. Standard Combobox pattern requires `role="combobox"` on input, `aria-activedescendant` pointing to the selected option, and `role="listbox"` containing `role="option"` elements (not buttons).
**Action:** When building command palettes where focus remains on input, use `aria-activedescendant` and ensure result items are `div role="option"` with valid IDs, avoiding interactive elements like `<button>` inside the listbox.
## 2024-05-25 - CommandBar Accessibility
**Learning:** The `CommandBar` implemented a custom combobox pattern but lacked the `combobox` role, `aria-expanded`, and `aria-activedescendant` attributes. While it supported keyboard navigation visually, screen reader users had no feedback about the currently selected item while traversing results.
**Action:** When building custom search/command interfaces, always implement the full ARIA Combobox pattern (role="combobox", aria-controls, aria-activedescendant, role="listbox", role="option") to ensure virtual focus is announced.
## 2024-05-24 - Grid Navigation in DatePicker
**Learning:** Date pickers that render days as individual buttons without grid navigation (Arrow keys) force keyboard users to tab through every single day (30+ tab stops) to reach controls after the calendar.
**Action:** Implement "roving tabindex" for grid-like components: set `tabIndex={0}` on the focused item and `tabIndex={-1}` on others, managing focus via Arrow keys. Ensure stable IDs for focus management.

## 2026-01-28 - Dynamic List Focus Management
**Learning:** In dynamic lists (like subtasks), adding or removing items without managing focus breaks keyboard flow. Users have to manually tab to the new item or back to the previous one.
**Action:** Implement explicit focus management using `useEffect` and refs/IDs when modifying list state. Ensure focus moves to the newly created item or the logical predecessor upon deletion.

## 2026-02-04 - Timer Accessibility
**Learning:** Countdown timers that update the DOM every second create excessive noise for screen readers if live regions are not managed carefully. Using `role="timer"` does not automatically silence this.
**Action:** Use `role="timer"` with `aria-live="off"` for the visible ticking element, and provide a separate, visually hidden `role="status"` element with `aria-live="polite"` to announce only significant state changes (Start, Stop, Complete).

## 2026-02-05 - TimePicker Accessibility
**Learning:** The `TimePickerDropdown` used a `div` with `onClick` as a trigger, which is inaccessible to keyboard users. Internal spinners also lacked labels.
**Action:** Always use `<button type="button">` for interactive triggers, ensure `onKeyDown` handles Enter/Space, and provide unique `aria-label`s for internal controls like spinners using a context label (e.g., "Increase hours").
## 2026-02-14 - Disconnected Toggle Labels
**Learning:** Visual toggle switches often separate the text label from the input for layout purposes (e.g., using `justify-between`), breaking the click target and accessibility association.
**Action:** Use `id` and `htmlFor` to explicitly link the text label to the input, even if they are physically separated in the DOM. Ensure the input has an `aria-label` if the visual label is purely decorative or complex.
## 2026-02-17 - Toggle Button State
**Learning:** Multi-select toggle buttons (like weekday pickers) that rely solely on background color changes for state are inaccessible to screen readers.
**Action:** Always add `aria-pressed={isSelected}` to toggle buttons so screen readers announce the state (e.g., "Monday, toggle button, pressed").
