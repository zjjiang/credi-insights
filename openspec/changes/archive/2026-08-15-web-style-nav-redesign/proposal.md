## Why

The app currently uses a mobile-first bottom tab bar (`BottomNav`) fixed to the viewport bottom on every page. The product is being used and developed primarily on desktop/wide viewports now, and the bottom-bar pattern reads as mobile-app chrome rather than a web app. Moving navigation to a persistent top bar makes the app feel native to the desktop context it's actually used in.

## What Changes

- Replace the fixed-bottom `BottomNav` component with a persistent top horizontal nav bar rendered in the root layout.
- Top bar layout: logo/brand mark on the left, nav items (首页/Home, 设置/Settings) alongside or after it, spanning the full viewport width, with a bottom border separating it from page content.
- Remove the bottom-bar-specific content padding (`pb-20` in `src/app/layout.tsx`) since content no longer needs to clear a fixed bottom element; content instead sits directly below the top bar.
- Nav item set stays the same as today (首页, 设置) — no new entries added in this change.
- **BREAKING**: No responsive/narrow-viewport handling is included. The top bar is not designed to collapse or adapt below a certain width in this change; mobile/narrow-screen users will see the same top bar without a fallback pattern (e.g. no hamburger menu). This is an explicit, accepted scope cut for this change, not an oversight — narrow-viewport nav is left for a future change if needed.

## Capabilities

### New Capabilities
- `app-navigation`: Defines the persistent navigation chrome for the app (structure, placement, active-state behavior, viewport scope) — previously implicit in the `BottomNav` component with no corresponding spec.

### Modified Capabilities
(none — no existing specs cover navigation today)

## Impact

- `src/components/shared/BottomNav.tsx` — replaced by a new top nav component (e.g. `src/components/shared/TopNav.tsx`).
- `src/app/layout.tsx` — swap `<BottomNav />` for the new top nav component; remove `pb-20` from the `<main>` wrapper; adjust `<main>` layout if the top bar needs a fixed/sticky position with corresponding top padding or a flex-column structure instead.
- No API, database, or route changes. No changes to `/cards`, `/cards/[id]`, `/admin/transactions`, or other pages beyond what's rendered around them by the root layout.
- No new nav entries — pages not currently in the bottom bar (`/cards`, `/cards/[id]`, `/admin/transactions`) remain reachable only via in-page navigation, same as today.
