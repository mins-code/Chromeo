## 2026-05-17 - Accessible Segmented Controls
**Learning:** Segmented controls implemented as standard buttons without arrow-key navigation logic must not use 'role=radiogroup'. Instead, they require 'role=group' on the wrapper and 'aria-pressed' on the active button to properly communicate selection semantics to screen readers. Additionally, dropdown toggles must define 'aria-expanded' and 'aria-haspopup'.
**Action:** Always use 'role=group' + 'aria-pressed' for simple segmented control buttons, and add explicit popup attributes for dropdown toggles within them.
