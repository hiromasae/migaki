# edge — what reads as excellent right now

Entries are dated so staleness is visible; distrust anything older than ~18
months without re-checking. Entries are independent — pull the one you need.
When an entry here conflicts with core principles, core wins.

## Visual treatment

1. **Near-monochrome with one working accent.** *(added 2026-08)* Grays carry
   the whole UI; a single accent appears only on interactive or semantic
   elements, so color always means something. If the accent shows up on
   decoration, it's spent.
2. **Warm neutrals, not pure black/white.** *(added 2026-08)* Paper whites
   whose lowest RGB channel sits at `F4`–`FA` (`#F7F7F4`, `#FAFAF9`) and
   near-blacks whose highest channel sits at `07`–`14` (`#08090A`,
   `#14120B`), with the cast consistently applied. On whites keep the cast
   under ~4 points of RGB spread — `#FAFAF9` spans 1, `#EFEBE4` spans 11 and
   reads as a beige theme rather than a considered neutral. Near-blacks
   tolerate up to ~9 points (`#14120B` spans 9): a cast shows less at low
   lightness. Pure `#FFF`/`#000` reads unconsidered; a cast reads chosen.
3. **Hairline borders over shadows.** *(added 2026-08, re-checked 2026-09)*
   1px borders at `5–14%` foreground opacity (`#0000000D`–`#00000024` on
   light, `#FFFFFF0D`–`#FFFFFF24` on dark) separate surfaces; shadows are
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

11. **Editorial serif as product brand.**
    *(added 2026-08, re-checked 2026-09)* Display serifs (Tiempos, Reckless,
    GT Alpina, Domaine class) at weight 400 or heavier and 32px and up, for
    marketing headlines and brand moments on software products — the
    deliberate anti-Inter move. Pair with a plain UI sans for chrome, body,
    buttons, and navigation. Requires a real display serif: `Georgia`,
    `Palatino`, and bare `ui-serif` fall back to word-processor, not
    editorial. With no webfont budget, use the sans and skip this entirely.
12. **Large-but-medium display type.** *(added 2026-08)* Big sizes (56–96px)
    at weight 450–600, line-height 1.0–1.15, and letter-spacing of `-0.02em`
    to `-0.06em` for sans faces (`-0.01em` or `0` for serifs). Confidence
    through mass, not thinness. In-between weights like 450 and 510 need a
    variable font; with static weights only, use 500.
13. **Monospace doing real work.** *(added 2026-08)* Mono for identifiers,
    paths, amounts, and timestamps — with `font-variant-numeric: tabular-nums`
    so columns of figures align. Mono as data signal, not as costume.
14. **Few sizes, strict scale.** *(added 2026-08)* Four to five text sizes
    total across the product, from a stated scale. Every ad-hoc 15px is
    visible to a trained eye.
15. **Type-only heroes.** *(added 2026-08)* No illustration: the headline set
    large in the brand face *is* the visual. Works only when the sentence is
    strong enough to carry it — which disciplines the copy too.
16. **Hung opening quotes.** *(added 2026-09)* Pull quotes and testimonials
    set at 24px and up place the opening `“` outside the text column, so the
    first letter sits on the column edge: `text-indent: -0.4em` to `-0.45em`
    on the quote block. `hanging-punctuation: first` does the same where
    supported; wrap it in `@supports (hanging-punctuation: first)` and drop
    the indent inside that block, keeping the indent as the fallback
    everywhere else. Below 24px, leave the mark flush.

## Iconography & illustration

17. **One set, one weight, fewer icons.** *(added 2026-08)* A single stroke
    weight across the product, icons only where they beat words (dense
    toolbars, repeated categories). Where a label fits, the label wins.
18. **Diagrams as illustration.** *(added 2026-08)* Real architecture
    diagrams, annotated screenshots, and schematic drawings in brand style as
    the marketing art. Explains while it decorates; unfakeable by template.

## Motion

19. **Motion only on state change.** *(added 2026-08)* Enter/exit/reorder
    animate at 100–250ms ease-out, with 300ms as the ceiling for modals;
    nothing animates on scroll. Animate only `transform` and `opacity`,
    never `all` or layout properties. Popovers enter from `scale(0.9–0.97)`,
    never `scale(0)`, with `transform-origin` at the trigger — use the
    primitive's variable (Radix `--radix-*-transform-origin`, Base UI
    `--transform-origin`); without one, set the origin to the side facing the
    trigger (`top` for a menu opening below it). Command palettes, context
    menus, and anything opened by a keyboard shortcut appear at 0ms. Motion's
    job is explaining what changed, and `prefers-reduced-motion` is honored
    by default.
20. **Springs for direct manipulation.** *(added 2026-08)* Drag, dismiss, and
    reorder track the pointer 1:1 with `transition: none` while held, and
    past their bounds move logarithmically slower instead of hard-stopping
    (Vaul: `8 × (ln(overshoot + 1) − 2)`px). On release, commit on distance
    *or* flick: dismiss past 25% of a sheet's size (45px for a toast), or
    above a release velocity of ~0.4px/ms for sheets and ~0.11px/ms for
    toasts. Settle with a spring; without a spring library, use
    `cubic-bezier(0.32, 0.72, 0, 1)` over 500ms. A press during the settle
    grabs the element where it is. Destructive dismissals commit on release,
    never mid-gesture. A release that checks distance but ignores throw speed
    reads as canned.
21. **Shared-element continuity.** *(added 2026-08)* View Transitions
    API/shared-element morphs between list and detail, so navigation reads as
    the same object moving rather than a page swap. Use for hierarchy
    navigation, not for every route.

## Component patterns

22. **Command palette as real navigation.** *(added 2026-08)* Cmd+K reaching
    every action and entity, with keyboard hints shown inline in menus.
    Matching is ranked, not substring: typed characters match in order with
    gaps allowed, word-start hits outrank mid-word ones, and each item
    carries aliases so "remove" finds Delete. Arrow keys and `ctrl+n`/`p`
    move the selection, which scrolls into view with `block: 'nearest'`. The
    palette opens at 0ms. The edge version is depth — palettes that only
    search four pages read as checkbox.
23. **Inline editing over modals.** *(added 2026-08)* Click-to-edit in place,
    save on blur, no dialog for single-field changes. Modals reserved for
    genuinely branching flows.
24. **Optimistic UI with undo.** *(added 2026-08)* Mutations apply instantly,
    a toast offers undo for ~8s, rollback on failure. The toast sits in a
    screen corner with no backdrop, stays out of the tab order (reachable by
    a shortcut — Sonner uses `Alt+T`), and stacks at most 3 deep; its
    countdown pauses while the pointer is over the stack, while the stack is
    opened from the keyboard, and while the tab is hidden
    (`document.visibilityState`). Replaces confirmation dialogs everywhere
    destruction is reversible; where the server cannot reverse it, keep the
    dialog.
25. **Empty states that demonstrate.** *(added 2026-08)* First-run screens
    showing populated example data (clearly labeled) with one creation action
    — the product teaches by showing its full state, not a gray illustration.
26. **Keyboard affordances made visible.** *(added 2026-08)* Shortcut chips in
    buttons and menu rows (`⌘⏎`, `G then I`), and a focus ring that is
    specified rather than suppressed: `outline: 2px solid` in the accent at
    3:1 or better against the adjacent surface, `outline-offset: 2px`, shown
    on `:focus-visible` only so mouse clicks don't trigger it. Where a scroll
    or overflow container would clip it, inset it (`outline-offset: -2px`).
    `outline: none` with no replacement border fails. On touch-only devices
    (`@media (hover: none)`), hide the chips and keep the ring. Signals a
    tool meant for daily, expert use.
27. **Tooltips that warm up.** *(added 2026-09)* The first tooltip opens
    after a 600–700ms hover delay; once one has shown, any other trigger
    hovered within 300–400ms of it closing opens instantly with
    `transition-duration: 0ms`. Content is a one-line plain label — no
    buttons or links inside — closed by `Escape`, and nothing needed to
    finish the task lives only there. On `(hover: none)` devices render no
    tooltip; the control's visible label or `aria-label` carries the meaning.

## Restraint

28. **Count your systems.** *(added 2026-08)* One accent color, one display
    face, one radius scale, one shadow level in content. Excellence right now
    is legible mostly as what was declined; every added system must justify
    itself against the count.
29. **Whitespace as the only divider.** *(added 2026-08)* Spacing steps
    (16/24/40px) encode grouping with no rules or boxes; borders appear only
    where scroll or interaction demands an edge. Requires an exact spacing
    scale — sloppy spacing is why people reach for boxes.
30. **Fewer settings, better defaults.** *(added 2026-08)* Shipping opinions
    instead of preference panels; a setting exists only where real users
    demonstrably split. A short settings page reads as a confident product.

## AI-native interface patterns

31. **Streaming with structure.** *(added 2026-08, re-checked 2026-09)*
    Generated output streams into its final layout: headings, list items,
    code blocks, and table rows render formatted as their chunks arrive, and
    unterminated markup (an open `**`, an unclosed fence) is closed
    provisionally rather than shown raw. Once a block is complete it does not
    move or resize when the stream ends (0px shift above the insertion
    point). If the output is plain prose, stream it into a column already at
    its final width (`max-width` 65–75ch) so nothing reflows. Perceived
    latency lives here (Doherty).
32. **Generative UI over chat transcripts.** *(added 2026-08)* Model output
    rendered as real components — editable forms, diffs, tables, charts — with
    chat as one entry point, not the container for everything.
33. **Inline grounding.** *(added 2026-08)* Claims carry citation markers that
    reveal the source on hover/tap, and quoted spans link to their origin.
    Ungrounded assertion UI reads as 2023.
34. **Review affordances for AI output.** *(added 2026-08)* Accept/reject per
    hunk, side-by-side diffs against the previous state, edits tracked as the
    human's. The interface assumes the model is a drafter, not an oracle.
35. **Honest agent status.** *(added 2026-08)* Long-running AI work shows its
    actual steps ("searching X", "reading Y"), is cancellable mid-run, and
    fails with what it did get. Fake progress bars and "thinking…" spinners
    over dead air read as concealment.
36. **AI as ambient capability.** *(added 2026-08)* Ghost-text completions,
    one-tap refinements, and suggestions inside existing workflows — the model
    embedded where work happens, not a chatbot bolted to the corner of an
    unchanged product.

## Data visualization

37. **Direct labels, no legend.** *(added 2026-08)* Series labeled at the line
    end or on the mark; legends only when direct labeling physically can't
    fit. Removes the eye's round trip.
38. **Small multiples over one crowded chart.** *(added 2026-08)* Six tiny
    same-scaled charts beat one chart with six series. The grid of sparklines
    is the current dashboard signature.
39. **Muted structure, loud data.** *(added 2026-08, re-checked 2026-09)*
    Gridlines at `~4–6%` foreground opacity or absent; axis lines 1px or
    absent; tick labels in the secondary text color, never the primary. The
    data series are the only saturated color on the chart. When values must
    be read off the chart with no tooltip (print, static export), raise
    gridlines to `~8–12%` rather than removing them. Tufte's data-ink, as
    current practice.
40. **Sequential single-hue scales.** *(added 2026-08)* Quantity encoded as
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
