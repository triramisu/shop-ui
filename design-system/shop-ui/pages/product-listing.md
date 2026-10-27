# Product Listing Page — implementation contract

Historical editorial contract. The active 23/10/2026 visual override is now
`retail.md` (user requested Coolmate-inspired retail); keep the functional
URL, price, modal and ownership contracts below.

Read ../MASTER.md first. This page adapts the skill to a Vietnamese electronics
storefront without claiming inventory, discounts, reviews or delivery policies
that the backend does not provide.

## Active visual override — editorial revision

The user explicitly chose “Biên tập cao cấp, nhiều khoảng thở” on 2026-10-16.
This supersedes the green PLP palette/font/layout decisions in MASTER.md, not
the catalog contracts, accessibility requirements or state behavior below.

- Palette: ivory `#F8F6F1`, charcoal `#292C27`, muted `#68665E`, terracotta
  accent `#A8442C`, quiet image surface `#F0EDE7`. Dark theme is authored and
  checked separately; no color inversion of product images.
- Typography: self-hosted **Lora normal + true italic 400–600** for editorial
  headings; reuse existing **Be Vietnam Pro** for product names and controls.
  Local google-fonts.csv verifies Vietnamese coverage for Lora. This pairing
  is an authored adaptation, not a claim that it is the exact E-commerce CSV row.
  Lora font files come from Google Fonts, with `public/fonts/lora-OFL.txt`.
- Reference decisions: typography.csv “Classic Elegant” supports serif/sans
  hierarchy for premium e-commerce; Lora metadata supports editorial use and
  Vietnamese. Minimalism & Swiss Style contributes restraint and whitespace,
  not a pasted template. The skill explicitly excludes Exaggerated Minimalism
  for e-commerce catalogs, so avoid giant type/empty space that buries products.
- Layout: asymmetric editorial image/text introduction and collection caption;
  compact search/sort row; open product cards with quiet image panels, restrained
  borders and no lifting card shadows. Desktop filters remain discoverable.
  Mobile hides the nonessential hero illustration to prioritize the catalog.
- Scope: listing plus its own shared frame via `site-shell--editorial`, including
  header/footer palette only on `/products` (also trailing-slash URL). Homepage,
  product detail, auth, checkout and backend behavior remain unchanged.
- Preserve original image attribution. Hero is an editorial illustration, never
  substituted for a real catalog item. Existing font assets/licenses remain.

## Functional contract (unchanged)

1. **Scope:** `/products`, real catalog listing/search/category/sort/pagination,
   grid/list presentation, saved product IDs, mobile filter dialog. Keep `/`
   homepage and all existing customer flows. No backend mutation or UI admin.
2. **Contracts:** existing public Catalog API, React Query, Router and local
   saved-items store. Only CREATED_AT/NAME sorts, category and keyword are
   exposed. No misleading price, brand or in-stock filters. Product links lead
   to SKU choice instead of silently choosing a variant for add-to-cart.
3. **State:** URL is committed filter/page/view source of truth; category/search/
   sort reset page, view does not. Mobile controls are a draft: dismiss cancels,
   apply commits atomically. Reset removes filters, retains sort/view. Page
   size 12, zero-based URL page bounded 0–10000; malformed URL values normalize.
4. **Safety/UX:** accessible native modal with Escape/focus return; no hover-only
   actions, reduced motion, loading/error/empty/out-of-range recovery, aborted
   stale requests, no private data or fabricated catalog fixtures. Images and
   prices come from server; no cross-currency minimum price comparison.
5. **Outputs:** dedicated React page/components, scoped CSS/tokens/font assets,
   URL/price/pagination helpers and Node tests, navigation links, this design
   record and README. No new runtime dependency or Python setup.
6. **Acceptance:** filters survive reload/back; chips remove one filter; list/
   grid retain page; unavailable category API has retry; no products/fetch
   failure has a recovery action; save state is announced; 375/768/1440 and
   landscape fit; dialog closes with Escape and restores focus. No financial
   action is required for verification.
7. **Verification:** npm test / TypeScript / Vite build, git diff --check,
   browser QA with the pre-existing isolated QA catalog. Main shop catalog
   remains unseeded. Accessibility checks are scoped, not a conformance claim.
8. **Rollout/rollback:** source changes local only, no GitHub push/deploy.
   Backend contract is unchanged; roll back the UI artifact if needed. Keep
   user-installed `.agents/` skills and existing app assets/data untouched.

## UI-PLP-02 — motion and publication contract (2026-10-18)

1. **Scope:** finish and review the existing editorial PLP, add restrained
   motion, test/build and publish the reviewed UI changes on its feature
   branch. No merge, deployment, backend edits, payment or catalog mutations.
2. **Ownership/dependencies:** React 18 / existing CSS and SVG system; reuse
   the active editorial design above. No animation package or Python setup.
   The pre-publication audit permits a same-major React Router security
   update (6.28.0 → 6.30.6) with its lockfile and navigation regression.
3. **Behavior:** saved state and URL filters update immediately. Motion is
   cosmetic, interruptible and never required to finish an interaction.
   Keep the native dialog's immediate Escape/dismiss and focus restoration.
4. **Accessibility/performance:** opt-in CSS motion only when the user has
   no reduced-motion preference. Save feedback cancels on repeated actions,
   preference changes and unmount; unsupported animation APIs fail quietly.
   Only transform/opacity; no scroll-jacking, infinite decorative animation,
   hidden-until-JS content or image entrance that delays catalog visibility.
5. **Outputs:** scoped motion tokens/keyframes, testable save-feedback
   controller, component wiring, regression tests, updated design record/README.
   Preserve pre-existing UI work; never stage installed `.agents/` skills,
   secrets, build output, logs or unrelated backend changes.
6. **Acceptance:** saving/un-saving and rapid input retain the final semantic
   state; modal apply/cancel, search/sort/view, keyboard use and mobile layout
   remain usable. Verify light/dark, small-screen and landscape layouts.
7. **Gate:** npm test, TypeScript, Vite production build, diff/secret review,
   browser QA. Clearly label API fixtures versus an actual backend; neither
   UI motion nor a successful build proves payment/cloud integration.
8. **Rollout/rollback:** push UI source only after checks on the existing
   `codex/shop-ui-product-listing` branch. This explicit user continuation
   supersedes the earlier local-only scope for this UI publication task.
   No push to main, force-push, backend push or deploy. Roll back a later
   release using the prior UI artifact; do not reset the user's worktree.

Skill guidance used: ux-guidelines.csv rows 8 (Duration Timing), 9 (Reduced
Motion), 99 (Motion Sensitivity), Quick Reference Animation/cancellable state
transitions; React stack row 6 (effect cleanup). The project's React 18 APIs
are kept; the dataset's React 19 version note is not treated as an upgrade.

## Previous green PLP baseline verification

- 2026-10-16: TypeScript, 18/18 Node tests (12 listing + 6 session/cache), Vite
  production build and git diff --check passed. No Python or new dependency.
- Existing isolated QA API: 8 products and real image endpoints. Audio category
  returns 3; combined keyword “tai nghe” returns 2; NAME:ASC produces Loa,
  Soundcore, Ugreen. Search/category/sort/view survive reload and browser Back.
- Mobile draft does not change URL until Apply; Escape in the keyword input
  closes the dialog, cancels draft and restores trigger focus. Body scroll lock
  is released on close. Save/un-save announces state and original saved IDs
  were restored after verification.
- No horizontal overflow at 375×812, 768×1024, 812×375 or 1440×1000. Landscape
  dialog stays within viewport with scrollable content and reachable actions.
  Light/dark observed; fonts/image assets load from local/QA sources.
- Empty main catalog, no-match search and out-of-range page recovery observed.
  “Về trang đầu” removes page and focuses results heading. A separate temporary
  dev proxy with unavailable upstream verifies errors/retry retain filters;
  the real backend is not interrupted.
- Main text/light 9.23:1, muted/white 7.58:1, light CTA 9.72:1, black/primary
  hover 5.57:1; dark text 16.15:1, dark muted 9.07:1, dark CTA 9.68:1.
  Control-border ratios 3.97:1 light / 5.39:1 dark. These are token-pair checks,
  not a full accessibility audit.
- Limitations: QA has fewer than 12 items, so multi-page navigation is covered
  by helper tests, not a live multi-page catalog. Reduced-motion CSS and JS
  branches reviewed, but no OS/browser reduced-motion emulation was available.
  No screen-reader certification, backend regression, payment or deploy claim.

## Editorial revision verification

- Final TypeScript, 18/18 Node tests, Vite production build and diff whitespace
  check pass. No runtime dependency, Python installation, backend change,
  payment request, GitHub push or deployment in this revision.
- On the existing isolated QA API: audio filter returns 3, NAME:ASC orders Loa,
  Soundcore, Ugreen; keyword “tai nghe” returns 2. Grid/list works, Back/reload
  preserves criteria, native dialog Apply commits category/keyword atomically.
  Escape cancels a draft and restores trigger focus; scroll lock releases.
- Observed 375×812, 768×1024, 812×375 and 1440×1000 without horizontal overflow.
  In landscape the 343px-high dialog scrolls, with its action row visible in
  the 375px viewport. Mobile product titles/search text are 16px; save targets
  measure 44×44px. Light and dark themes were inspected independently.
- Lora normal/italic are loaded from local WOFF2 assets, including Vietnamese.
  Current palette token ratios: ink/ivory 13.10:1, muted/ivory 5.33:1, accent/
  ivory 5.51:1, light CTA 14.15:1, control boundary/ivory 3.37:1. Dark ink 14.64:1,
  muted 8.77:1, accent 8.55:1 and CTA 12.42:1. These replace the prior palette
  measurements above; they are not a screen-reader or WCAG certification.
- No-match search has a working reset. A product link opens the real detail;
  the editorial frame is removed there and on the unchanged homepage. The
  `/products/` trailing-slash URL also receives the correct listing frame.
- Limitations remain: only 8 QA items, not a live multi-page catalog; no OS
  reduced-motion emulation, LCP benchmark or new full backend regression. CSS
  and JS reduced-motion handling remain present. No auth/checkout/payment
  behavior was changed or re-certified by this visual revision.

## UI-PLP-02 verification — 2026-10-18

- 26/26 Node tests, TypeScript/Vite production build and whitespace check
  pass. Eight new tests cover finite transform-only feedback, save/un-save
  timing, interruption, initial/live reduced motion, disposal, unsupported
  animation and errors. No state transition waits on an animation event.
- CSS opt-in arrival for hero copy/caption, native dialog/backdrop and toast;
  real images stay visible. Save feedback uses Web Animations with effect
  cleanup. Mouse-only image zoom avoids sticky hover states on touch devices.
- Removing a listing hash while changing filters no longer forces a scroll
  to the hero. Route-change scrolling still resets for an actual new page,
  with canceled requestAnimationFrame work on cleanup.
- On actual isolated QA APIs: 8 existing products; audio category has 3,
  keyword “tai nghe” has 2. Save/un-save restored original saved IDs; filter,
  sort, grid/list, Back/reload, no-match recovery and detail/login routing
  checked. No authentication, checkout or payment request was submitted.
- 375×812, 768×1024, 812×375, 1440×1000 fit horizontally. Light/dark inspected;
  save target is 44px. Landscape panel settles at top 16px / bottom 359.2px
  in a 375px viewport; its Apply row stays reachable. Native Escape restores
  the trigger, updates aria-expanded and releases scroll lock immediately.
- QA startup applied existing Flyway V25 to `shop_ui_qa_20261015` only. No
  catalog seeding, image deletion or main `shop` data mutation. QA uses MinIO
  and payment none/refund off; not AWS, payment or backend regression evidence.
- Router 6.30.6 / core 1.23.4 installed, not v7. Runtime audit high threshold
  passes but still reports two moderate findings; see README security gate.
  No claim of zero vulnerabilities or production readiness.
- Limitations: 8 QA products, no live multi-page catalog; reduced-motion JS
  unit-tested and CSS reviewed, no OS/browser preference emulation. No full
  screen-reader, Core Web Vitals, CI or deployment certification.

Implementation references: [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate),
[reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion),
[React effect cleanup](https://react.dev/reference/react/useEffect).
