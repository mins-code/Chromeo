## 2026-04-17 - Add ARIA expanded and haspopup to dropdowns
**Learning:** Buttons that control dropdown menus (such as the Layout 'Create' menu) must include dynamic `aria-expanded` and `aria-haspopup='true'` attributes for proper screen reader accessibility.
**Action:** Always include `aria-haspopup="true"` and `aria-expanded={isOpen}` on buttons that toggle dropdown menus.
