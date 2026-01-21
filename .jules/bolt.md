## 2024-05-23 - React.memo for Time-Sensitive Lists
**Learning:** Components that update on a timer (like `WeekView` updating `currentTime`) trigger full re-renders of all children. Even if child components are `React.memo`ized, passing a new object literal (like `style={{...}}`) or an inline function prop breaks the memoization.
**Action:** Extract list items into a separate `React.memo` component (`TaskBlock`) and move style calculations inside it using `useMemo` to ensure stability even when the parent re-renders due to time updates.

## 2026-01-14 - Prevent Parent Re-renders from Child Effects
**Learning:** Pushing derived state (like `visibleTags`) from a child (`CalendarView`) to a parent (`App`) via `useEffect` triggers expensive root re-renders, even if the data content hasn't changed, because `useMemo` returns new references.
**Action:** Use a `useRef` in the child to track the previous value and only invoke the parent callback if the content (deep equality) has actually changed.

## 2025-01-28 - Unused Code Deletion Risks
**Learning:** Removing seemingly unused code (like `sortedTodoTasks` in `App.tsx`) during optimization can be flagged as unsafe if strict verification (tests) is missing, even if local `grep` shows no usage.
**Action:** Focus strictly on optimizing the existing hot path (e.g., pre-calculating sort scores) and avoid deleting legacy code in the same PR unless explicitly requested or verified by a full test suite.
## 2024-05-23 - Calendar Filter Optimization
**Learning:** In large React components like `CalendarView`, inline array filtering (e.g., `tasks.filter(...)`) inside the render body can be a silent performance killer. Even if the array itself is stable, the filtering runs on *every* render (e.g., when hovering or dragging), causing downstream components to re-render if they receive the filtered array as a prop, or simply wasting CPU cycles.
**Action:** Always wrap expensive or array-returning transformations in `useMemo` when they depend on state or props, especially in interactive views like calendars or grids.

## 2026-02-12 - Isolate High-Frequency Timers
**Learning:** High-frequency timers (like `currentTime` updating every minute in a calendar) in large parent components (like `WeekView`) trigger expensive re-renders of the entire component tree, including the DOM reconciliation of static grid layouts.
**Action:** Isolate the timer and the visual element dependent on it into a small, separate component (e.g., `CurrentTimeIndicator`) so only that leaf component re-renders.
