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

## 2026-02-14 - Recurrence Calculation Accuracy vs Performance
**Learning:** Using simple math (e.g. `Math.ceil(diff / 24h)`) for date recurrence is fast but error-prone (e.g. DST transitions or same-day time differences), leading to bugs where tasks don't appear. `date-fns` `differenceInCalendarDays` is robust but slightly slower.
**Action:** Prioritize correctness for core logic like calendar recurrence. Mitigate performance cost by optimizing the algorithm structure (e.g., "jumping" to valid days using `addDays` instead of iterating every day) rather than using unsafe micro-optimizations.

## 2026-02-17 - Inline Edit Form Performance
**Learning:** Storing form state (e.g. `editDesc`, `editAmount`) in a parent list component triggers a re-render of the entire list (and all children) on every keystroke. This O(N) re-render cost makes typing laggy in large lists.
**Action:** Extract the edit form into a separate component (`TransactionEditRow`) that manages its own local state. The parent list only tracks *which* item is being edited, so typing only re-renders the single row being modified.
## 2026-03-01 - Optimizing Date Formatting in Lists
**Learning:** `new Date().toLocaleDateString()` and `toLocaleTimeString()` are significantly slower (6.3x in benchmark) than `date-fns` `format()` for standard formats, due to `Intl` overhead and object creation. In long lists like `TransactionList`, this adds up to measurable lag.
**Action:** Prefer `date-fns` `format` for list items where locale-specific flexibility is not critical, or cache `Intl` formatters if locale support is needed.

## 2026-03-03 - Optimizing Date Parsing for Sorting
**Learning:** `new Date(dateStr).getTime()` creates a full Date object just to extract the timestamp, adding unnecessary memory allocation and garbage collection overhead. In functions called frequently (like sorting algorithms iterating over thousands of items in `taskScoring.ts`), this is a measurable bottleneck.
**Action:** Use `Date.parse(dateStr)` when only the timestamp is needed. Benchmark shows this avoids object creation and improves date parsing time by ~30% for ISO-8601 strings.

## 2024-05-25 - Schwartzian Transform for Task Sorting
**Learning:** Using `Array.sort((a, b) => expensiveFn(b) - expensiveFn(a))` executes the expensive function O(N log N) times. When sorting tasks by dynamically calculated urgency scores, this causes significant performance overhead in list rendering.
**Action:** Use a map-sort-map approach (Schwartzian transform) to compute and cache the properties in an initial O(N) pass before sorting. This avoids redundant executions of the expensive calculation during the sort comparison phase.
