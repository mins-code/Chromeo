## 2026-04-16 - [Layout Buttons Accessibility]
**Learning:** Found multiple icon-only and menu buttons in the Layout component missing correct `aria-label`, `title`, or dynamic `aria-expanded`/`aria-haspopup` attributes, which are essential for screen reader users and tooltips.
**Action:** Added dynamic `aria-label`s reflecting the specific action that will occur (e.g., "Switch to dark theme"), and added `aria-haspopup="true"` and `aria-expanded={showCreateMenu}` to dropdown buttons. Checked both desktop and mobile views for consistency.
