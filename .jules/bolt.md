## 2024-05-23 - React.memo for Time-Sensitive Lists
**Learning:** Components that update on a timer (like `WeekView` updating `currentTime`) trigger full re-renders of all children. Even if child components are `React.memo`ized, passing a new object literal (like `style={{...}}`) or an inline function prop breaks the memoization.
**Action:** Extract list items into a separate `React.memo` component (`TaskBlock`) and move style calculations inside it using `useMemo` to ensure stability even when the parent re-renders due to time updates.
