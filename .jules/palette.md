
## 2026-05-03 - Missing ARIA Labels on Icon-only Tooltips
**Learning:** Icon-only buttons across the app often rely solely on the `title` attribute for tooltips, but miss the essential `aria-label` attribute required for screen reader accessibility.
**Action:** Always ensure `aria-label` is explicitly defined alongside or instead of `title` for icon-only buttons to ensure proper accessibility.
