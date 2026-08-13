## 1. New top nav component

- [x] 1.1 Create `src/components/shared/TopNav.tsx`: reuse the `navItems` array (首页 → `/`, 设置 → `/settings`) and `usePathname()`-driven active-state logic from `BottomNav.tsx`, laid out as a horizontal bar (logo/wordmark left, nav items alongside), full width, with a bottom border.
- [x] 1.2 Delete `src/components/shared/BottomNav.tsx`.

## 2. Root layout update

- [x] 2.1 In `src/app/layout.tsx`, replace the `<BottomNav />` import/usage with `<TopNav />`, and reorder so the nav renders before `<main>` in document flow (not fixed).
- [x] 2.2 Remove `pb-20` from the `<main>` element's className since there's no more fixed bottom bar to clear.

## 3. Floating AI button offset fix

- [x] 3.1 In `src/components/ai/AiToggleButton.tsx`, change the `bottom-36` offset (sized to clear the old bottom nav) to a standard corner offset (e.g. `bottom-4`) with no nav-bar clearance assumption.

## 4. Verification

- [x] 4.1 Run `npm run build` and `npm run lint` — confirm no errors introduced.
- [x] 4.2 Manually load `/`, `/settings`, `/cards/[id]`, and `/admin/transactions` in the running dev server; confirm the top nav renders on each, active-state highlighting is correct for `/` and `/settings`, and no leftover bottom-bar spacing or overlap with the AI sidebar/toggle button.
- [x] 4.3 Confirm no automated frontend test coverage is expected for this change (frontend TDD is out of scope per project convention) — verification is manual only.
