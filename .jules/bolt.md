## 2024-05-23 - Calendar Optimization
**Learning:** React render loops that filter a large dataset for every cell (like a calendar grid) are O(N*M). Inverting the control flow to bucket items into cells (Index Inversion) reduces this to O(N + M).
**Action:** When optimizing grids or lists, look for `.filter` inside `.map` and refactor to pre-compute a lookup Map or Object.
