# edge.md — What Excellent UI Looks Like Right Now

`core.md` is the floor. It describes how perception works and does not change. `edge.md` describes what considered, well-executed interface work looks like at this moment, within those constraints. Every entry here will eventually expire. Some will move to `slop.md` once imitation outpaces execution.

**Precedence:** `core.md` wins. If an entry here appears to conflict with a principle in `core.md`, the principle is correct and the entry is wrong. Report it rather than resolving it locally.

**How to use this file:** Read it before generating or reviewing UI. Each entry names a pattern, describes it precisely enough to recognize in code, explains the reasoning that makes it read as considered, and separates good execution from imitation. Apply the ones the brief calls for. Applying all of them at once produces a different kind of generic.

**How to maintain this file:** Entries are independent. Adding one means appending a block to its category. Removing one means deleting the block and adding a line to Retirement Watch. Pattern names are stable identifiers; do not rename without noting the old name. Each entry carries the month it was added so age can inform retirement.

**Entry format:**

```
**Pattern name** (added YYYY-MM)
- Looks like: ...
- Why it works: ...
- Execute it well: ...
```

---

## Visual Treatment

**Perceptually uniform color ramps** (added 2026-07)
- Looks like: color tokens authored as `oklch()`, with each hue stepping through the same lightness scale, so `blue-600` and `amber-600` carry identical visual weight. Dark mode derived by moving L while holding C and H, not by hand-picking a second palette.
- Why it works: `core.md` treats color as a claim about importance. In hex or HSL, equal numeric steps produce unequal perceived steps, so a ramp built to encode hierarchy silently stops encoding it as soon as the hue changes. OKLCH makes the numbers mean what they appear to mean.
- Execute it well: define one L scale and apply it to every hue in the system. Clamp chroma at both ends so light tints do not go chalky and dark shades do not go muddy. Ship a hex fallback declared first in the cascade. Do not reach into P3 for accents that have no sRGB equivalent; they will clip or band on a large share of displays. The implementation trap to avoid: a mathematically correct OKLCH ramp that still produces dirty yellow or muddy amber. OKLCH yellow at equal lightness to blue reads greenish to human perception. Apply a hue-dependent chroma adjustment — reduce C on yellow and amber, increase C on blue and violet — so the ramp looks uniform, not just measures uniform.

**One chromatic accent, everything else neutral** (added 2026-07)
- Looks like: an interface that is almost entirely neutral, with a single saturated hue reserved for the primary action, the active state, and focus. Secondary actions are distinguished by weight, border, and text color rather than by their own hues. Destructive actions may use semantic red when the consequence is genuinely destructive — red is earned by destruction, not assigned to anything negative. This is a rule about semantic color assignment, not about whether gradients exist — a gradient built from two lightness values of the same accent hue is consistent with this principle.
- Why it works: every component library ships a full semantic palette by default, so using five of them is the path of least resistance and using one is a decision. A single accent means that when color appears, it is unambiguously a priority signal.
- Execute it well: derive hover, active, and disabled from the accent's lightness axis instead of introducing new hues. Status colors (success, warning, error) are the exception and appear only where status is the content, never as decoration on a button. The failure mode to avoid: near-black surface plus a single acid-green, electric blue, or hot-orange accent — this combination has been reproduced so frequently in developer tools and AI products that it now reads as a template, not a decision. The principle is restraint, not a specific palette. Tune the neutrals as carefully as the accent.

**Gradients confined to one hue family** (added 2026-07)
- Looks like: gradients interpolated in `oklab` between two adjacent hues (hue delta under 30°), or a single hue at two lightness levels. Not a sweep from violet through pink to orange.
- Why it works: sRGB interpolation between distant hues passes through a desaturated dead zone in the middle, which is why those gradients look muddy at the center. The wide hue sweep is also the single strongest visual tell of unconsidered output right now, so avoiding it is legible as a choice.
- Execute it well: `linear-gradient(in oklab, ...)`. Over large fills, add one or two percent noise to defeat banding on eight-bit displays. If the gradient is not encoding depth, direction, or brand identity, a flat field is often the stronger default. The implementation trap to avoid: twenty identical blue-to-dark-blue gradients applied to every card background. A considered gradient uses asymmetric stop positioning — 80% of the surface is virtually flat and the gradient acts as an edge lighting term at one end, not a centered 50/50 wash. `linear-gradient(in oklab, var(--c1) 0%, var(--c2) 85%, var(--c3) 100%)` is the pattern; the visual interest lives at the edges.

**Elevation with a consistent light source** (added 2026-07)
- Looks like: shadows across the system sharing one direction and one hue, built from two layers: a tight contact shadow at one or two pixels and a wider ambient shadow. The shadow color derives from the background's own hue rather than being pure black at low alpha — typically a darker, lower-chroma step on the same hue.
- Why it works: a single-value `box-shadow` reads as a sticker pasted onto the page because real occlusion has both a contact term and an ambient term. Pure black shadows over a colored background produce a gray halo that is immediately legible as unthought.
- Execute it well: four or five elevation tokens, no one-off shadows. Derive shadow color from the surface using relative color syntax: `oklch(from var(--bg-surface) calc(l - 0.2) c h / 0.12)` for the contact layer and `oklch(from var(--bg-surface) calc(l - 0.3) c h / 0.08)` for the ambient layer. In dark mode, use surface lightness and hairline top borders as the primary elevation signal; reserve subtle ambient shadows for high-elevation floating modals where separation from a `zinc-950` base is genuinely needed.

**Dark mode built on surface layers, not color** (added 2026-07)
- Looks like: a dark interface with 3–4 surface levels defined as lightness steps in a neutral dark value range — roughly `zinc-950`, `zinc-900`, `zinc-800`, `zinc-700` or equivalent — where depth is communicated through relative lightness rather than shadows or borders. Structural containers use low-opacity white borders (`border-white/8` to `border-white/12`). Brand and semantic colors are desaturated slightly from their light-mode equivalents to avoid the neon effect at dark values. Text uses three lightness steps from a single foreground token.
- Why it works: shadows do not read on dark surfaces at the contrast levels where they are not oppressive. Colored borders on containers fake elevation with hue rather than value, which reads as decoration. Layered surface lightness is how depth is perceived on dark backgrounds — the same mechanism operating rooms, cinema displays, and professional tools have used for decades.
- Execute it well: define surface tokens before defining component tokens; the surface system is what everything else inherits from. Reduce chroma on brand colors used in dark mode — a color calibrated for legibility on white will be oversaturated at dark values. Avoid pure `#000000` as the base surface for general-purpose dark themes; reserve it for OLED-first mobile contexts where energy savings or cinematic contrast are intentional goals. Pure black collapses the number of usable surface steps on most displays.

---

## Layout and Composition

**Container-relative components** (added 2026-07)
- Looks like: a card that renders at different densities in a sidebar than in a three-up grid, driven by container queries on its wrapper rather than by viewport breakpoints or a `compact` prop threaded through the tree.
- Why it works: a viewport breakpoint encodes an assumption about where a component will live. A container query encodes the constraint the component actually faces, which is why the same component survives being dropped into a modal, a sidebar, and a full-width row.
- Execute it well: set `container-type: inline-size` on the wrapper, not on the component itself, since containment interferes with intrinsic sizing. Define two or three density steps and reuse the same thresholds across the system so the density language is learnable. Distinct from density chosen per surface (which is about authoring the right density for a context); this is about components adapting to whatever context they land in. The implementation trap to avoid: applying `container-type` to every element in the tree, which causes layout recalculation thrashing. Apply containment only to structural layout components — grid wrappers, sidebar containers, card grids — and let child components use standard percentage or flex units internally.

**Density chosen per surface** (added 2026-07)
- Looks like: a product where the data table defaults to compact row heights and the settings page defaults to comfortable, both driven by a single spacing multiplier rather than by two sets of hand-tuned values. The decision is made by the author at the surface level; the component adapts via container queries or a density token.
- Why it works: current defaults apply generous whitespace uniformly, which turns dense professional tools into scroll marathons and makes every product feel like the same marketing site. Matching density to task is a judgment the default cannot make.
- Execute it well: one `--density` multiplier feeding the spacing scale. In tables, row height is what users feel, not cell padding. Never let a density mode push type below the legibility floor or hit targets below the minimum; density adjusts space, not type size.

**Subgrid for cross-item alignment** (added 2026-07)
- Looks like: a row of cards where every title, body, and footer sits on the same baseline regardless of how much text each card holds, because the cards inherit the parent grid's row tracks.
- Why it works: ragged internal alignment across a card row is the most common visible layout defect in generated UI. Each card self-sizes, the footers drift, and the row loses its horizontal reading lines. Subgrid fixes this structurally instead of with fixed heights or flex hacks.
- Execute it well: `grid-template-rows: subgrid` with `grid-row: span N` on the child. This is also the correct answer to "buttons at the bottom of unequal cards." Inherit `gap` from the parent so the internal rhythm matches the outer one.

**Asymmetry that maps to an information difference** (added 2026-07)
- Looks like: a content column at seven tracks with metadata at three and a deliberate empty track between them; a headline that breaks out of the text column into the margin; a page whose left edge is a constant and whose right edge varies by content type.
- Why it works: the centered single column with alternating full-width sections is the default output of every template and every generation pass, so it carries no signal. Asymmetry creates a reading order that symmetry cannot, but only when the asymmetry corresponds to a real difference in importance.
- Execute it well: apply one asymmetry consistently down the page rather than alternating for variety. The wide side must hold the primary content. If flipping the layout horizontally would lose nothing, the asymmetry is decoration and should be removed.

**Full-bleed media, constrained measure** (added 2026-07)
- Looks like: prose held at 60 to 70 characters while images, tables, code blocks, and diagrams break out to wider tracks or to the viewport edge, using a named grid template rather than negative margins.
- Why it works: text has an optimal measure and media does not. A single centered container forces both into the same width, which either cramps the media or overruns the reading line.
- Execute it well: define named grid lines (`content`, `popout`, `full`) on the container and let each child opt into a track. This survives nesting inside overflow containers, which negative-margin breakouts do not.

**Anchored overlays in the top layer** (added 2026-07)
- Looks like: menus, popovers, and tooltips built on the native `popover` attribute with CSS anchor positioning: tethered to their trigger, flipping to a fallback position near a viewport edge, dismissing on outside click and Escape, returning focus to the trigger.
- Why it works: it replaces a portal, a z-index scale, and a positioning library with platform behavior, which removes the two classic failures at once: overlays clipped by an ancestor's `overflow: hidden`, and z-index escalation across a codebase.
- Execute it well: declare `position-try-fallbacks` so the overlay flips rather than overflows. Anchor positioning support is still uneven, so keep a JS-positioned fallback behind `@supports`. Do not use this for modals; a modal is not anchored to anything and should stay centered.

---

## Typography

**Optical sizing wired to actual size** (added 2026-07)
- Looks like: a variable face with an `opsz` axis and `font-optical-sizing: auto`, so 12px labels get open apertures and looser spacing while a 48px headline tightens and gains contrast.
- Why it works: one letterform drawing cannot serve both a table label and a display headline. Hand-tuning `letter-spacing` per size is the manual approximation of one axis of what `opsz` does properly across spacing, stroke contrast, and proportion.
- Execute it well: verify the face actually carries the axis, since most do not. Where it does not, vary tracking across the scale: roughly `-0.02em` at display sizes, zero at body, slightly positive at caption. A single `letter-spacing` value applied to the whole scale is worse than none.

**Tabular figures wherever numbers are compared** (added 2026-07)
- Looks like: `font-variant-numeric: tabular-nums` on tables, dashboards, timers, prices, and any number that updates in place. Proportional figures retained in prose.
- Why it works: proportional numerals make a live counter jitter horizontally as digits change and misalign decimal points down a column. This is a spatial stability failure under `core.md`, and it is the reason a dashboard can be correct in every respect and still feel cheap.
- Execute it well: apply at the container rather than per cell. Add `slashed-zero` anywhere zero and capital O can be confused, such as IDs, license keys, and serial numbers. In running text, tabular figures leave visible gaps around the digit one; keep prose proportional.

**Balanced headings, pretty prose** (added 2026-07)
- Looks like: `text-wrap: balance` on headings and short blocks, `text-wrap: pretty` on body copy. No manual `<br>` used to control where a headline breaks.
- Why it works: a single word stranded on the last line of a headline is the most visible typographic defect in responsive layouts, and until recently it required JavaScript or a hard break that is only correct at one viewport width.
- Execute it well: `balance` is capped by browsers at a small number of lines, so restrict it to headings, blockquotes, and captions. Use `pretty` for paragraphs, where it prevents short final lines without the layout cost. If a specific break genuinely matters, use a zero-width or non-breaking space, not `<br>`.

**A short type scale, fully used** (added 2026-07)
- Looks like: five to seven sizes across the entire product, each paired with a bound line height and a default weight. Not a twelve-step scale where three consecutive steps sit two pixels apart.
- Why it works: utility frameworks hand you a dozen sizes, so restricting to six is a decision rather than a limitation. Two sizes two pixels apart do not communicate a hierarchy difference; they read as inconsistency, which costs the reader attention to resolve.
- Execute it well: every adjacent pair in the scale must be distinguishable side by side. Bind line height to the step rather than setting it per component. If a design needs a size between two steps, that is a signal the hierarchy is wrong, not that the scale is short.

**Weight and value as primary hierarchy, size third** (added 2026-07)
- Looks like: a dense product interface where nearly all text sits at one or two sizes and hierarchy comes from three weights and three text-color tokens, with size reserved for genuine section-level breaks.
- Why it works: in information-dense UI, scaling type up to signal importance costs vertical space and breaks alignment with adjacent controls. Weight and value carry the same ranking at constant size and constant rhythm.
- Execute it well: three text colors maximum, defined as lightness steps from one foreground token so they survive both modes. Avoid weights below 400 for UI text; thin weights fall apart at 12 to 14px on non-retina displays. The tertiary color must still clear AA against its background, since it is usually where contrast quietly fails.

**One characterful face, used narrowly** (added 2026-07)
- Looks like: a distinctive display, mono, or grotesque appearing on the wordmark, section eyebrows, and numerals only, with a neutral workhorse carrying everything a person actually reads.
- Why it works: personality distributed everywhere stops registering as personality and starts costing legibility. Confined to structural moments, it marks the product without taxing the reading.
- Execute it well: choose the second face from the subject's own domain rather than from a list of current favorites. Subset it aggressively if it only appears in a handful of places. Pair on contrast, not similarity; two neutral sans faces at similar weights read as an accident.

---

## Motion and Interaction

**Springs for interruptible motion, durations for everything else** (added 2026-07)
- Looks like: gestures, drags, and user-toggled state on spring physics with no fixed duration; predetermined motion such as a page-load reveal, a progress indicator, or a marquee on CSS transitions with an explicit curve.
- Why it works: a fixed-duration tween looks identical whether it travels four pixels or four hundred, and it restarts from zero when retargeted mid-flight. A spring recomputes from current position and velocity, so reversing a half-open sheet feels like catching a physical object.
- Execute it well: reason in duration and bounce rather than mass, stiffness, and damping; it maps better to intent. Keep bounce below 0.2 for anything functional and reserve visible overshoot for drag release. Springs are the wrong tool for looped or precisely timed motion.

**Velocity carried across the gesture boundary** (added 2026-07)
- Looks like: on touch and gesture-driven interfaces, a flicked sheet that continues at the speed of the flick and overshoots slightly before settling, and a slowly released one that glides. Dismissal triggered by either distance or velocity, so a short fast flick works. This pattern applies to gesture-driven interfaces — mobile, touch-first, or drag interactions — not to standard pointer-driven desktop UI where gesture velocity is not a meaningful input.
- Why it works: if the animation begins at zero velocity, the element visibly stalls at the instant the finger lifts, which is the exact instant the user is watching most closely. That single stalled frame is what separates an interface that feels connected to input from one that feels like it is playing a recording.
- Execute it well: sample pointer velocity over the final frames of the gesture and pass it as the spring's initial velocity. Past a boundary, apply asymptotic resistance rather than a hard stop. Capture the pointer on drag start and ignore additional touch points.

**Shared-element transitions where identity actually persists** (added 2026-07)
- Looks like: a thumbnail expanding into a hero image, a list row becoming a detail panel, a collapsed player becoming the full one. The shared object is continuous across the change; everything else crossfades or slides as a group.
- Why it works: the transition tells the user that navigation was an expansion of the thing they touched, not a replacement of the screen. Without it, the destination is a hard cut that forces re-orientation.
- Execute it well: assign `view-transition-name` or a shared layout ID only to elements that are genuinely the same object in both views. Naming two different things the same thing produces a morph that reads as a rendering bug. Names must be unique within a snapshot. Keep the aspect ratio consistent across states or the morph visibly squashes mid-flight.

**Origin-aware entrances** (added 2026-07)
- Looks like: a menu that scales up from the corner nearest its trigger, a tooltip that grows from the edge it points at, a modal that scales from center because it is anchored to nothing. Entrances start near `scale(0.96)` with opacity, never from `scale(0)`.
- Why it works: an overlay that grows from its trigger explains where it came from and where it will return. One that appears from the viewport center is spatially unmotivated, and the user pays a small orientation cost every time. Nothing in the physical world appears from zero size, so `scale(0)` reads as a glitch rather than an entrance.
- Execute it well: use the positioning layer's computed transform origin rather than guessing a corner. Pre-compute the origin on hover or focus — not at click time — so the entrance begins immediately without blocking the interaction. Keep the entrance between 150 and 200ms with a strong ease-out. Never use `ease-in` on an entrance, which delays movement at the exact moment the user is looking for a response.

**No animation on high-frequency actions** (added 2026-07)
- Looks like: a command palette that appears instantly with no open or close animation, keyboard-triggered navigation with no transition at all, and tooltips that skip both delay and animation once one in the group is already open. The no-animation rule on command palettes is a specific application of this principle — they are opened dozens of times per session, so animation becomes latency. See also: origin-aware entrances, which applies to lower-frequency overlay interactions.
- Why it works: an animation seen once is delight and the same animation seen two hundred times a day is latency. Frequency, not importance, decides whether something animates.
- Execute it well: estimate daily repetitions before adding motion. Keyboard-initiated actions get no spatial transitions. Synchronous color or border feedback (background-color, border-color) at zero transition duration is still appropriate and necessary on high-frequency controls — the rule eliminates movement and scaling, not state change feedback entirely. Where a rapidly retriggered element must animate, use transitions rather than keyframes so a second trigger retargets from the current position instead of restarting.

**Immediate press feedback** (added 2026-07)
- Looks like: discrete primary action buttons — submit, publish, send, delete — scaling to about 0.97 on `:active` over 100 to 160ms, with hover states gated behind `@media (hover: hover) and (pointer: fine)`. This applies to low-frequency, discrete triggers, not to high-frequency controls like text inputs, toggles in rapid use, table row selections, or any control activated repeatedly in a session.
- Why it works: the gap between a press and the system's real response is where an interface feels dead. A scale that lands within a frame answers "did it hear me" before the actual work completes, which changes perceived performance without changing performance. On high-frequency controls, the same transform creates layout churn and perceived lag — those controls should use synchronous color or border changes at zero transition duration instead.
- Execute it well: transition `transform` explicitly, never `all`. Use scale rather than opacity; opacity on press reads as disabled. The hover gate prevents the sticky hover state that persists after a tap on touch devices. Apply only to buttons and interactive elements that a user is unlikely to activate more than a few times per session.

**Reduced motion as a designed variant** (added 2026-07)
- Looks like: under `prefers-reduced-motion`, spatial animation (translate, scale, rotate, parallax) replaced by opacity and color transitions that communicate the same state change. Not a global rule zeroing every duration.
- Why it works: zeroing all motion removes the feedback that told the user something changed, so the reduced-motion experience becomes harder to follow rather than calmer. The vestibular trigger is movement through space, not change itself.
- Execute it well: design the reduced path as a first-class variant of each animated component. Enable the setting and walk every flow; anywhere the flow becomes confusing marks a place where motion was carrying meaning that nothing else carried.

---

## Component Patterns

**Skeletons that match final geometry exactly** (added 2026-07)
- Looks like: placeholder blocks with the same dimensions, radii, and positions as the content replacing them, so nothing shifts on load. Not a centered spinner, and not gray bars of arbitrary width.
- Why it works: a skeleton whose shapes do not match causes a layout jump at the precise moment the user starts reading, which costs more attention than the wait it was hiding. Matching geometry makes loading a fade rather than a reflow.
- Execute it well: build the skeleton from the real component with content swapped for blocks so it cannot drift as the component changes. Reserve media space with `aspect-ratio`. Only skeleton work expected to exceed roughly 300ms; below that a skeleton flashes and reads as a defect. Keep any shimmer low contrast, since a high-contrast shimmer draws attention to the wait.

**Inputs that size to their content** (added 2026-07)
- Looks like: `field-sizing: content` on text inputs and textareas so they grow with what is typed, and validation that fires on blur rather than on every keystroke.
- Why it works: a fixed-height textarea hides the user's own writing from them, and per-keystroke validation tells someone their email address is invalid while they are halfway through typing it. Both are error-prevention failures dressed as helpfulness.
- Execute it well: set a `max-height` so growth cannot push the submit control off screen. Validate on blur, then revalidate on change only after the first error has been shown. Error text sits adjacent to the field, names the constraint with its actual value, and is announced to assistive technology.

**Command palette as the power surface** (added 2026-07)
- Looks like: a keyboard-invoked, fuzzy-searchable list of every action in the product, with recent items first, keyboard shortcuts shown on the rows that have them, and no open or close animation (see: no animation on high-frequency actions).
- Why it works: it converts recall into recognition for the long tail of actions, which lets the visible interface stay simpler because rarely used commands no longer need a home in a menu. Shortcuts displayed on rows are how people learn them without a documentation trip.
- Execute it well: it must contain every action available in the UI. A palette with gaps stops being trusted after the second miss, and an untrusted palette is worse than none. Arrow navigation wraps, Enter executes, Escape returns focus to where it was.

**Optimistic updates with a specific reversal** (added 2026-07)
- Looks like: a toggle, rename, reorder, or reaction that updates instantly and reconciles behind the scenes, with failure reverting that exact item and saying what happened.
- Why it works: a spinner on an action that succeeds virtually every time makes the entire product feel slow in order to handle a case that almost never occurs. The interface should be honest about the expected outcome, not the worst one.
- Execute it well: restrict to reversible, low-stakes actions. Never optimistic for payments, permission changes, or deletes without undo. On failure, revert the specific row and surface the error at that row; a global toast that does not identify what failed leaves the user auditing the whole list.

**Undo instead of confirmation** (added 2026-07)
- Looks like: a destructive action that simply happens, followed by a notification carrying an Undo control that persists for several seconds. Confirmation dialogs reserved for genuinely irreversible operations.
- Why it works: confirmation dialogs are dismissed reflexively within days of first use, so they stop preventing errors while continuing to tax every correct action. Undo intervenes after the mistake, which is the only moment the user actually knows one occurred.
- Execute it well: undo must be reachable by keyboard and the notification must not steal focus. Pause the dismissal timer on hover and when the tab is hidden. For operations that truly cannot be reversed, require typing the name of the thing rather than clicking a button, so the confirmation cannot be performed reflexively.

**Notifications with spatial consistency** (added 2026-07)
- Looks like: toasts entering and exiting from the same edge, stacking with the newest nearest that edge, and dismissible by swiping in the direction they came from.
- Why it works: when entry direction, stack order, and dismissal gesture all agree, the gesture becomes discoverable without instruction. When they disagree, the user has to be told.
- Execute it well: use transitions rather than keyframes, since toasts arrive faster than an animation completes and keyframes restart from zero. Pause timers when the tab loses focus, or a user returning to the tab finds an empty stack. Close the visual gaps between stacked items so hovering the group does not flicker between hover and non-hover states.

**Focus that is visible and correctly scoped** (added 2026-07)
- Looks like: `:focus-visible` rings that appear for keyboard navigation and not on mouse click, drawn as a two-tone ring with an offset in the surface color and an outer ring in the accent, so it reads on any background.
- Why it works: a single-color ring disappears against backgrounds near its own hue, and removing focus styling entirely remains the most common accessibility failure in generated components. The two-tone treatment is legible everywhere without needing per-surface variants.
- Execute it well: use `outline` with `outline-offset`, not `box-shadow`; outline follows border radius and is not clipped by ancestor overflow. Focus must return to the trigger when an overlay closes, and must be trapped inside a modal but not inside a popover.

---

## Copy and Voice

**Product vocabulary, not implementation vocabulary** (added 2026-07)
- Looks like: labels naming what the person controls. "Notifications," not "webhook config." In AI products specifically: "sources" rather than "retrieval context," "instructions" rather than "system prompt," "usage" rather than "tokens," unless the audience is developers who already hold those words.
- Why it works: implementation vocabulary leaks the architecture into the product and forces the user to learn the team's mental model before using their own. It is currently the most common voice failure in AI-facing interfaces, where the underlying machinery is unusually visible.
- Execute it well: one name per concept, held constant across UI, documentation, errors, and support. If a technical term is genuinely load-bearing for the audience, teach it once in place rather than avoiding it and inventing a vaguer synonym.

**Errors that state what happened and what to do** (added 2026-07)
- Looks like: "This file is 24 MB. The limit is 10 MB." Not "Upload failed," and not an apologetic sentence with an emoji. The recovery path appears as a control, not as a description of a control.
- Why it works: an error is the moment of least patience and greatest need for specifics. Personality in a failure message reads as evasion, because the interface is being charming instead of being useful.
- Execute it well: name the constraint with its actual value, not the rule in the abstract. Errors do not apologize and do not blame. Reserve the warmer register for success and empty states, where there is attention available for it.

**Empty states that perform the first action** (added 2026-07)
- Looks like: an empty list showing the single primary action inline, plus one concrete example of what a filled state contains. Not an illustration with a sentence under it.
- Why it works: the empty state is the highest-intent moment in a product and the most common place for a new user to stall. It is the only screen where the entire job is to produce one specific next action.
- Execute it well: one action, phrased as the verb it performs. Distinguish a true empty state from a filtered-to-nothing state; they are different situations and should not share a component. A filtered empty says what is filtering and offers to clear it.

**Actions named for their outcome, carried through** (added 2026-07)
- Looks like: a button labeled "Publish" producing a confirmation that says "Published." Cancel labeled for what it discards where the stakes justify it: "Discard draft."
- Why it works: when an action changes name between the trigger and the result, the user has to verify they got what they asked for. The vocabulary of a flow is the signposting for it, and inconsistent signposting means re-reading.
- Execute it well: verb plus object wherever the verb alone is ambiguous. Sentence case. Never label the primary and secondary actions with two verbs that are both plausible readings of "proceed," such as "Save" beside "Done."

**Microcopy sized to the risk** (added 2026-07)
- Looks like: no helper text under a name field, one specific line under a field whose format is not obvious, and a full explanation before an action that cannot be undone.
- Why it works: helper text on every field trains people to read none of it, which means the one field that genuinely needed explanation gets skipped too. Explanation draws from the same finite attention budget as everything else on the screen.
- Execute it well: write helper text only after observing the field fail. A placeholder is not a label; it disappears at the moment it is needed and fails for screen readers. If the copy explains the interface rather than the task, fix the interface.

**Generated content marked where it is used** (added 2026-07)
- Looks like: AI output distinguished at the point of use, with sources linked inline and uncertainty expressed as a visible state such as a draft treatment or an unverified marker. Not a footer sentence saying the model can make mistakes.
- Why it works: a blanket disclaimer is read once at first launch and never again, while per-item marking is legible at the moment the user decides whether to act on the output. That decision is made per item, so the signal has to live per item.
- Execute it well: make the provenance affordance the same control that lets the user verify it, so clicking the citation opens the source. Never render generated and user-authored content identically inside a shared surface; the distinction is the whole point.

---

## What Restraint Looks Like in Practice Right Now

**One separation cue per boundary** (added 2026-07)
- Looks like: a card with a background distinct from the page and nothing else, or a hairline border on a same-color surface, or a shadow with no border. Never all three at once.
- Why it works: three redundant separation cues stacked on one boundary is the most reliable visual signature of unconsidered UI. Each cue is doing the same job, so two of them are pure attention cost.
- Execute it well: decide at the system level, not per component. Dark interfaces are usually border-led, since shadows barely read on dark surfaces. Light interfaces can go either way but must pick one. `core.md` already says to group by proximity before reaching for a border; this is the rule for when a boundary genuinely is needed.

**One radius language** (added 2026-07)
- Looks like: every corner derived from one base value, with nested elements using inner radius equal to outer radius minus the padding between them, so curves stay concentric.
- Why it works: mismatched nesting radii produce a visible pinch at the corner that reads as an assembly error even to people who cannot name what is wrong. It is one of the few defects that is noticed unconsciously and universally.
- Execute it well: two or three radius tokens total. Fully round reserved for pills and avatars. Match focus rings and borders to the radius of what they surround, accounting for the offset.

**A motion budget per screen** (added 2026-07)
- Looks like: one orchestrated moment on a page, whether that is an entrance sequence, a single scroll-linked reveal, or one hover interaction. Not every section fading up on scroll.
- Why it works: scroll-triggered fade-ups on every block are the current default of generated marketing pages, which means they now signal the absence of a decision. Motion everywhere emphasizes nothing.
- Execute it well: choose the one element that deserves the attention and let everything else simply be present. Cap entrance choreography around 600ms total with 40 to 80ms between staggered items, and stagger only what is visible above the fold; render the rest immediately.

**Icons and decoration earn their place** (added 2026-07)
- Looks like: section headings without emoji, icons only where they encode a repeated category the user scans for, no gradient rules between sections, no decorative numbered markers on content that is not a sequence.
- Why it works: an emoji in a heading and an icon on every list row both consume the attention the heading and the row were trying to direct. Numbered markers on non-sequential content actively assert an order that does not exist.
- Execute it well: an icon earns its place when the user scans for the category it represents, such as file type, status, or integration. Otherwise it is decoration. Never use an icon alone for a destructive action.

**Remove one element before shipping** (added 2026-07)
- Looks like: the final pass on a screen deleting a divider, a shadow, a helper line, or a background fill rather than adding one last polish detail.
- Why it works: generation makes addition nearly free and subtraction a deliberate act, so the equilibrium drifts toward more. Deliberate removal is the only counterweight, and it is now the clearest available signal that a human judgment was applied.
- Execute it well: list every element on the screen that is not content, control, or orientation. Delete the one with the weakest justification. If the screen does not get worse, delete another. Stop when removal costs something.

**The quality floor, shipped silently** (added 2026-07)
- Looks like: keyboard reachability for every control, visible focus, a reduced-motion path, contrast verified against the actual rendered background, touch targets meeting the minimum, and no layout shift on load.
- Why it works: none of it is visible when present, and it is the only thing visible when absent. It also cannot be retrofitted cheaply, because the failures are structural rather than cosmetic.
- Execute it well: verify per component as the last step of building it, not as a project-level audit before launch. Never announce it in the interface or the copy.

**Fluid type via clamp without resize observers** (added 2026-07)
- Looks like: `font-size: clamp(MIN, PREFERRED, MAX)` where PREFERRED combines a rem base with a viewport unit — `clamp(1rem, 0.875rem + 0.5vw, 1.25rem)` — bound to design tokens so every step in the scale scales proportionally.
- Why it works: fixed type sizes at breakpoints produce a jump the instant the breakpoint is crossed. A viewport-proportional size scales smoothly across the full range without JavaScript resize observers or layout recalculation. The clamp function enforces both a floor and a ceiling so the type never falls below legible or grows past the scale.
- Execute it well: derive all three clamp values from tokens rather than hand-tuning each step. The preferred value should always include a rem component so it respects user font size preferences; a pure `vw` value breaks at the user's base font size. Apply to display and heading sizes first; body text usually needs less range. Do not use fluid type as a substitute for a real type scale — it adjusts size across viewports, it does not replace hierarchy decisions.

---

## AI-Native Interfaces

**Context-scoped filter chips in search and command inputs** (added 2026-07)
- Looks like: a search or command input that renders active filters as removable pill chips inline before the text cursor — `[Repo: core] [Status: open] |` — so the user can see exactly what scope their query operates in. Chips are added by structured selection (keyboard shortcut, dropdown, command syntax) and removed individually. Seen in: Linear, Raycast, Cursor.
- Why it works: a generic text prompt forces the user to encode all constraints in natural language, which is ambiguous and hard to verify. Structured filter chips convert recall into recognition — the user can see what is active and remove a single constraint without rewriting the query. It eliminates an entire class of "why did it do that" moments in AI-assisted interfaces.
- Execute it well: chips must be keyboard navigable — left/right arrows move between them, Backspace removes the last one, Tab moves to the input. Render chips as inline elements within the input container (`display: inline-flex`, `user-select: none`), not as separate rows above it; the separation breaks the cognitive link between filter and query. When a chip is added, move focus back to the text cursor immediately. Do not use chips for constraints the user has not explicitly set.

**Streamed tool call execution blocks** (added 2026-07)
- Looks like: tool invocations rendered inside AI chat streams as collapsible inline execution cards with explicit status states — spinner while running, checkmark on success, error indicator on failure — with an expandable view for output. Clicking opens a detail panel without breaking chat flow. Seen in: Vercel v0, Claude Artifacts, GitHub Copilot Workspace.
- Why it works: raw tool output printed as JSON or unstyled markdown into a conversational transcript is structurally indistinguishable from content. Rendering execution as a distinct component type communicates what happened, what succeeded, and what failed at a glance — treating system operations as first-class UI rather than text.
- Execute it well: each execution block needs at minimum three states: running (with elapsed time), success (with summary), and failure (with actionable error). Use an accordion or `details`/`summary` pattern so the default view is compact and detail is opt-in. The status icon must be distinct enough to scan without reading — color and shape, not color alone. Never print raw JSON as the default visible output.

**Background task runner with persistent status** (added 2026-07)
- Looks like: long-running agentic tasks that shrink into a persistent status indicator in the interface's chrome — status bar, footer, or fixed corner — with a dot pulse or progress indicator and a description of what is running. Clicking opens a slide-over or drawer with real-time output and explicit Cancel or Pause controls. The task survives navigation. Seen in: Cursor (agent background runs), Claude Code, GitHub Copilot Workspace.
- Why it works: locking the main interface with a full-screen loading modal for a multi-minute operation forces the user to wait or lose context. A persistent status indicator makes the operation visible without demanding attention, lets the user continue other work, and provides a consistent surface to return to for progress or cancellation.
- Execute it well: use `position: fixed` with a high `z-index` for the status indicator so it persists across route changes. Aria-live regions announce completion and failure without stealing focus. The drawer must show enough output to understand what is happening — not just a spinner with a label. Always surface a Cancel control; a task the user cannot stop is a trap.

**Inline unified diff for AI-proposed edits** (added 2026-07)
- Looks like: AI-proposed code or content modifications rendered directly within the active document using line-level background tinting — additions in `bg-green-500/10`, removals in `bg-red-500/10` with strikethrough — with floating Accept and Reject controls positioned at the change block. The user evaluates and accepts or rejects without switching to a separate diff view. Seen in: Cursor (Inline Diff), GitHub Copilot, Zed (Assistant Edit).
- Why it works: switching to a split-screen diff view or copying from a chat panel breaks the user's spatial context. Inline presentation means the edit is evaluated at the exact location it will take effect, which reduces cognitive overhead and makes the decision faster and more accurate.
- Execute it well: position Accept/Reject controls adjacent to the change block, not at the bottom of the file. Keyboard shortcuts must work: Accept on `Cmd+Enter`, Reject on `Cmd+Backspace` or `Escape`. Multiple non-overlapping diffs can coexist in the same document; handle each independently. Never auto-accept without user confirmation. When a change is accepted, remove the diff decoration and restore normal document appearance immediately.

---

## Data Visualization and Dense Surfaces

**Monospaced tabular alignment on numeric values** (added 2026-07)
- Looks like: `font-variant-numeric: tabular-nums lining-nums` applied to all numeric values, timestamps, currencies, and quantities in tables and dashboards, so columns align vertically and live-updating values do not jitter horizontally. Labels and prose remain proportional. Seen in: Stripe Dashboard, Linear, Cloudflare Dashboard.
- Why it works: proportional numerals are designed for reading in prose, where varying width creates natural rhythm. In a table column, that same variation misaligns decimal points and causes visible layout shift when values update in real time. Tabular figures solve a spatial stability problem (`core.md`: spatial stability), not an aesthetic one.
- Execute it well: apply at the container level rather than per cell — `font-variant-numeric: tabular-nums` on the `<table>` or data wrapper. Add `slashed-zero` where zero and capital O could be confused: IDs, serial numbers, license keys. Do not apply to prose or marketing copy; tabular figures leave visible gaps around the digit one in running text.

---

## Retirement Watch

Patterns approaching the point where imitation outpaces execution. When a line here is confirmed, move it to `slop.md` and remove any corresponding entry above.

- Floating surfaces with a solid text substrate: top-tier tools (Linear, Zed, Raycast) have largely moved to opaque surfaces with sharp 1px hairline borders (`border-white/10`) due to GPU cost and ubiquity of backdrop-blur. The replacement pattern is high-contrast opaque surface tiles at the appropriate elevation level, not blurred layers.
- Texture with a source: AI generators now add film grain and noise by default to make output feel raw. Texture that was readable as authored in 2024 now reads as a filter. Retain only when the texture is genuinely load-bearing for a specific product's material identity and cannot be replaced by any other texture.
- Noise/grain overlays on dark mode containers specifically: the combination of dark surface plus SVG noise overlay is now the default AI dark theme output.
- Glowing gradient border tracks on floating cards: neon-colored borders on cards that glow on hover — a pattern that followed glassmorphism into mainstream AI output.
- Bento grids used as a default layout rather than because the content has genuinely unequal weight.
- Backdrop blur applied to every surface rather than to floating controls over content.
- The near-black background with a single acid-green or vermilion accent.
- Warm cream background, high-contrast serif display, terracotta accent, applied regardless of subject.
- Broadsheet pastiche: hairline rules, zero radius, dense columns, applied to products that are not editorial.
- Full-viewport hero holding one centered sentence and two buttons.
- Marquee logo strips positioned as social proof without named context.
- Kinetic typography on scroll where the movement carries no information.
