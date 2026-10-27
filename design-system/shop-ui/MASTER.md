# Shop UI — E-commerce design system

Active direction (27/10/2026): read [editorial-storefront](pages/editorial-storefront.md).
The user requested a full refresh using the installed `idk` style reference and
Belledonne-inspired photo-led commerce. This supersedes the visual direction
below; its dataset and earlier decisions remain historical provenance.

Current visual direction (23/10/2026): read `pages/retail.md` for the user's
Coolmate-inspired Aydibro refresh. It supersedes the older editorial-only
appearance below while preserving catalog/state/accessibility contracts.

Source: read local `.agents/skills/ui-ux-pro-max/data/` directly using PowerShell
CSV parsing. No Python, Python installation, or CLI-generated result. Project:
**Shop UI**, product category: **E-commerce** (not E-commerce Luxury).

The CSV recommendations below are the original green baseline, not a fixed
brand mandate. On 2026-10-16 the user explicitly selected **premium editorial,
generous whitespace** for the UI revision. The active listing-page override in
`pages/product-listing.md` takes precedence for colors, typography and layout;
retain the baseline here as provenance, not as the current page appearance.

## Verified recommendations

| Source           | Matching row              | Recommendation                                                                                           |
| ---------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| products.csv     | 3 / E-commerce            | Vibrant & Block-based; Feature-Rich Showcase; brand + success green                                      |
| colors.csv       | 3 / E-commerce            | Primary #059669; secondary #10B981; accent #EA580C; background #ECFDF5; foreground #064E3B; card #FFFFFF |
| typography.csv   | 40 / E-commerce Clean     | Rubik headings + Nunito Sans body                                                                        |
| ui-reasoning.csv | 3 / E-commerce            | Clear hierarchy, product imagery, 200ms hover; avoid text-heavy surfaces                                 |
| styles.csv       | 6 / Vibrant & Block-based | Bold blocks, large headings, intentional spacing, modest color shifts                                    |

Other palette roles: muted #E8F1F3, muted foreground #475569, border #A7F3D0,
destructive #DC2626, ring #059669. The dataset specifies **black** on primary
and accent, not white. Do not assume white text passes 4.5:1 on these colors.

## Deliberate implementation decisions

- Keep Aydibro branding and the existing homepage. Add a focused `/products`
  page in the current React 18 / TypeScript / Vite application, not a new site.
- Apply semantic `--plp-*` tokens within the listing page; do not recolor the
  user's existing checkout, account pages, or global palette as a side effect.
- Local google-fonts.csv lists Vietnamese for Nunito Sans but not Rubik.
  Vietnamese headings/body therefore use Nunito Sans 400–800. Rubik 500–700
  is reserved for Latin editorial labels. This is an explicit locale adaptation
  of the recommended pairing, not a claim that the dataset uses one font.
- Font files are self-hosted WOFF2 subsets with original SIL OFL notices.
  No Google Fonts requests are made by the running page.
- Use the existing SVG icon family. The skill's Phosphor default is scoped to
  native App UI, not a requirement to replace this web project's icon system.
- Use transform/opacity/color transitions around 180–200ms; respect reduced
  motion. No continuous patterns, fake urgency, or forced scroll snapping in
  a shopping list. General accessibility rules take priority over style effects.
- Dark colors are authored adaptations, not another quoted CSV palette.

## Shared rules

16px content text, 4/8px spacing rhythm, readable prices with tabular numerals,
44px interactive targets, visible focus, explicit form labels, one h1, proper
heading order, contextual live feedback, stable image aspect ratios and lazy
images. Grid 3 columns at desktop / 2 small-screen columns; list mode is an
explicit user choice. Test 375px, landscape, desktop, dark and reduced motion.

## Font provenance

Google Fonts CSS API supplied WOFF2 subsets for Nunito Sans and Rubik. Original
licenses: `public/fonts/nunito-sans-OFL.txt`, `public/fonts/rubik-OFL.txt`.
Font sources: https://github.com/google/fonts/tree/main/ofl/nunitosans and
https://github.com/google/fonts/tree/main/ofl/rubik . Existing Be Vietnam Pro
assets/license remain untouched.
