# Aydibro — photo-led storefront, 27/10/2026

This is the active visual contract for the shared frame, homepage, listing,
detail, auth and purchase surfaces. It supersedes the 23/10 retail override.

Source skill: `.agents/skills/idk/SKILL.md` (A-dam reference). Inspiration:
https://belledonne.com/en — photography, restrained navigation, flat product
grids and editorial rhythm, not its assets, copy, code or sneaker identity.

- Brand stays Aydibro and audio. Do not invent delivery/returns promises,
  discounts, reviews, stock counts, product specs or a working newsletter.
- Light canvas #fdfdfb, photo planes #f3f3f1, primary navy #000e1f, hairlines
  #e1e2e2, cobalt #0000c5 limited to the announcement bar and focus indicator.
- Cards are square, shadowless and photo-first. Actions/inputs use 30px pills.
- Use self-hosted Be Vietnam Pro for Vietnamese coverage, a deliberate local
  adaptation rather than claiming GT Walsheim Pro is licensed/installed.
- Full-bleed original campaign image, quiet type, centered wordmark. A small
  photographic scrim protects text readability across crops; it is not a UI
  gradient treatment. Keep real product photography exclusively API-owned.
- Home: 4/3/2 product columns at desktop/tablet/mobile, 8 recently added items.
  A separate home query key prevents collision with the 12-item listing cache.
- Old home filter URLs redirect to the canonical listing with query preserved.
  Listing keeps category/sort/page/view/search, draft filter dialog and save
  feedback. Category navigation labels shorten only display copy; IDs, names
  in catalog records and DEMO product disclosure remain unchanged.
- Native search/menu dialogs provide focus containment, Escape and focus return.
  Menu closes on navigation/desktop resize; closed dialogs must stay display:none
  even when legacy CSS contains mobile-navigation rules.
- Commerce refinement27/10: native product-image lightbox; per-variant prices,
  related items from the same live category, auth tabs, and a purchase progress
  indicator that never claims an order/payment is confirmed. Keep source data
  and existing mutations authoritative. Body/product text takes priority over
  tiny fashion-style type on small screens.
- 44px control targets, explicit labels, visible focus, reduced motion. No
  auto-carousel, scroll-jacking, fake reviews or floating sales popups.
- Dark tokens are separately mapped. Product image planes stay light to avoid
  distorting product photography. No external fonts, runtime packages or trackers.
- Banner assets: private S3 UI bucket → CloudFront OAC → browser. Product
  storage: private app → existing S3 Gateway Endpoint → S3 product bucket.
  A browser does not route through the VPC endpoint.

Implementation and actual gates are recorded in `docs/editorial-storefront.md`;
this file does not imply production rollout or complete accessibility certification.
