## 2024-05-15 - Segmented Controls Accessibility
**Learning:** Segmented controls implemented as standard buttons without arrow-key navigation logic must NOT use role="radiogroup" and role="radio". This breaks screen reader keyboard expectations.
**Action:** Use a wrapper with role="group" and aria-pressed={isActive} on the active button to properly communicate selection semantics. Dropdown toggles within these controls must also explicitly define aria-expanded and aria-haspopup attributes.
