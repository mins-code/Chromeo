## 2024-05-23 - React.memo for Time-Sensitive Lists
**Learning:** Components that update on a timer (like `WeekView` updating `currentTime`) trigger full re-renders of all children. Even if child components are `React.memo`ized, passing a new object literal (like `style={{...}}`) or an inline function prop breaks the memoization.
**Action:** Extract list items into a separate `React.memo` component (`TaskBlock`) and move style calculations inside it using `useMemo` to ensure stability even when the parent re-renders due to time updates.

## 2026-01-14 - Prevent Parent Re-renders from Child Effects
**Learning:** Pushing derived state (like `visibleTags`) from a child (`CalendarView`) to a parent (`App`) via `useEffect` triggers expensive root re-renders, even if the data content hasn't changed, because `useMemo` returns new references.
**Action:** Use a `useRef` in the child to track the previous value and only invoke the parent callback if the content (deep equality) has actually changed.

## 2025-01-28 - Unused Code Deletion Risks
**Learning:** Removing seemingly unused code (like `sortedTodoTasks` in `App.tsx`) during optimization can be flagged as unsafe if strict verification (tests) is missing, even if local `grep` shows no usage.
**Action:** Focus strictly on optimizing the existing hot path (e.g., pre-calculating sort scores) and avoid deleting legacy code in the same PR unless explicitly requested or verified by a full test suite.
