
## 2024-04-18 - Dynamic ARIA labels for state-toggling buttons
**Learning:** Static ARIA labels like "Toggle theme" on icon-only buttons do not adequately convey the *action* that will result from clicking.
**Action:** When implementing theme toggle buttons, ensure the `aria-label` dynamically reflects the action that will be taken (e.g., 'Switch to light theme' or 'Switch to dark theme') rather than just describing the button, to improve screen reader accessibility. Also ensure that secondary/mobile versions of the same button have consistent accessible labels.
