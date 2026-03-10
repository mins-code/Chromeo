## 2024-05-18 - Optimized Array Operations in React JSX
**Learning:** In React components with complex list rendering (like `BudgetPlanner.tsx`), chaining `.filter().reduce()` directly inside `useMemo` blocks or worse, directly inside JSX attributes, causes severe `O(N)` penalties because it forces multiple redundant iterations over the same array and excessive garbage collection from intermediate arrays.
**Action:** Extract deeply nested mathematical calculations out of JSX and into a single `useMemo` hook that iterates over the source array precisely once using a `for` loop, categorizing or calculating all necessary values concurrently.

