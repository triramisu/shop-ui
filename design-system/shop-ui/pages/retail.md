# Aydibro retail — active override, 23/10/2026

Historical override. The active visual direction from 27/10/2026 is
[editorial-storefront.md](editorial-storefront.md).

Read MASTER.md first. The user's new Coolmate-inspired direction supersedes
the old ivory/serif PLP-only revision. Keep its historical record, not its
active visual scope. This override applies to homepage, PLP and shared frame;
auth/checkout/order contracts and API ownership remain unchanged.

- Pattern: product-first retail, full-width split campaign, category shortcuts,
  clean grids, visible variant CTA, supporting collection photography.
- Brand: Aydibro, never Coolmate. White/ink/clay; dark theme separately mapped.
  Campaign dark #222722, warm image panel, white CTA, peach headline accent.
- Type: local Be Vietnam Pro, 700–800 headings and 400–600 controls. No external
  font request or new package. 4/8px rhythm, restrained 6px corners/pill actions.
- Product photos/prices/categories are server-owned; no rating/sale/stock fiction.
  DEMO names stay visible. No invented swatches: choose real SKU on detail.
- CSS semantic roles in retail.css map primitive colors to component aliases.
  Existing PLP state/dialog/pagination code and reduced-motion/save behavior stay.
- No auto-carousel or scroll-jacking. Hero headline/CTA have one finite entrance;
  product images are never hidden behind animation. Reduced-motion disables it.
- Mobile keeps header/category navigation reachable, 44px targets and a scrollable
  filter dialog. Menu Escape restores focus; resize to desktop closes the menu.
- Actual gate/results are recorded in docs/retail-refresh.md and README, not
  inferred from this design file. No claim of production release until CI/deploy.
