## 2024-04-09 - Accessible Toggle Buttons and Segmented Controls
**Learning:** When implementing custom toggle buttons, using `aria-pressed` with a static `aria-label` prevents double-announcements for screen readers. Segmented controls without arrow-key navigation should use `aria-pressed` on standard buttons instead of `role="radiogroup"` to align with keyboard expectations.
**Action:** Always use `aria-pressed` combined with static `aria-label` for toggles, and use `aria-pressed` for simple segmented controls.
