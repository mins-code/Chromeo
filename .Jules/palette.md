# Palette's Journal 🎨

## 2024-05-23 - Accessible Card Patterns
**Learning:** "Clickable Cards" are a common UX pattern but difficult to make accessible when they contain other interactive elements (like buttons). Nesting `<button>` inside a container `<button>` is invalid HTML.
**Action:** Instead of making the container a button, use `cursor-pointer` on the container for mouse users, but wrap the *primary text content* (e.g., the Title) in a `<button>` for keyboard users. This provides a clear, distinct tab target for the "main action" without creating invalid DOM structures or trapping focus.
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

## 2026-02-18 - Modal Focus Management
**Learning:** The `FocusSession` modal lacked a focus trap, `autoFocus` on initial content, and an `Escape` key listener, despite having visual hints ("Press Esc to exit").
**Action:** When implementing overlays/modals, always add `autoFocus` to the primary action (or container) and an `Escape` key listener. Ensure only one live region is used for status updates to avoid duplicates or bugs.
## 2026-02-17 - Toggle Button State
**Learning:** Multi-select toggle buttons (like weekday pickers) that rely solely on background color changes for state are inaccessible to screen readers.
**Action:** Always add `aria-pressed={isSelected}` to toggle buttons so screen readers announce the state (e.g., "Monday, toggle button, pressed").

## 2026-02-19 - Modal Focus Management
**Learning:** The `FocusSession` modal lacked keyboard support for the Escape key and initial focus management, making it difficult for keyboard users to exit or interact with the primary action immediately.
**Action:** When building modals, always implement `useEffect` for the Escape key listener and use `autoFocus` (or manual ref focus) on the primary action or container to ensure keyboard focus is captured.

## 2026-02-23 - Color Picker Accessibility
**Learning:** Interactive color pickers implemented as simple `div`s with `onClick` are completely inaccessible to keyboard users and provide no feedback to screen readers about the selected color.
**Action:** Convert color swatches to `<button type="button">`, add `aria-label` describing the action and *current* color name (mapping hex to human-readable names), and ensure focus indicators are visible.

## 2026-02-24 - Layout Widget Accessibility
**Learning:** Layout components like User Profile or Budget widgets implemented as `div`s with `onClick` are inaccessible. They often contain complex content (icons + text) making developers avoid default button styling.
**Action:** Use `<button type="button">` with `text-left` (or appropriate alignment classes) to wrap complex content. Remove default button styling if needed, but keep semantics and keyboard support.

## 2026-03-03 - Segmented Control Accessibility
**Learning:** Groups of buttons that act as mutually exclusive options (like "Task Type: Task | Reminder | Event") are often implemented as sibling buttons, which fails to convey their relationship or selected state to screen readers.
**Action:** Wrap the button group in `role="radiogroup"` with an accessible label, and use `role="radio"` with `aria-checked` on the individual buttons to properly communicate the selection semantics.

## 2026-03-04 - Invisible Progress Bars
**Learning:** Progress bars implemented as purely visual `div`s with width percentages are invisible to screen readers, leaving users unaware of completion status.
**Action:** Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` on the container. Add an `aria-label` describing what is being measured (e.g., "Task progress").

## 2026-03-05 - Search Input Accessibility
**Learning:** Search inputs often rely on placeholders for labeling, which is insufficient for accessibility. Decorative search icons can also add noise if not hidden.
**Action:** Always add `aria-label` to search inputs. Mark decorative icons with `aria-hidden="true"`. Implement clear buttons as interactive elements (`<button>`) with proper labels, not just clickable icons.
## 2026-03-05 - Segmented Control ARIA
**Learning:** Segmented controls (e.g., "View Mode: Month | Week | Day") implemented as buttons often lack semantic structure, leaving screen readers unaware of the relationship or selected state.
**Action:** Wrap the button group in `role="radiogroup"` with an accessible label, and use `role="radio"` with `aria-checked` on the individual buttons to properly communicate the selection semantics. Ideally, implement arrow key navigation, but even without it, the semantic roles provide significant value.
## 2026-03-07 - Modal Input Labeling
**Learning:** Input fields in modals often lack proper label associations (`htmlFor`/`id`), especially when using custom styling or layouts. This fails WCAG 1.3.1 and 2.5.3.
**Action:** Always verify that every `<input>` inside a modal has a corresponding `<label>` with a matching `htmlFor` attribute, or use `aria-label` if a visible label is not possible.

## 2026-06-06 - Invisible Progress Bars
**Learning:** Progress bars implemented as purely visual `div`s with width percentages are invisible to screen readers, leaving users unaware of completion status.
**Action:** Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` on the container. Add an `aria-label` describing what is being measured (e.g., "Task progress").
