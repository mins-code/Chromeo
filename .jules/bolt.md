# Bolt's Journal

## 2024-05-22 - [Initial Setup]
**Learning:** Performance journaling established.
**Action:** Use this to record unique insights.

## 2024-05-22 - [Broken Environment]
**Learning:** `pnpm lint` is broken due to mismatch between `eslint.config.js` (flat config) and `package.json` scripts (legacy CLI flags), plus missing `@eslint/js` dependency. Also `tsc` reports existing type errors.
**Action:** Rely on `tsc` for type checking new changes, ignoring existing errors. Focus on manual code verification for logic.
