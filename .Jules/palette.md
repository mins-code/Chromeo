# Palette's Journal 🎨

## 2024-05-23 - Accessible Card Patterns
**Learning:** "Clickable Cards" are a common UX pattern but difficult to make accessible when they contain other interactive elements (like buttons). Nesting `<button>` inside a container `<button>` is invalid HTML.
**Action:** Instead of making the container a button, use `cursor-pointer` on the container for mouse users, but wrap the *primary text content* (e.g., the Title) in a `<button>` for keyboard users. This provides a clear, distinct tab target for the "main action" without creating invalid DOM structures or trapping focus.
