## 2024-05-24 - Required Form Fields Indicator
**Learning:** For forms in this project, explicitly showing an asterisk (*) with `aria-hidden="true"` when fields are functionally required improves accessibility and UX, as screen readers naturally announce the required state natively through the input attributes, avoiding redundant "star" announcements.
**Action:** Always append an asterisk to the label when `required` is true for inputs, and ensure it has `aria-hidden="true"`.
