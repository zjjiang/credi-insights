## ADDED Requirements

### Requirement: Persistent top navigation bar
The system SHALL render a persistent navigation bar at the top of every page, positioned in normal document flow above the page content (not fixed/floating), spanning the full viewport width, with a bottom border separating it from the content area below.

#### Scenario: Nav bar renders on every route
- **WHEN** a user loads any page in the app (e.g. `/`, `/settings`, `/cards/[id]`, `/admin/transactions`)
- **THEN** the top navigation bar is visible at the top of the viewport above the page's own content

#### Scenario: No fixed-bottom nav remains
- **WHEN** a user views any page
- **THEN** no navigation element is fixed to the bottom of the viewport, and the page content is not padded to reserve space for one

### Requirement: Nav item set and active-state indication
The navigation bar SHALL display exactly the same two entries available today — 首页 (Home, linking to `/`) and 设置 (Settings, linking to `/settings`) — and SHALL visually indicate which entry corresponds to the current route.

#### Scenario: Home is marked active on the home route
- **WHEN** the current route is `/`
- **THEN** the 首页 nav item is styled as active and the 设置 nav item is not

#### Scenario: Settings is marked active on the settings route
- **WHEN** the current route is `/settings`
- **THEN** the 设置 nav item is styled as active and the 首页 nav item is not

#### Scenario: Neither item is marked active on unrelated routes
- **WHEN** the current route is `/cards/[id]` or `/admin/transactions`
- **THEN** neither 首页 nor 设置 is styled as active

### Requirement: No narrow-viewport adaptation
The navigation bar SHALL render identically regardless of viewport width. The system SHALL NOT provide a collapsed, hamburger-menu, or alternate-layout presentation for narrow viewports as part of this capability.

#### Scenario: Narrow viewport shows the same top bar
- **WHEN** the viewport width is at a typical mobile width (e.g. 375px)
- **THEN** the same top navigation bar (logo + nav items) is rendered, with no alternate mobile-specific nav pattern substituted
