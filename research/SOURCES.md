# sources — where the research loop is allowed to look

The loop reads only what is listed here. An agent told to find "what's
excellent right now" with an open web search lands on trend roundups and
proposes entries synthesized from the same material `slop.md` exists to
reject. The source list is the quality control, not a convenience.

Edit this file freely — it is the main lever on what the loop proposes.

## What qualifies

A source must show **shipped** interfaces or **versioned** design decisions,
at a resolution where specific values are readable: a hex, a spacing step, a
duration, a font stack. Aspiration does not qualify. Concept work has no
constraint behind it, and constraint is what separates a pattern that holds
from one that photographs well.

Excluded deliberately. Do not re-litigate these per run:

- **Dribbble, Behance, Pinterest.** Unshipped concept work, and the origin of
  a large share of what is already catalogued in `slop.md`.
- **Trend roundups.** "UI trends of 2026", agency blog posts, Medium and
  Dev.to listicles. Derivative by construction and typically a year behind.
- **AI-written design blogs.** Now the majority of search results for most
  design queries; they launder each other's claims.
- **Awwwards site-of-the-day.** Rewards spectacle and scroll-jacking. The
  award is for ambition, which is not what `edge.md` tracks.

## Tier 1 — shipped product surfaces

Read both the marketing site and the signed-in app where possible; they fail
differently and `edge.md` covers both.

- Linear — `linear.app`
- Stripe — `stripe.com`, and the docs surface specifically
- Vercel — `vercel.com`
- Raycast — `raycast.com`
- Mercury — `mercury.com`
- Ramp — `ramp.com`
- Resend — `resend.com`
- Clerk — `clerk.com`
- Cursor — `cursor.com`
- Figma — `figma.com`
- Notion — `notion.so`
- Arc / Dia — `arc.net`

## Tier 2 — design systems and their changelogs

The highest-value re-check source. Releases are dated and diffable, so a
token change is direct evidence that a pattern moved — far stronger than
prose about a trend.

- Radix Primitives / Radix Themes — GitHub releases
- shadcn/ui — changelog and registry diffs
- Vercel Geist — `vercel.com/geist`
- Base UI — `base-ui.com`
- GitHub Primer — `primer.style`
- Shopify Polaris — `polaris.shopify.com`
- Atlassian Design System — `atlassian.design`
- IBM Carbon — `carbondesignsystem.com`
- Material 3 — `m3.material.io`
- Apple HIG — `developer.apple.com/design`

## Tier 3 — practitioners who ship

Individuals whose published work is backed by shipped libraries, not opinion
pieces. Weight their code over their writing.

- Rauno Freiberg — `rauno.me`, `uiplaybook.dev`
- Emil Kowalski — `emilkowal.ski`, `animations.dev`, Vaul, Sonner
- Paco Coursey — `paco.me`, `cmdk`

## Tier 4 — screenshot archives

Useful for breadth and for spotting saturation — when a pattern appears
across dozens of unrelated products, it is heading for `slop.md`, not
`edge.md`.

- Mobbin — `mobbin.com`, versioned captures of real apps over time
- Refero — `refero.design`
- Godly — `godly.website`, curated, mixed quality

## Note on saturation

Tiers 1–3 are where a pattern is found. Tier 4 is where it is found to be
**over**. A candidate appearing on one Tier 1 product is a possible `edge.md`
entry; the same candidate appearing across a Tier 4 archive is a Retirement
watch proposal instead.
