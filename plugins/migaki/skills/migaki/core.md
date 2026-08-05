# core — timeless perceptual principles

## Meta-principle

**Minimize cognitive load.** Every element and interaction should reduce the
work between the user's intent and its completion. Every principle below is a
mechanism for this; when in doubt, ask what costs the user less.

## Conflict rule

When principles conflict, the lower-numbered tier wins: foundational beats
perceptual encoding, which beats interaction, which beats system integrity.

## Tier 1 — Foundational

1. **Signal-to-noise ratio** (Tufte's data-ink). Every element must earn its
   place; decoration that carries no meaning is pure cost. Before adding
   anything, name what it communicates — if you can't, don't add it.
2. **Visual hierarchy.** One primary message or action per view; importance
   must be visible before reading begins. If everything is emphasized, nothing
   is.
3. **Accessibility floor** (WCAG contrast, minimum target sizes). Perception is
   the baseline, not a feature: meet contrast ratios, don't encode meaning in
   color alone, keep targets at least ~44px. A beautiful thing that can't be
   perceived fails.
4. **Jakob's law.** Users spend most of their time in other interfaces, so
   conventions are inherited expectations. Deviate only when the deviation
   clearly pays for its learning cost.

## Tier 2 — Perceptual encoding

5. **Gestalt: proximity & common region.** Spacing and enclosure encode
   relationship — whitespace is structure, not absence. Related things sit
   closer together than unrelated things, always.
6. **Gestalt: similarity & continuity.** Shared style encodes shared category,
   and visual difference implies semantic difference. Never style two things
   differently unless they mean different things.
7. **Preattentive attributes.** Size, color, and position are read before
   conscious attention. Spend them on what matters most; a preattentive cue on
   a minor element steals attention from a major one.
8. **Miller's law / chunking.** Working memory holds roughly 4–7 items. Group
   content into scannable chunks rather than presenting long undifferentiated
   runs of options, fields, or text.

## Tier 3 — Interaction

9. **Fitts's law.** Time to acquire a target depends on its size and distance.
   Primary actions get large, close targets; destructive actions get distance.
10. **Hick's law.** Decision time grows with the number and ambiguity of
    choices. Offer fewer, better-differentiated options; a default beats a
    menu.
11. **Affordances & signifiers** (Norman). Interactive things must look
    interactive, and non-interactive things must not. If users tap it and
    nothing happens, or miss it because it looked inert, the signifier failed.
12. **Visibility of system status** (Nielsen). Every action gets timely
    feedback — pressed states, progress, confirmation. The system's current
    state is never a mystery.

## Tier 4 — System integrity

13. **Internal consistency.** The same thing gets the same look and behavior
    everywhere. Consistency beats local optimization: a slightly worse pattern
    used everywhere outperforms a better one used once.
14. **Progressive disclosure.** Show what's needed now and defer the rest.
    Complexity is sequenced, not deleted — advanced options exist, but not at
    the same rank as the primary path.
15. **Error prevention & recovery** (Nielsen / poka-yoke). Make errors hard to
    commit — constraints, confirmation for the destructive — and cheap to
    reverse. Undo beats warning.
16. **Doherty threshold.** Responses under ~400ms keep users in flow. Perceived
    speed is a design property: optimistic updates, skeletons, and instant
    feedback count.

## Operational test

Apply in the moment, without rereading this file:

1. **Earn:** can you name what each element communicates? Remove any you can't.
2. **Rank:** is the most important thing the most visible thing?
3. **Act:** would a first-time user know what to do next, and know what just
   happened?
