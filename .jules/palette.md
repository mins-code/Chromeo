
## $(date +%Y-%m-%d) - Segmented Control Accessibility
**Learning:** Segmented controls (like view toggles) implemented as standard buttons without arrow-key navigation logic must NOT use `role='radiogroup'` and `role='radio'`. Instead, using a wrapper with `role='group'` and `aria-pressed={isActive}` correctly communicates selection semantics to screen readers without breaking keyboard expectations. Also, dropdown toggles within these controls need explicit `aria-expanded` and `aria-haspopup` attributes.
**Action:** Always use `role="group"` and `aria-pressed` for simple view toggle buttons. Ensure any dropdown toggles within these groups also properly broadcast their expanded state and popup type.
