## 2024-05-27 - Accessible Required Field Asterisks
**Learning:** When displaying an asterisk to indicate a required field, it is important to hide it from screen readers using `aria-hidden="true"`, as the `required` attribute on the input natively conveys this state. Otherwise, screen readers redundantly announce "star".
**Action:** Always wrap visual required asterisks in `<span aria-hidden="true">*</span>`.
