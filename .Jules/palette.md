# Palette's Journal

## 2025-05-18 - Missing ARIA labels in core components
**Learning:** Core interactive components like `TaskCard` rely heavily on iconography without text alternatives. This makes the primary action (completing a task) and secondary actions (AI analysis, editing) inaccessible to screen reader users. The "Good UX" code pattern for `Button` is defined but not consistently used or doesn't cover raw `button` usages.
**Action:** When creating icon-only buttons, always ask "What would a screen reader say?" and enforce `aria-label` or `title` (though `aria-label` is preferred for actions).
