## 2024-04-26 - Dynamic ARIA attributes and role groups
**Learning:** Theme toggle buttons need dynamic labels describing the action ('Switch to dark/light theme') instead of just what they are ('Toggle theme'), and Segmented Controls/Views need `role="group"` on the parent and `aria-pressed` on the buttons so screen readers know they are a group of toggles.
**Action:** Always add dynamic `aria-label` to theme toggles based on the target theme state, add `role="group"` to segmented control wrappers, and add `aria-pressed` states to all active/inactive visual toggle buttons.
