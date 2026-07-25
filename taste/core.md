# core.md — Timeless Design Principles

These principles are grounded in how humans perceive, process, and interact with visual information. They do not reference trends, frameworks, or tools. They were true before the web existed and will be true after current tools are obsolete.

Each principle follows the same structure: the invariant rule, the perceptual or cognitive basis, and explicit behavioral instructions for modifying UI.

core.md defines invariant principles. edge.md and slop.md may adapt style, but they must never violate these principles.

---

## Meta-principle: Attention is the resource

Every visual element consumes attention. Attention is finite and scarce. The purpose of every design decision is to spend it where it produces understanding and recover it everywhere else.

The interface is not the product. The user's task is the product. Every principle in this file exists to reduce the cost of accomplishing that task.

Most principles below are direct consequences of this constraint. Predictability and error prevention are grounded in trust — which is a precondition for attention being well-spent at all.

---

## Principle tiers

Principles are not equally fundamental. When two principles conflict, higher tiers take precedence.

**Tier 1 — Foundational (govern everything else)**
Hierarchy, Structure, Cognitive effort

**Tier 2 — Perceptual encoding (how information is communicated)**
Spacing, Typography, Color

**Tier 3 — Interaction (how users act and receive response)**
Affordance, Interactive targets, Feedback, Motion, Spatial stability

**Tier 4 — System integrity (how the interface holds together over time)**
Error prevention, Predictability, Economy, Progressive disclosure, Recognition over recall

---

## Tier 1 — Foundational

---

## 1. Hierarchy

**Every screen must have exactly one dominant focal point.**

Human vision is drawn first to the element with the greatest contrast, scale, or isolation relative to its surroundings. When multiple elements compete for dominance, the user must consciously decide where to look — a cost the interface should never impose. One thing is most important. Everything else is less important. The visual weight of every element must reflect that ranking without ambiguity.

*When editing UI:* Identify the single most important action or piece of information on the screen. Ensure it has more visual weight than everything else through size, contrast, color, or isolation. If two elements feel equally loud, reduce the weight of the less important one. Never add emphasis to the primary element without first checking whether anything else competes with it.

---

## 2. Structure

**Structure is what element arrangements mean. Layout is where elements are placed. Design structure first.**

Visual grouping is automatic. Things that are close together are perceived as related. Things that share visual properties belong to the same category. Things enclosed together form a unit. Users perceive these relationships without effort. If the structure does not match the content's actual logic, users will feel the mismatch even if they cannot name it.

*When editing UI:* Determine what relationships the content has before deciding where anything goes. Group related elements through proximity before reaching for borders, dividers, or background fills. Use consistent visual properties to signal category membership. Never use structural devices — numbered lists, grids, sidebars — unless the content's actual logic matches what that device implies.

---

## 3. Cognitive effort

**Every unnecessary choice consumes attention that belongs to the task.**

Decision time increases with the number of options. Working memory comfortably holds only a handful of items at once. Both are hard constraints on human cognition, not preferences. An interface that presents more choices than necessary, exposes implementation details, or asks users questions the system already knows the answer to is spending the user's cognitive budget on the interface instead of the task.

*When editing UI:* Remove duplicate navigation paths. Consolidate multiple primary actions into one. Replace open inputs with constrained choices wherever valid options are known. Hide settings most users will never need. Never expose a decision to the user that the system can make correctly on their behalf.

---

## Tier 2 — Perceptual encoding

---

## 4. Spacing

**Spacing communicates relationship and importance. Inconsistent spacing communicates nothing.**

The amount of space between elements signals how strongly they are related. Increased isolation around an element increases its visual prominence. A layout that uses arbitrary spacing trains users that spacing is decorative — forcing them to read content to understand relationships that should be readable from structure alone. Spacing is not padding; it is meaning.

*When editing UI:* Establish a spacing scale — a base unit and its multiples — and derive every spacing value from it. Space between sub-elements within a component must be smaller than padding within the component, which must be smaller than margins between sections. Never use arbitrary values. Adjust spacing to express relationships before adding dividers, borders, or background fills.

---

## 5. Typography

**Type size and weight establish importance. Typeface choice establishes character. Both must be deliberate.**

Typography does two jobs simultaneously: delivering content and signaling relative importance. Size and weight create the hierarchy that tells users what to read first. Typeface choice communicates the tone and expectations of the subject matter — a mismatch is felt before it is understood. Comfortable reading requires measure between 45–75 characters per line and body line height between 1.4 and 1.6; outside these ranges, reading becomes measurably more effortful.

The following are practical system constraints, not perceptual laws — but violating them reliably produces worse outcomes: more than two typeface families breaks system-level consistency; more than five distinct sizes per screen turns hierarchy into noise; more than two weights dilutes emphasis.

*When editing UI:* Choose typefaces because they reflect the tone and expectations of what is being built, not because they are defaults or fashionable. Keep the type system as small as it can be while still expressing the necessary hierarchy. Set body line height between 1.4 and 1.6. Keep measure within 45–75 characters (typically `max-width: 60ch` to `65ch` in CSS). If you find yourself adding a third family, sixth size, or third weight, treat it as a signal the hierarchy problem has not been solved — not as permission to add complexity.

---

## 6. Color

**High chromatic contrast is among the strongest available attention cues. Every use of color is a claim about importance.**

When a saturated element appears in a neutral field, it pulls attention immediately. Using color freely is equivalent to claiming that everything is equally important — which means nothing is important. Color also carries semantic meaning that users learn and rely on; inconsistent use destroys that learning. Contrast ratios are not optional: contrast sensitivity varies across users, and insufficient contrast makes an interface selectively unusable.

*When editing UI:* Reserve strong color for elements whose importance exceeds their surroundings. Use neutral, muted values for structural containers, backgrounds, and secondary content. Keep functional colors — error, success, warning, action — semantically consistent and visually distinct from brand color. Enforce a minimum contrast ratio of 4.5:1 for body text and 3:1 for large text (18pt+ or 14pt+ bold) and interactive UI components (WCAG AA). When everything is colorful, reduce — do not add.

---

## Tier 3 — Interaction

---

## 7. Affordance

**Appearance must accurately predict behavior. If it looks interactive, it must be. If it is interactive, it must look it.**

Users infer how to interact with an element from its visual properties before they touch or click it. This inference is automatic. In digital interfaces there are no physical properties to rely on — which means visual signifiers carry the entire weight of communicating interactivity. When appearance implies one behavior and actual behavior differs, users lose trust in the interface's legibility and begin to probe rather than act.

*When editing UI:* Ensure every interactive element has distinct visual properties — shape, border, elevation, color, cursor style — that non-interactive elements do not share. Ensure every non-interactive element is visually distinguishable from interactive ones. Never style a static element to look like a button. On pointer interfaces, hover and focus states are not optional — they are the signifier that confirms interactivity before commitment. On touch interfaces, active and selected states carry that weight instead.

---

## 8. Interactive targets

**Larger targets that are farther from competing targets require less precision and produce fewer errors.**

This is the invariant behind Fitts's Law: acquisition time and error rate are direct functions of target size and distance from adjacent targets. The visual size of an element and its interactive area are not required to match. Prefer larger hit areas than visual areas. Small targets and crowded controls impose motor cost on every interaction, for every user, every time.

*When editing UI:* Expand hit areas beyond visual boundaries where space allows, especially for small icons and text links. Never place a destructive action immediately adjacent to a primary action without a spatial or visual buffer. When targets must be small, increase the separation between them.

---

## 9. Feedback

**Every user action must answer: did it happen, is it happening, did it fail, and what changed?**

Users build a mental model of an interface through cause and effect. Every action is a test of that model. When feedback is absent, delayed, or ambiguous, the model breaks down — the user does not know whether to wait, retry, or abandon. Response timing has known perceptual thresholds: under 100ms feels instantaneous, under 1 second maintains flow, beyond 1 second requires a visible indicator. These thresholds are properties of human perception, not conventions.

Feedback must be proportional to the stakes of the action — a minor preference change warrants a subtle indicator; a destructive or irreversible operation warrants prominent, unambiguous confirmation. Feedback should never interrupt the user's flow unless the interruption is required by the stakes.

*When editing UI:* Every button press, form submission, and state change must produce immediate visible feedback. Success, failure, and in-progress states must be visually distinct from each other and from the default state. For operations exceeding 1 second, show a progress indicator. Never leave a user unable to tell whether their action was registered.

---

## 10. Motion

**Motion should preserve continuity or communicate change. Nothing else.**

When elements appear, disappear, or change position, motion preserves the user's spatial model of the interface. Without it, elements seem to teleport — breaking the mental map users build to navigate. Motion also communicates causality, hierarchy, and the direction of attention. Motion that serves none of these purposes is distraction dressed as polish.

*When editing UI:* Add motion only when removing it would reduce understanding. Use motion to show where elements came from and where they went. Use motion to confirm state transitions that would otherwise be ambiguous. Keep durations short — most UI transitions belong between 150ms and 300ms. Linear motion reads as mechanical; ease-out reads as natural. Never add ambient or decorative animation.

---

## 11. Spatial stability

**Controls and content should not move unless movement communicates something.**

Users build a spatial memory of an interface. They learn where things are and reach for them without looking. They also remember sequence — the relative ordering of controls and content is part of that map. When layout reflows unexpectedly, controls shift after interaction, or ordering changes without cause, that spatial memory is invalidated. Instability forces users to re-locate elements they have already learned, compounding effort across every session.

*When editing UI:* Prevent unexpected layout shift — content loading, state changes, and interactions should not reflow surrounding elements or relocate controls. Never move a control as a consequence of user interaction unless the movement is the feedback. Preserve the relative ordering of elements across states. Keep navigation, primary actions, and persistent controls in stable positions.

---

## Tier 4 — System integrity

---

## 12. Error prevention

**Preventing a mistake is always better than explaining one.**

Error messages are evidence that the interface permitted an error to occur. The best interfaces make errors structurally unlikely through constraints, unavailable invalid actions, sensible defaults, and previews before destructive actions. Recovery messaging is a fallback, not a feature. Confirmation dialogs trigger habituation when overused — users dismiss them without reading, which destroys their safety value precisely when it is most needed.

*When editing UI:* Make invalid actions unavailable or visually distinguished rather than allowing them to fail. Use input constraints to prevent invalid entries rather than validating after submission. Show previews before destructive or irreversible actions. Reserve confirmation dialogs strictly for permanent, unrecoverable operations. Write error messages that state what went wrong and what to do next — never messages that only apologize.

---

## 13. Predictability

**The same visual pattern must always mean the same thing and behave the same way.**

Users build expectations from repeated patterns. Consistency is the mechanism; predictability is the outcome. Every consistent pattern reduces the effort of using the interface. Every inconsistency forces a pause — the user must slow down, re-evaluate, and question their mental model. That doubt compounds across a session and erodes confidence in the entire system. Inconsistency is not creative variation; it is unreliability.

*When editing UI:* Use the same component for the same function everywhere. If two elements look the same, they must behave the same. If two elements behave differently, they must look different. Before introducing a new pattern, verify no existing pattern already covers the case. When updating a pattern, update it everywhere it appears.

---

## 14. Economy

**Every element that does not aid comprehension, orientation, or action degrades everything around it.**

Adding a visual element is not a neutral act. Each addition increases scene complexity, raises the cognitive effort required to parse it, and reduces the relative signal of every other element. Visual harmony — the quality that makes well-crafted interfaces feel more usable — emerges from elements each doing their job precisely. It is not produced by decoration.

*When editing UI:* Before adding any element, identify what it communicates that is not already communicated. If the answer is nothing, do not add it. When reviewing existing UI, find the element contributing the least unique information and consider removing it. Check whether anything around it improved. This applies to dividers, icons, background textures, illustrations, animations, and copy equally.

---

## 15. Progressive disclosure

**Show only what is needed for the current task. Reveal complexity on demand.**

Presenting all available options simultaneously does not empower users — it overwhelms them. Complexity that is not relevant right now is noise, and noise degrades the signal of everything around it. The right amount of information at the right time is always less than the total available information.

*When editing UI:* Default to the simplest state that allows the primary task to be completed. Put advanced options, secondary actions, and edge-case settings behind a deliberate interaction. Never surface complexity proactively that only a minority of users will need. Reveal detail as the user asks for it, not before — while keeping essential status indicators, errors, and primary actions visible at all times.

---

## 16. Recognition over recall

**Never require a user to remember something when the interface can show it instead.**

Recognition vastly outperforms recall. Users can identify a correct option far more reliably than they can generate it from memory. An interface that hides valid options, removes context between steps, or requires users to carry state across screens is shifting cognitive work onto the user that belongs in the interface. Prefer interfaces that allow users to verify their assumptions rather than remember them.

*When editing UI:* Make valid options visible rather than requiring users to know them in advance. Use labels on controls, not icons alone. Show recent items, previews, and autocomplete suggestions where relevant. Use breadcrumbs and persistent state indicators so users always know where they are. If a user must remember something across screens to complete a task, the interface is not doing its job.

---

## The test

Every accepted change should improve at least one invariant without weakening another.

If a change improves aesthetics while reducing hierarchy, clarity, predictability, or cognitive efficiency — reject it.

If a change cannot be justified by at least one principle in this file — remove it.
