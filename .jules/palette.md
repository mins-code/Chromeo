
## 2025-03-09 - Alert/Status ARIA Roles & Popup Attributes
**Learning:** Screen readers won't automatically announce dynamic error or success messages (like the ones in Auth.tsx) unless explicitly told to. Also, menu buttons (like the Layout Create button) need explicit `aria-haspopup` and `aria-expanded` attributes to properly convey their state and functionality.
**Action:** Always add `role="alert"` for error messages, `role="status"` for success messages, and `aria-haspopup`/`aria-expanded` attributes on interactive toggle buttons that control dropdown menus.
