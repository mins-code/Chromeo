## 2024-05-24 - Input Component Accessibility
**Learning:** The `Input` component was rendering error messages but lacked `aria-invalid` and `aria-describedby` attributes, which are critical for screen readers to associate the error with the input field. Also, the password toggle in `Auth` had `tabIndex={-1}`, creating a keyboard trap/exclusion.
**Action:** Always verify form components include these ARIA attributes and that interactive elements are keyboard accessible (avoid `tabIndex={-1}` unless necessary).
