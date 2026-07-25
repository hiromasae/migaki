# slop.md — What Currently Reads as AI-Generated UI

These patterns signal low effort, AI generation, or the statistical default — because they appear in generated output regardless of context, subject matter, or product identity. None of them are inherently bad. The problem is that they are not choices. They are what an agent produces when nobody told it to do anything else.

This file is updated weekly. Patterns that were once fresh become slop when they get absorbed into the training data median. What signals "AI made this" today may be different from what signaled it six months ago.

A pattern on this list is not automatically prohibited. It is a flag: if this is here, justify it. If you cannot, replace it.

---

## Visual treatment

**Indigo-to-purple gradient as the primary accent**
- A blue-purple gradient — typically Tailwind `from-indigo-500 to-purple-600` or similar — applied to hero backgrounds, CTA buttons, or decorative blobs. Often paired with a white or near-white background. Also appears as `bg-clip-text text-transparent` gradient fills on headlines or metric values.
- This is the single most common AI design tell in 2026. It became the default because Tailwind's indigo-500 was the most common accent in training data. It now reads as "nobody made a color decision here." The gradient text variant also fails WCAG contrast requirements in most implementations.
- Choose a specific color that belongs to the product. If purple is genuinely right, define the exact hue and use it with intention. Let important numbers be important through size, weight, and placement — not gradient fills.

**Glassmorphism on content surfaces**
- Frosted glass treatment — `backdrop-blur-*`, `bg-white/10` or similar semi-transparent backgrounds, thin `border-white/20` borders — applied to primary content cards, grid items, feature sections, or any container that holds main page content.
- Glass on content surfaces is visually noisy, makes text contrast unpredictable, and carries strong "demo screenshot" energy. It is not inherently wrong: glassmorphism is appropriate for floating UI that literally overlays scrolling content — sticky navbars, command palettes, tooltips, floating panels. The tell is glass applied to static content containers where it implies a depth relationship that does not exist.
- Use glass only where an element genuinely floats above a scrolling or dynamic background. Use solid surfaces for content cards, feature grids, and primary containers.

**Decorative blob or mesh gradient backgrounds**
- Soft, blurred color orbs or mesh gradients positioned in the background of hero sections or cards — typically purple, blue, and pink — added as decorative atmosphere with no structural purpose.
- Now the visual equivalent of stock photography: immediately recognizable as a placeholder for a real background decision. Adds visual noise without adding information.
- Make a deliberate background choice. Solid colors, considered textures, real imagery, or genuine negative space all signal more intention than an ambient blob.

**Inconsistent shadow system**
- Different components using different shadow recipes — some with heavy drop shadows, some with glow effects (`shadow-[0_0_20px_rgba(...)]`), some with none — with no consistent logic across the interface for what shadows mean.
- Shadows imply elevation. When every component uses a different shadow recipe, the system communicates nothing. This is a structural tell: AI generates each component independently without a shared depth model.
- Define a shadow scale (2–4 levels maximum) and apply it based on actual elevation. Every shadow should answer "how far above the surface is this?" Glow shadows are not elevation — treat them separately and use them sparingly.

**Pure black dark mode combined with high-saturation neon borders**
- Dark mode implemented with a pure `#000000` or near-pure black background combined with high-saturation colored borders — `border-indigo-500/50`, `border-purple-400/60` — on every card or container throughout the interface.
- Pure black is a valid dark mode choice for terminal UIs, mobile OLED contexts, and high-density developer tools. The tell is the combination: pure black paired with neon colored borders on structural containers, faking depth with color rather than building it with layered surface values. Real dark mode systems use neutral layered shades (`#09090b`, `#18181b`, `zinc-900`) and low-opacity structural borders (`border-white/10`) to establish hierarchy through value.
- If using pure black, use borderless or very low-opacity white borders on containers. Reserve colored borders for interactive and semantic states only — not structural separation.

**Sparkle icons on every AI-assisted element**
- A sparkle or magic wand icon — Lucide `Sparkles`, a ✨ emoji, or similar — added to every button, input, or section header that involves an AI feature, regardless of how minor the feature is.
- Became the universal visual signal for "an LLM API call happens here." When applied to every AI-adjacent element, it loses all meaning and reads as a pattern applied by an agent that has learned sparkles equal AI polish.
- Use AI indicators sparingly and only where the AI nature of an interaction is genuinely relevant to the user's decision. A chat input does not need a sparkle. A button that generates a 500-word draft might.

---

## Layout and composition

**Three equal-width cards in a row as the default content structure**
- Scope: layout archetype — the choice of grid pattern regardless of content. Distinct from perfect proportional symmetry (proportional hierarchy within a layout) and uniform polish (decoration density on individual components).
- A `grid-cols-3` layout with identical card dimensions, similar content structure, and equal visual weight, used to display features, pricing tiers, testimonials, or any grouping of three items.
- The three-card grid is the statistical median of marketing page layouts. It appears in AI output regardless of whether the content has three items, whether the items are comparable, or whether a grid is the right structure at all.
- Let the number and relationship of items determine the structure. If three items happen to be right, ensure they are genuinely equivalent in weight and the grid is the right structure for the content type.

**Centered hero with headline, subheadline, and two equal-weight buttons**
- A full-width hero with centered text, a supporting sentence, and two side-by-side buttons — one `variant="default"`, one `variant="outline"` — often over a gradient or blob background.
- The two-button pattern dilutes hierarchy. It appears because it appears in popular SaaS screenshots, not because the product has two equally important primary actions. Center alignment is appropriate for some products and wrong for others.
- One primary action per screen. If there is a secondary action, it should be visually subordinate. Make the alignment decision based on the product's register, not as a default.

**Nested cards within cards**
- A container with a background and border containing another element with its own background, border, and shadow — card inside card inside page.
- Nested cards create visual complexity without hierarchy. They use containment to imply structure that does not exist.
- Use proximity and spacing to group related elements. Add a container only when the boundary communicates something the spacing alone cannot.

**Dashboard layout applied to non-dashboard content**
- Metric cards, KPI tiles, charts, and activity summaries — the primitives of monitoring interfaces — applied to screens where the user's job is editing, writing, browsing, or configuring: note apps, settings pages, profile pages, ecommerce flows, onboarding.
- Distinct from feature inventory (which is a mental model problem): this is a layout primitives problem. AI reaches for dashboard components because dashboards are heavily represented in product screenshot training data. The result is interfaces that present information about the task instead of surfaces for doing it.
- Match layout primitives to the user's actual job. Monitoring screens get dashboards. Writing screens get editors. Configuration screens get forms. If a screen shows metrics, ask whether monitoring is actually the primary task or whether the metrics are decoration on top of an action surface.

**Everything centered regardless of context**
- Center-aligned content applied uniformly across the product — centered empty states, centered settings panels, centered forms, centered data tables, centered dashboards — beyond the hero section.
- Center alignment is appropriate for short, attention-focused moments (heroes, modals, empty states with a single action). Applied universally it reads as a layout default rather than a decision. It also creates awkward reading patterns for long-form or dense content.
- Use center alignment deliberately and contextually. Left-aligned content is the default for most reading and task-oriented surfaces. Center-align when focus and brevity are the goal.

**Identical rhythm across every section**
- Every page section following the same structure: heading, supporting text, grid or cards — repeated at the same height, same spacing, and same cadence from top to bottom.
- Human-authored layouts vary pacing. Some sections are dense, some sparse. Some lead with visuals, some with text. Identical section rhythm reads as a template being filled in rather than a layout designed for the content.
- Check whether every section on the page uses the same layout pattern. If they do, identify which sections are most and least important and adjust accordingly: reduce spacing in dense informational sections, increase it around focal points, break the grid at least once with a layout that is structurally different from the others.

**Floating pill action bar on non-mobile contexts**
- A rounded, pill-shaped sticky bar fixed to the bottom-center of the viewport containing 3–4 actions, applied to desktop data tables, settings pages, or admin interfaces where a standard header or inline toolbar belongs.
- Originated in mobile web contexts where thumb reach matters. AI agents apply it to desktop interfaces because it is visually distinctive in component library demos. On desktop it occupies viewport space, obscures content, and signals mobile-first thinking applied without judgment.
- Use bottom floating bars only in genuinely mobile-first or touch-first contexts. On desktop, place actions in headers, toolbars, or inline with the content they affect.

**No responsive consideration**
- Layouts that look correct at wide desktop viewport widths but break, overflow, or collapse awkwardly at mobile or tablet widths — text that overflows containers, fixed-width elements that exceed viewport bounds, multi-column grids with no mobile breakpoint, navigation with no mobile treatment.
- AI generates toward the most common viewport in product screenshot training data, which skews heavily to desktop. Responsive behavior requires intentional decisions about which elements collapse, reorder, stack, or disappear at each breakpoint. Without explicit direction, agents skip this entirely. The result passes visual review on a desktop and fails immediately on a phone.
- Define explicit breakpoint behavior for every layout component. Fixed widths on containers without a corresponding `max-w-full` or responsive override are a reliable indicator that no responsive consideration occurred.

**Perfect proportional symmetry in layout**
- Scope: proportional hierarchy — how space is distributed between elements. Distinct from three-card grid (layout archetype choice) and uniform polish (decoration density on individual components).
- Equal column widths throughout, equal card heights in every grid, equal image sizes in every row — proportional balance enforced uniformly across every layout decision regardless of content weight.
- Human-authored layouts use column width, card size, and image scale to signal what matters most. A wider column carries more weight. A larger card is more important. AI defaults to equal proportions because symmetry is statistically associated with correctness, not because the content is actually equivalent.
- Let hierarchy create proportional imbalance. Not every column needs to be the same width. Not every card in a grid needs to be the same height. Let the most important content take more space.

---

## Typography

**Inter at default scale with no typographic personality**
- Inter typeface at Tailwind's default `text-sm` / `text-base` / `text-lg` scale, default tracking and line height, no distinguishing typographic decisions.
- Inter is the default in Tailwind, shadcn, and most starter templates, which makes it the default in most AI output. An interface using Inter at default settings with no customization is indistinguishable from the baseline. It communicates that no typographic decision was made.
- Choose a typeface because it belongs to the product. If Inter is genuinely right, customize the scale, weight, and tracking to make it yours. Avoid Roboto and system-default stacks for the same reason.

**Insufficient typographic hierarchy**
- Body text and UI labels at similar sizes and weights, with limited differentiation between heading levels — technically different but not different enough to create a clear reading order.
- The eye cannot identify the most important information without reading everything. AI generates type scales that are nominally hierarchical but visually flat.
- Adjacent hierarchy levels should be visually distinct at a glance. The difference between a heading and body text should be immediately obvious without needing to read either.

**Mechanically regular weight assignments**
- Heading at `font-bold` (700), subheading at `font-semibold` (600), body at `font-normal` (400) — the same weight pattern applied uniformly regardless of context, with no optical adjustments or context-sensitive variation.
- Typography feels generated when it is mechanically regular. Human-authored type systems use weight variation more subtly — a slightly heavier label here, a lighter caption there — to create rhythm that does not announce itself.
- Vary weight assignments based on what each element needs to communicate, not a fixed formula. Not every heading needs to be bold.

**Text running full container width**
- Body text, marketing copy, or editorial content stretching the full width of a wide container — measure exceeding 80–100 characters per line — with no `max-width` constraint applied.
- Agents do not feel reading discomfort. Lines that are too long slow reading speed and make it harder to track from line end to line start. This is one of the most common and most overlooked legibility failures in AI-generated UI.
- Constrain text containers to 45–75 characters per line (`max-width: 60ch` to `65ch` in CSS). Apply this to any element containing more than two sentences of continuous prose.

**Generic numbered section markers on non-sequential content**
- Large decorative numbers (`01`, `02`, `03`) used as visual markers before section headings or feature descriptions where the content is not actually sequential.
- Numbered markers imply that order matters. Applied to non-sequential content — features, benefits, team members — they imply a hierarchy the content does not have.
- Use numbered markers only when the content is genuinely sequential and the order carries information the reader needs.

---

## Iconography

**No distinction between active and inactive icon states**
- Outline icons used uniformly across all interface states — active, inactive, selected, unselected — with no visual differentiation between a nav item that is selected and one that is not, or between an action that is available and one that is current.
- The tell is not outline icon systems. Many excellent products (Linear, Vercel, GitHub, Cursor) use outline icons consistently and well. The tell is failing to differentiate state through icon weight, fill, or color. When every icon looks identical regardless of state, the interface loses a signaling layer.
- Use filled or colored variants for active, selected, and current states. Use outline for inactive and secondary states. If the icon system does not support this distinction, build it through color or background treatment instead.

**Emoji as functional icons in production UI**
- Emoji used as navigation icons, button icons, status indicators, or feature list markers in a product interface.
- Emoji render inconsistently across platforms and operating systems, are not accessible without redundant labels, and undercut product credibility in most contexts. They appear in AI output as a quick substitute for a real icon decision.
- Use a proper icon set. If an informal or playful register is right, express it through typeface, color, and tone rather than emoji iconography.

---

## Motion and animation

**`transition-all` applied universally**
- `transition-all duration-300` or `transition-all ease-out` applied to every interactive element, card, and container — animating every CSS property simultaneously on any state change.
- This is one of the strongest code-level tells in AI-generated UI. Agents apply `transition-all` because it is the simplest way to add motion and it appears frequently in tutorial code. In practice, animating every property simultaneously produces jarring results when properties like `width`, `height`, or `display` change unexpectedly. Real motion systems specify exactly which properties animate.
- Replace `transition-all` with explicit property transitions: `transition-[opacity,transform]`, `transition-colors`, `transition-shadow`. Animate only the properties that change meaningfully in the interaction.

**`hover:scale-105` on every card**
- Every card in a grid applying a slight scale-up and shadow increase on hover — `hover:scale-105 hover:shadow-xl transition-all` — regardless of whether the card is interactive, what it contains, or whether the scale effect serves navigation.
- Became AI's equivalent of drop shadows: a shortcut for "this feels interactive" applied indiscriminately. Scale transforms on content cards create visual instability and imply interactivity for elements that may not be clickable. Cards that are not primarily navigational do not need hover scale effects.
- Use hover effects proportional to the interaction they signal. Subtle background color change for cards with low-importance hover states. Reserve scale and shadow increases for primary interactive elements where the emphasis is warranted.

**Glow ring hover effects on card grids**
- Cards applying a colored glow shadow on hover — `hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]` or similar — across entire grids of cards.
- A visual shortcut for interactivity that reads as template animation. The glow color is almost always purple or blue, compounding the gradient tell. It overrides the content as the visual focus of the interaction.
- Use hover state changes that respond to the product's visual system rather than adding light effects not present elsewhere in the interface.

**Identical timing across all motion**
- Every animation and transition set to `300ms ease-out` regardless of the element type, interaction stakes, or content size — dialogs, tooltips, button clicks, page transitions, and dropdowns all moving at identical speed.
- Real motion systems vary timing based on what is moving and why. A tooltip appears faster than a dialog. A full-page transition is slower than a dropdown. Identical timing reads as no timing decision having been made.
- Vary duration based on the element's visual footprint and the interaction's importance. Small, local changes: 100–150ms. Larger containers and panels: 200–300ms. Full-screen transitions: 300–500ms.

**Bounce and elastic easing on standard UI chrome**
- Elastic or spring easing applied to dialogs, dropdowns, navigation, and standard interface transitions — elements that overshoot and spring back when entering.
- Elastic easing communicates playfulness. Applied to standard interface chrome it competes with the content and reads as the interface performing. It appears because it is visually distinctive in demo recordings.
- Reserve elastic easing for moments where delight is the explicit goal — onboarding celebrations, game-like interactions, empty state illustrations. Use ease-out for standard transitions.

**Scroll-triggered entrance animations on standard content**
- Every section, card, and text block wired to an Intersection Observer — `fade-in-up`, slide, or scale on scroll — applied indiscriminately across standard page content including background elements the user is not focused on. Distinct from micro-interactions (hover states, dropdown opens, button feedback) which are appropriate.
- Scroll-triggered entrance animations on standard content create visual noise, slow the user's ability to read the page, and cause significant problems for users with vestibular disorders. The pattern peaked in 2022–2024 and now reads as template animation applied without judgment.
- Animate deliberately. Reserve scroll-triggered entrances for the primary focal point on a page or moments that need to direct attention to something new. Standard body content should simply be present.

**Ambient particle or floating dot backgrounds**
- CSS or canvas animations featuring floating particles, connecting dots, or slow geometric shapes as page backgrounds.
- Heavy performance cost for no informational return. Now exclusively associated with AI-generated landing pages and tutorials from 2020–2023.
- Make a deliberate background choice. A static background that belongs to the product is better than an animated one that is generic.

---

## Component patterns

**Missing off-happy-path states**
- Components that handle the loaded, populated state but have no empty state, no loading state, no error state, and no disabled state. Tables with no empty message. Forms with no error handling. Buttons with no loading indicator.
- AI generates toward the happy path — the screen as it appears in a product screenshot with data present. Off-happy-path states are almost always absent in first-pass AI output. Their absence is one of the clearest signals that a UI was generated rather than designed.
- Every data-dependent component must have: an empty state, a loading state, and an error state. These are not edge cases. They are the states most first-time users encounter first.

**Spinner as the only loading pattern**
- A centered spinner as the only loading indicator for all asynchronous operations regardless of what content will appear.
- Spinners provide no information about what is loading or what will appear. They are appropriate for short, indeterminate waits but inadequate for content with predictable shape.
- Use skeleton screens for content with a known structure (lists, cards, text blocks). Use progress indicators for operations with known duration. Reserve spinners for short, truly indeterminate waits.

**Generic empty states with no action**
- Empty states that say only "No items found," "Nothing here yet," or similar — no explanation of why it is empty, no next action, no context.
- An empty state is often the first screen a new user sees. A generic message tells them nothing about what belongs here or what to do next.
- Empty states should explain why the screen is empty, tell the user what to do next, and make that action easy. Treat empty states as onboarding moments.

**Focus states absent or removed**
- Interactive elements with no custom focus indicator — relying on browser defaults, suppressed via `outline: none` without a replacement, or styled identically to hover states.
- Focus states are the primary navigation mechanism for keyboard users. AI-generated code omits them because they do not appear in visual screenshots.
- Every interactive element must have a visible, designed focus state that is distinct from the hover state and consistent across the interface.

---

## Copy and language

**Generic value proposition copy**
- Headlines and descriptions that describe what the product has or uses abstract positive language — "Powerful analytics," "Advanced collaboration tools," "Empower your workflow," "Supercharge your productivity," "Seamless integration," "Intelligent automation" — rather than what specifically changes for the user.
- Both patterns share the same root cause: copy written to fill a shape rather than communicate something specific. Feature-forward copy inventories capabilities. Buzzword copy reaches for emotional register. Neither says anything a competitor couldn't say identically. They are the copy equivalent of the purple gradient — statistically common in marketing training data, applied as filler.
- Replace with specific, concrete descriptions of what the product does and what changes for the user. Name the actual outcome. Specificity is the only antidote.

**Filler microcopy on interactive elements**
- Button labels that say "Get Started," "Learn More," "Submit," or "Click Here" regardless of what the action does. Section labels that describe category rather than content. Descriptions that fit the visual frame but do not describe the specific outcome.
- Generic labels require the user to infer what will happen. They are distinct from generic value proposition copy — this is not about marketing headlines but about the functional labels on controls, actions, and navigation. They appear because they appear frequently in training data as placeholder labels.
- Every interactive label should say exactly what happens when the user activates it. "Create your account," "See pricing," "Send message," "Delete project" — specific, accurate, honest about the outcome.

**Apology-first error messages**
- Error messages leading with "Sorry," "Oops," or "Uh oh" before explaining what went wrong and what to do next.
- Apology-first errors shift focus to the interface's feelings rather than the user's problem. They delay the information the user actually needs.
- State what went wrong, then what to do next. Match the tone to the product's register.

---

## Structural tells

**Uniform polish across every element**
- Scope: decoration density — how much visual treatment is applied to individual components. Distinct from three-card grid (layout archetype) and perfect proportional symmetry (proportional hierarchy between elements).
- Every component decorated with borders, shadows, gradient accents, icons, badges, animations, and rounded corners — nothing left plain, nothing intentionally receded, no variation in visual weight through deliberate omission.
- Human designers know where to spend attention. They let some elements disappear into the background so others can stand out. AI agents optimize each component independently and decorate everything uniformly, because polish is statistically associated with quality in training data. The result is interfaces where nothing is quiet — which means nothing is loud either.
- Let some elements disappear. Plain surfaces, unbordered containers, and undecorated text are tools for making more important elements stand out. Not everything should be interesting.

**Uniform interaction affordance across all element types**
- Every interactive element — destructive buttons, navigation links, draggable items, expandable sections, editable fields — styled with the same hover shadow, pointer cursor, subtle scale, and transition regardless of what the interaction does or what stakes it carries.
- Distinct from uniform polish (decoration density): this is behavioral semantics. Human-authored interfaces create different interaction languages for different interaction types. A destructive action feels different from navigation. An editable field affords differently from a static one. AI creates one affordance pattern and applies it to everything because differentiated interaction styling appears less consistently in training data than uniform hover states.
- Differentiate affordance by interaction type and stakes. Destructive actions should feel heavier than navigation. Draggable elements should signal draggability differently from clickable ones. Editable fields should look editable at rest, not only on hover.

**Arbitrary Tailwind values instead of system tokens**
- Components using numerous one-off arbitrary values — `rounded-[17px]`, `px-[13px]`, `mt-[37px]`, `text-[15px]` — in contexts where the surrounding design system already defines equivalent spacing, sizing, or radius tokens.
- AI agents often tune visual output by adjusting raw numbers until things look right rather than reaching for the design system's defined scale. The result is a codebase full of magic numbers that drift from each other and cannot be updated systematically. This is distinct from intentional arbitrary values used to hit a specific design specification.
- Replace arbitrary values with the nearest system token where one exists. Introduce a token if the value recurs. Reserve arbitrary values for genuinely one-off cases — a specific illustration dimension, a unique layout constraint — not routine spacing and typography.

**Uniform component density regardless of context**
- Every component using the same padding and spacing regardless of information density or user task — data tables as spacious as marketing cards, navigation as generous as editorial content.
- Different contexts require different information density. AI generates one density and applies it everywhere.
- Calibrate density to the task. Data-heavy surfaces should be denser than reading-focused ones. Navigation should be more compact than content.

**Context-free component selection**
- Using the same component pattern (modal, sidebar, inline, tooltip) for interactions of vastly different complexity and stakes — a destructive confirmation in the same modal as a simple filter selection.
- AI selects components based on pattern frequency rather than interaction semantics. The result is a product where minor and major interactions feel identical.
- Match the component to the stakes and complexity of the interaction. Destructive actions warrant more friction. Complex configurations warrant more space.

**Placeholder content never replaced**
- Lorem ipsum in visible UI, "User Name" as a display name, `company@example.com` as a contact, `$0.00` as a default price, or similar placeholder values in shipped UI.
- AI generates placeholder content as part of the initial scaffold and it is left in place. This is one of the most direct signals that UI was generated and not reviewed.
- Treat all placeholder content as a failing test. No placeholder survives into production. Use representative content from the actual domain.

**Information architecture as feature inventory**
- Screens organized around what the product has rather than what the user does — capability lists, tool grids, feature sections presented as browsable inventories — where the user's actual job is creating, editing, or completing a workflow.
- Distinct from dashboard syndrome (which is a layout primitives problem): this is a mental model problem. AI models what the product contains rather than what the user accomplishes. The result is products that feel like catalogs of features rather than tools for getting work done. Navigation labels name product areas ("Analytics," "Integrations," "Templates") instead of user jobs ("Track performance," "Connect your tools," "Start from a template").
- Organize screens and navigation around user workflows, not product capabilities. Ask what the user is trying to accomplish on this screen, then design the surface for that job. Name things by what the user controls and recognizes, not by how the system is built.
