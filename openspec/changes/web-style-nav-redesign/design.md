## Context

Navigation today is a single component, `src/components/shared/BottomNav.tsx`, rendered unconditionally in the root layout (`src/app/layout.tsx:30`) with `fixed bottom-0 left-0 right-0`. `<main>` carries `pb-20` (`layout.tsx:29`) to keep content clear of the fixed bar's `h-16` height plus safe margin. There are no nested/section layouts anywhere else in `src/app` — every page builds its own local header markup inline, and the root layout is the only place nav-adjacent chrome lives.

Two nav items exist today: 首页 (`/`) and 设置 (`/settings`), driven by a hardcoded `navItems` array (`BottomNav.tsx:7-10`) with active-state detection via `usePathname()`.

One incidental coupling was found during investigation: `src/components/ai/AiToggleButton.tsx:12` is positioned `fixed bottom-36 right-4` — the `bottom-36` offset exists specifically to clear the bottom nav bar's height. Removing the bottom nav orphans that offset.

## Goals / Non-Goals

**Goals:**
- Replace the fixed-bottom nav with a persistent top horizontal bar: logo left, nav items alongside, full viewport width, bottom border separating it from content.
- Preserve today's two nav items and their active-state behavior — no new entries, no removed entries.
- Remove the `pb-20` bottom-clearance padding on `<main>` since there's no more fixed bottom element to clear.
- Reposition `AiToggleButton` so it no longer assumes a bottom nav bar is present.

**Non-Goals:**
- No responsive/narrow-viewport adaptation (no hamburger menu, no collapse-to-bottom-bar-on-mobile fallback). The top bar renders the same way regardless of viewport width in this change.
- No new nav entries (e.g. no `/cards` or admin link added to nav yet) — that's a separate, later decision.
- No visual redesign of individual pages beyond the shared layout chrome (top bar + main content area).

## Decisions

**Top bar as a new component, not a modified `BottomNav`.**
Rename/replace rather than retrofit: `src/components/shared/BottomNav.tsx` is deleted, `src/components/shared/TopNav.tsx` is added. The internal shape (nav items array, `usePathname()`-driven active state, `Link` per item) is reused almost as-is — only the outer `<nav>` positioning and item layout (icon+label stacked vertically → icon+label inline horizontally, or label-only) change. Keeping it a distinct file/component (rather than mutating `BottomNav` in place) makes the change's diff self-explanatory and avoids a component named `BottomNav` that renders at the top.

**Layout structure: static top bar + content below, not `fixed`+padding-offset.**
Alternative considered: keep the bar `fixed top-0` (mirroring how `BottomNav` was `fixed bottom-0`) and add `pt-16` (or similar) to `<main>` to clear it, keeping the "fixed bar + compensating padding" pattern from the bottom-nav era. Rejected in favor of a normal-flow bar (`<nav>` followed by `<main>` in document order, no `fixed`, no compensating padding) because:
- It's simpler — no magic-number padding to keep in sync with the bar's height.
- A static top bar scrolls out of view with the page only if you scroll past it, which is standard/expected for a top nav (unlike a bottom tab bar, which web users don't expect to scroll away).
- If sticky-on-scroll behavior is wanted later, `sticky top-0` can be added to the `<nav>` without touching `<main>` at all — deferred as a fast-follow if actually needed, not built speculatively now.

**`AiToggleButton` offset: reset to a bottom-right anchor with no nav-clearance offset.**
Since there is no more fixed bottom bar, `bottom-36` has no reason to exist. Change to a plain `bottom-4 right-4` (or similar standard corner offset) matching how such floating-action buttons are placed with no competing chrome. This is a one-line, low-risk edit but called out explicitly so it isn't missed as a side effect of removing `BottomNav`.

## Risks / Trade-offs

- **[Risk] No narrow-viewport fallback** — on a phone-width screen, the top bar will render with whatever horizontal space nav items need; if that doesn't fit, items could wrap or overflow. → **Mitigation**: none in this change, by explicit scope decision (see proposal's BREAKING note). Accepted because current usage is desktop-first; a follow-up change can add a responsive collapse if mobile usage becomes relevant again.
- **[Risk] `AiSidebar`/`AiToggleButton` visual regression** — moving the toggle button's anchor could visually clash with the new top bar or other floating UI if not verified after the change. → **Mitigation**: manual visual check on the running dev server across the main pages (`/`, `/settings`, `/cards/[id]`) as part of task verification, not just a code diff review.
- **[Trade-off] Losing the bottom-bar's larger tap targets** — the vertical icon+label bottom nav gave larger touch targets, which matters less now that narrow-viewport/touch use is explicitly out of scope for this change.

## Migration Plan

1. Add `TopNav.tsx`, remove `BottomNav.tsx`.
2. Update `src/app/layout.tsx`: swap component, restructure `<main>`/`<nav>` ordering, drop `pb-20`.
3. Update `AiToggleButton.tsx` offset.
4. Manual visual check across main pages (no automated UI test exists per project convention — frontend is manually verified, see CLAUDE.md TDD scope).
5. No data/DB/API migration involved — this is presentation-layer only. No rollback plan beyond reverting the commit/PR if the new layout looks wrong; no persisted state changes.

## Open Questions

- Exact top bar visual treatment (height, whether it's `sticky` vs static-in-flow, exact logo/wordmark content) is left to implementation-time judgment within the constraints above — no blocking unknowns.
