# slop — patterns that read as AI-generated or dated

Every entry is a flag, not a ban. Format: the pattern, what it signals, and the
case where it's still the right call. Entries are independent — pull the one
you need.

## Visual treatment

1. **Indigo-to-purple gradient as the brand.** `#6366F1 → #A855F7` (Tailwind
   indigo-500 → purple-500) on hero, buttons, and logo is the default AI-startup
   look of 2023–24. *Still right:* a brand that actually owns purple and uses it
   flat, not as a gradient crutch.
2. **Glassmorphism everywhere.** `backdrop-blur` + translucent white cards on a
   gradient background signals template. Blur is expensive and kills text
   contrast. *Still right:* one overlay layer that genuinely floats over
   changing content — a HUD, a modal over media.
3. **shadow-xl on every card.** Uniform heavy drop shadows lift everything,
   which lifts nothing — elevation stops encoding anything. *Still right:*
   shadow as a real z-axis signal: modals and popovers above, content flat.
4. **Glowing blob / mesh-gradient hero backgrounds.** Blurred radial color
   blobs floating behind the headline are the stock "we do AI" backdrop.
   *Still right:* a dark-mode dev-tool brand using one restrained glow as a
   signature moment — once per page.
5. **One border-radius for everything.** 12–16px on buttons, cards, inputs,
   images, and avatars alike reads as an untouched framework default. *Still
   right:* a deliberate radius scale (e.g. 4/8/16 by component size) applied
   consistently.
6. **Noise/grain overlay to fake craft.** A 3–5% opacity noise PNG over flat
   color adds "texture" that carries no meaning — dated by 2024. *Still right:*
   print-derived brands where grain is part of an actual art direction.
7. **3D clay illustration.** Rounded, soft-shadowed 3D characters and floating
   shapes ("corporate Blender") date a page to 2021–23 instantly. *Still
   right:* almost never; a playful consumer brand with custom, art-directed 3D
   is a different thing than stock clay.

## Layout & composition

8. **The template rhythm.** Centered hero → three feature cards → logo wall →
   testimonial → pricing → FAQ → CTA. The rhythm itself is the tell, whatever
   the styling. *Still right:* an MVP lander shipped in a day — it converts;
   just know it reads as template.
9. **Everything in a card.** Every list, paragraph, and setting wrapped in a
   bordered rounded box, cards nested in cards. Enclosure stops encoding
   grouping (Gestalt common region is spent). *Still right:* dashboards where
   each card is a genuinely independent, rearrangeable module.
10. **Bento grid for features.** The 2×3 mixed-cell grid was the edge in 2023,
    saturated by 2025. Signals "I saw this on a keynote slide." *Still right:*
    content whose importance genuinely varies — one hero cell, minor cells —
    not six equal features forced into fake variety.
11. **Perfect symmetry, every section.** Every block a centered column or a
    50/50 text-image split creates a metronome scroll. *Still right:* formal
    or ceremonial contexts (legal, luxury) where symmetry is the voice.
12. **Angled floating screenshot.** Product shot rotated with a perspective
    transform, hovering with a mega-shadow. Dated and it hides the actual UI.
    *Still right:* never at an angle; straight-on, full-bleed, real data.
13. **Fabricated stat row.** "10k+ users · 99.9% uptime · 24/7 support" above
    the fold on a product that launched last week. Readers now assume these are
    invented. *Still right:* real, verifiable, specific numbers ("4,218 repos
    migrated") — specificity is the credibility.
14. **The same logo wall.** Six grayscale logos of companies that are not
    actually customers (or whose one employee once signed up). *Still right:*
    logos you may legally show, with real usage behind them.

## Typography

15. **Gradient text on headlines.** `background-clip: text` over the brand
    gradient — the single strongest 2023-AI tell. Also breaks on selection and
    in forced-colors mode. *Still right:* at most one hero moment, on a brand
    that owns the gradient elsewhere.
16. **Inter as the brand voice.** Inter is a fine UI workhorse; using it for
    display/marketing type signals "no typographic decision was made." *Still
    right:* product chrome, dashboards, anything where type should disappear.
17. **Oversized thin display type.** 72px+ headlines at weight 200–300 —
    "elegant" via fragility, illegible at a glance and broken on low-DPI.
    *Still right:* large sizes carry lower weights better, but 400+ at 72px is
    the safe floor; thin belongs to luxury print.
18. **Eyebrow kicker on every section.** The ALL-CAPS wide-tracked micro-label
    ("FEATURES", "TESTIMONIALS") above every H2 is template scaffolding — it
    labels structure instead of communicating. *Still right:* one kicker where
    the category genuinely orients ("CASE STUDY").
19. **tracking-tight on body text.** Negative letter-spacing below ~20px
    degrades legibility; it was copied from display type where it belongs.
    *Still right:* display sizes only — tighten above ~32px, never below.
20. **The Playfair + Inter pairing.** (Or: Space Grotesk for anything "tech.")
    These pairings are the first result for "elegant font combo" and read as
    exactly that. *Still right:* if the serif is doing editorial work across
    the whole system, pick one with less mileage.
21. **Unbounded line length.** Body text stretching the full container past
    90+ characters per line. Reading rhythm dies. *Still right:* never for
    prose; `max-width: 65ch` is the fix, tables and code are the exception.

## Iconography

22. **Icon in a tinted circle.** 48px circle, 10%-opacity brand tint, 24px
    stroke icon centered — repeated three times across feature cards. This is
    the single most recognizable AI-layout tell. *Still right:* when icons
    need a consistent touch target in dense UI — but then it's a square hit
    area, not a decorative circle.
23. **✨ for AI.** The sparkle emoji/icon on every AI feature has gone from
    convention to noise; it now signals bolt-on. *Still right:* labeling AI
    features in a product where users must distinguish generated from human
    content — it is still the recognized signifier; use it once, not per line.
24. **Mixed icon sets.** Heroicons next to Lucide next to Material in one view
    — stroke widths and corner styles clash, and it reads as pasted. *Still
    right:* never mixed in one surface; one set, one stroke weight.
25. **Rocket, lightning, brain.** 🚀 = launch, ⚡ = fast, 🧠 = smart: metaphor
    defaults that carry zero information. *Still right:* when the literal
    object appears in the domain (a power-usage app can use lightning).
26. **Default icons at brand moments.** Stock Lucide glyphs as hero art or
    empty-state illustration signals no illustration budget. *Still right:*
    inside product chrome, defaults are correct — the flag is only at moments
    that carry the brand.

## Motion

27. **Fade-up on every scroll section.** AOS-style `opacity 0→1, translateY
    20px→0` staggered 100ms across the whole page. One rhythm, no meaning, and
    it delays content. *Still right:* one entrance on the hero, everything
    else static.
28. **Typewriter headline.** Character-by-character typing (often with rotating
    words) makes users wait for your value prop. *Still right:* terminal-themed
    dev tools where the terminal is the product — once.
29. **Infinite logo marquee.** Auto-scrolling logo strip; motion draws the eye
    to the least important content on the page. *Still right:* more logos than
    fit and genuinely real ones — but a static grid is still better.
30. **hover: scale(1.05) on every card.** Uniform zoom-on-hover signals
    interactivity where there sometimes is none, and jitters layout. *Still
    right:* genuinely clickable cards — but prefer a border/background shift
    that doesn't move layout.
31. **Particle/dot-field backgrounds.** Floating connected dots ("tech
    constellation") burn CPU to say nothing. *Still right:* a data or network
    product where the particles are the actual data.
32. **Pulsing live dot on everything.** The green pulse animation on statuses
    that aren't live streams. Animation must mean "happening now." *Still
    right:* genuinely real-time state — one per view.

## Component patterns

33. **Fake "Most Popular" pricing tier.** Middle tier highlighted with a badge
    on day one, before any customer exists. The convention converts, which is
    why its fake version is so legible. *Still right:* when the tier is
    actually most popular, or honestly labeled "Recommended."
34. **Testimonial cards with generated faces.** AI avatars + first-name-only
    attributions ("Sarah K., Founder") are assumed fabricated by default now.
    *Still right:* real photos, full names, linkable companies — or no
    testimonials.
35. **Mandatory FAQ accordion.** An FAQ at the page bottom whose questions no
    one asked, written to hold keywords. *Still right:* questions users
    actually ask (support ticket top-5), answered in one sentence each.
36. **Toast for non-events.** "Settings saved!" on every keystroke, success
    toasts for expected outcomes. Interruption spent on nothing. *Still right:*
    async results the user may have navigated away from, and undo affordances.
37. **Skeleton that doesn't match the content.** Three gray bars where a table
    loads — the layout shift on load reveals the skeleton was decorative.
    *Still right:* skeletons shaped like the real loaded layout, or none.
38. **Gradient-border card.** The 1px animated gradient border (padding-hack or
    `border-image`) marking a "special" card — 2024's premium signifier, now
    template. *Still right:* one AI-output surface, if the gradient is already
    the established brand.
39. **Avatar stack + "Trusted by 10,000+ developers."** Overlapping circle
    avatars above the hero H1, numbers unverifiable. *Still right:* real
    avatars of real users with a real count; otherwise cut.
40. **Chat bubble in the corner.** Bottom-right chat FAB on a site with no one
    answering, or an AI bot impersonating support. *Still right:* staffed
    support with honest labeling of what's human and what's bot.

## Copy

41. **Verb-pile headlines.** "Supercharge your workflow." "Unleash your
    potential." "Elevate your business." The verbs are interchangeable, which
    is the tell — no product specifics survive. *Still right:* never; name
    what the product does ("Merge PRs 40% faster").
42. **"AI-powered" as a prefix.** Every feature renamed "AI-powered X" signals
    the AI is the only feature. *Still right:* when AI is the differentiator
    users are shopping for, say what the model does instead ("drafts replies
    from your past tickets").
43. **The triad.** "Fast. Simple. Secure." Three single abstract adjectives
    with periods — rhythm without claims. *Still right:* triads of concrete
    specifics ("2ms lookups. One YAML file. SOC 2.").
44. **"It's not X — it's Y."** The contrast-reframe construction ("It's not a
    CRM — it's a revenue platform") is now a recognized LLM tell, along with
    em-dash-heavy sentence chains. *Still right:* a real category correction a
    user needs, stated once.
45. **Adverb gloss.** "Seamlessly integrates," "effortlessly scales,"
    "beautifully designed" — the adverb asserts what the sentence should prove.
    *Still right:* cut the adverb, keep the verb; if the claim needs support,
    show the number.
46. **"Modern" as the differentiator.** "Built for modern teams," "the modern
    data stack" — says newer-than-something without naming what changed. *Still
    right:* when you name the thing replaced ("replaces cron + bash glue").
