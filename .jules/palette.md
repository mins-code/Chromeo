## 2026-05-07 - Dynamic ARIA labels for theme toggles
**Learning:** Theme toggle buttons should dynamically update their accessible labels to describe the action that will happen when clicked, rather than a static label. This improves screen reader experience.
**Action:** Always use dynamic labels (e.g. `aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}`) for toggle buttons.
