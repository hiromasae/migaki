# edge — what reads as excellent right now

Entries are dated so staleness is visible; distrust anything older than ~18
months without re-checking. Entries are independent — pull the one you need.
When an entry here conflicts with core principles, core wins.

## Visual treatment

1. **Near-monochrome with one working accent.** *(added 2026-08)* Grays carry
   the whole UI; a single accent appears only on interactive or semantic
   elements, so color always means something. If the accent shows up on
   decoration, it's spent.
2. **Warm neutrals, not pure black/white.** *(added 2026-08)* `#FAFAF9`-range
   paper whites and `#0A0A0A`–`#141414` near-blacks with a slight warm or cool
   cast, consistently applied. Keep the cast under ~4 points of RGB spread —
   `#FAFAF9` spans 1, `#EFEBE4` spans 11 and reads as a beige theme rather
   than a considered neutral. Pure `#FFF`/`#000` reads unconsidered; a cast
   reads chosen.
3. **Hairline borders over shadows.** *(added 2026-08)* 1px borders at low
   contrast (`~8–12%` foreground opacity) separate surfaces; shadows are
   reserved for true elevation (popovers, modals). Flat + hairline is the
   current mark of confidence.
4. **Dark mode designed, not inverted.** *(added 2026-08)* Separate dark
   palette: desaturated accents (saturated hues vibrate on dark), elevation via
   surface lightness steps rather than shadow, borders doing more work.
5. **Density as texture.** *(added 2026-08)* Visual richness from real content
   — data, type, structure — instead of decorative overlays. If a surface
   looks empty, add information or shrink the surface, not ornament.

## Layout & composition

6. **Left-aligned, editorial heroes.** *(added 2026-08)* Headline starts at
   the content column's left edge, ragged right, no centering. Reads as
   written-by-someone rather than assembled-by-template.
7. **Confident density.** *(added 2026-08)* Linear/Bloomberg-style
   information-dense screens for professional tools — tight line heights,
   32–40px rows, everything visible — with hierarchy doing the organizing.
   Density signals respect for expert users; it only works if alignment is
   exact.
8. **Asymmetry with intent.** *(added 2026-08)* Deliberately unbalanced
   compositions — 2/3 + 1/3 splits, offset imagery, uneven whitespace — where
   the imbalance points at the priority. The tell of quality is that the
   asymmetry ranks content, not decorates it.
9. **Straight-on product screenshots.** *(added 2026-08)* Full-bleed or
   lightly framed, zero rotation, real data, actual UI chrome. The product
   shown plainly is the current credibility move.
10. **Pages end when content ends.** *(added 2026-08)* Short landing pages —
    hero, one proof, one CTA — with no obligation sections. Brevity reads as
    conviction.

## Typography

11. **Editorial serif as product brand.** *(added 2026-08)* Display serifs
    (Tiempos, Reckless, GT Alpina class) for marketing and brand moments on
    software products — the deliberate anti-Inter move. Pair with a plain
    UI sans for chrome. Requires a real display serif: `Georgia`, `Palatino`,
    and bare `ui-serif` fall back to word-processor, not editorial. With no
    webfont budget, use the sans and skip this entirely.
12. **Large-but-medium display type.** *(added 2026-08)* Big sizes (56–96px)
    at weight 450–600 with tight leading (~1.05) and optical margin alignment.
    Confidence through mass, not thinness.
13. **Monospace doing real work.** *(added 2026-08)* Mono for identifiers,
    paths, amounts, and timestamps — with `font-variant-numeric: tabular-nums`
    so columns of figures align. Mono as data signal, not as costume.
14. **Few sizes, strict scale.** *(added 2026-08)* Four to five text sizes
    total across the product, from a stated scale. Every ad-hoc 15px is
    visible to a trained eye.
15. **Type-only heroes.** *(added 2026-08)* No illustration: the headline set
    large in the brand face *is* the visual. Works only when the sentence is
    strong enough to carry it — which disciplines the copy too.

## Iconography & illustration

16. **One set, one weight, fewer icons.** *(added 2026-08)* A single stroke
    weight across the product, icons only where they beat words (dense
    toolbars, repeated categories). Where a label fits, the label wins.
17. **Diagrams as illustration.** *(added 2026-08)* Real architecture
    diagrams, annotated screenshots, and schematic drawings in brand style as
    the marketing art. Explains while it decorates; unfakeable by template.

## Motion

18. **Motion only on state change.** *(added 2026-08)* Enter/exit/reorder
    animate at 120–200ms ease-out; nothing animates on scroll. Motion's job is
    explaining what changed, and `prefers-reduced-motion` is honored by
    default.
19. **Springs for direct manipulation.** *(added 2026-08)* Drag, dismiss, and
    reorder follow the finger/cursor with spring physics (no fixed duration);
    interruptible mid-flight. Fixed-duration eases on manipulated objects now
    read as canned.
20. **Shared-element continuity.** *(added 2026-08)* View Transitions
    API/shared-element morphs between list and detail, so navigation reads as
    the same object moving rather than a page swap. Use for hierarchy
    navigation, not for every route.

## Component patterns

21. **Command palette as real navigation.** *(added 2026-08)* Cmd+K reaching
    every action and entity, with keyboard hints shown inline in menus. The
    edge version is depth — palettes that only search four pages read as
    checkbox.
22. **Inline editing over modals.** *(added 2026-08)* Click-to-edit in place,
    save on blur, no dialog for single-field changes. Modals reserved for
    genuinely branching flows.
23. **Optimistic UI with undo.** *(added 2026-08)* Mutations apply instantly,
    a quiet toast offers undo for ~8s, rollback on failure. Replaces
    confirmation dialogs everywhere destruction is reversible.
24. **Empty states that demonstrate.** *(added 2026-08)* First-run screens
    showing populated example data (clearly labeled) with one creation action
    — the product teaches by showing its full state, not a gray illustration.
25. **Keyboard affordances made visible.** *(added 2026-08)* Shortcut chips in
    buttons and menu rows (`⌘⏎`, `G then I`), focus rings that are designed
    rather than suppressed. Signals a tool meant for daily, expert use.

## Restraint

26. **Count your systems.** *(added 2026-08)* One accent color, one display
    face, one radius scale, one shadow level in content. Excellence right now
    is legible mostly as what was declined; every added system must justify
    itself against the count.
27. **Whitespace as the only divider.** *(added 2026-08)* Spacing steps
    (16/24/40px) encode grouping with no rules or boxes; borders appear only
    where scroll or interaction demands an edge. Requires an exact spacing
    scale — sloppy spacing is why people reach for boxes.
28. **Fewer settings, better defaults.** *(added 2026-08)* Shipping opinions
    instead of preference panels; a setting exists only where real users
    demonstrably split. A short settings page reads as a confident product.

## AI-native interface patterns

29. **Streaming with structure.** *(added 2026-08)* Generated output streams
    into its final layout (headings, cards, table rows appearing in place),
    not as a raw text wall that reflows into shape at the end. Perceived
    latency lives here (Doherty).
30. **Generative UI over chat transcripts.** *(added 2026-08)* Model output
    rendered as real components — editable forms, diffs, tables, charts — with
    chat as one entry point, not the container for everything.
31. **Inline grounding.** *(added 2026-08)* Claims carry citation markers that
    reveal the source on hover/tap, and quoted spans link to their origin.
    Ungrounded assertion UI reads as 2023.
32. **Review affordances for AI output.** *(added 2026-08)* Accept/reject per
    hunk, side-by-side diffs against the previous state, edits tracked as the
    human's. The interface assumes the model is a drafter, not an oracle.
33. **Honest agent status.** *(added 2026-08)* Long-running AI work shows its
    actual steps ("searching X", "reading Y"), is cancellable mid-run, and
    fails with what it did get. Fake progress bars and "thinking…" spinners
    over dead air read as concealment.
34. **AI as ambient capability.** *(added 2026-08)* Ghost-text completions,
    one-tap refinements, and suggestions inside existing workflows — the model
    embedded where work happens, not a chatbot bolted to the corner of an
    unchanged product.

## Data visualization

35. **Direct labels, no legend.** *(added 2026-08)* Series labeled at the line
    end or on the mark; legends only when direct labeling physically can't
    fit. Removes the eye's round trip.
36. **Small multiples over one crowded chart.** *(added 2026-08)* Six tiny
    same-scaled charts beat one chart with six series. The grid of sparklines
    is the current dashboard signature.
37. **Muted structure, loud data.** *(added 2026-08)* Gridlines at barely
    visible contrast or absent, axes thin and gray, the data series the only
    saturated thing. Tufte's data-ink, as current practice.
38. **Sequential single-hue scales.** *(added 2026-08)* Quantity encoded as
    lightness steps of one hue; rainbow scales read as legacy BI. Diverging
    two-hue scales only when the data has a true midpoint.

## Retirement watch

Trending toward slop — still defensible today, re-evaluate before using:

- **Bento grids** *(added 2026-08)* — already listed in slop for feature
  sections; surviving only where cell weight is real.
- **Untouched shadcn/ui look** *(added 2026-08)* — the default token set
  (radius, `zinc` palette, button styles) is now recognizable on sight; the
  components are fine, the unmodified theme is the tell.
- **Monospace-everything brand voice** *(added 2026-08)* — mono headlines and
  body on every dev-tool site; heading toward the Inter problem.
- **Dot-grid / graph-paper backgrounds** *(added 2026-08)* — the "technical"
  backdrop is nearing saturation on dev-tool landers.
- **Cmd+K as a marketing bullet** *(added 2026-08)* — the palette itself is
  table stakes; advertising it now signals feature-list padding.
- **"Chat with your X"** *(added 2026-08)* — chat as the sole interface to
  data is being replaced by generative UI and ambient patterns (see above).
- **Spring overshoot on UI chrome** *(added 2026-08)* — bouncy panels and
  menus; springs are earning their keep only on directly manipulated objects.
