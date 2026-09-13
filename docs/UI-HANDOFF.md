# Handoff: Croco Box — crocodile boxing game UI

## Overview
Croco Box is a game concept by Tristan (age ~8), captured in a recorded conversation on 12 September 2026. The player is a crocodile in a colossal roofed boxing stadium. You train on hanging punching bags, fight rival crocodiles one-on-one, and earn crocodile scales as currency. Scales buy hearts, food, sharper claws and tougher bags. Clear the top bag with enough scales and a harder "dimension" opens.

This handoff covers the **in-game HUD and menu screens** — not the 3D game itself. The stadium, crocodiles and bags in the mockups are AI-generated concept renders standing in for real game art; the deliverable to build is the interface that sits on top of them.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy directly. The task is to **recreate these designs in the target codebase's existing environment** (React, Unity UI, Godot, SwiftUI, whatever the game is built in) using its established patterns and libraries. If no environment exists yet, choose the framework most appropriate for the project and implement there.

In particular: the HTML mockups position HUD elements with absolute pixel offsets inside a fixed 1120x671 frame. In a real game these must become anchored, resolution-independent layout (corner anchors + safe-area insets), not hard-coded pixels.

## Fidelity
**High-fidelity** for the HUD and menu chrome — colours, typography, sizing, corner radii, blur and shadow values are all final and listed below; recreate them faithfully using the codebase's existing UI libraries.

**Concept-only** for everything behind the HUD. The crocodiles, stadium, floor, lighting and punching bags are placeholder concept art. Do not attempt to recreate them from the HTML — they are either raster images or, in the vector concept sheet, hand-drawn SVG approximations that exist only to communicate framing.

## Screens / Views

### 1. Match view (third person)
**Purpose:** The player fights one rival crocodile. Win by knocking the opponent out or knocking it out of the stadium.

**Layout:** Full-bleed game viewport. HUD is a five-anchor overlay — top-left, top-centre, top-right, bottom-left, bottom-right — with a 26px inset from every frame edge. Nothing occupies the centre of the screen.

**Components**

*Player health (top-left)*
- Vertical stack, 9px gap. Label "YOU" above a horizontal row of heart cells, 6px gap.
- Label: Bungee 17px, #bfe06e, letter-spacing 1px, text-shadow 0 2px 8px #000.
- Filled heart cell: 29x26px, radius 3px, `linear-gradient(#ff6a5c, #c31f1f)`, `box-shadow: inset 0 -6px 8px rgba(0,0,0,0.33), 0 2px 8px rgba(0,0,0,0.67)`.
- Empty heart cell: same size and radius, `background: rgba(16,19,14,0.72)`, `border: 2px solid #545a48`, border-box sizing.
- Shown at 6 cells, 4 filled. Max heart count is not fixed — hearts are purchasable (20 scales each), so the row must grow.

*Opponent health (top-right)*
- Same stack mirrored to the right (align-items: flex-end).
- Label "CROC #4": Bungee 17px, #f0a05c. Opponent number is the ladder position.
- 5 cells, 3 filled.
- Reward line below: Chakra Petch 15px, #e2e6d6, letter-spacing 1px; the value "8 SCALES" in #bfe06e weight 700.

*Objective banner (top-centre)*
- Text "KNOCK HIM OUT OF THE STADIUM": Bungee 16px, #f6b455, letter-spacing 2px, `text-shadow: 0 2px 12px #000, 0 0 26px rgba(246,180,85,0.4)`.
- Progress bar below, 9px gap: 360x9px, radius 5px, track `rgba(12,15,10,0.78)` with `1px solid #4a5040` and `inset 0 2px 5px rgba(0,0,0,0.69)`; fill `linear-gradient(#ffd287, #e0912c)` radius 5px with `0 0 14px rgba(224,145,44,0.67)` glow. Shown at 62%.
- The bar represents progress toward the ring-out, i.e. how close the opponent is to the painted boundary.

*Scale counter (bottom-left)*
- Glass panel: `rgba(9,11,8,0.68)`, `backdrop-filter: blur(7px)`, `1px solid #414736`, radius 6px, padding 11px 19px, `box-shadow: 0 10px 28px rgba(0,0,0,0.67)`.
- Row, 12px gap: scale glyph, then count, then label.
- Scale glyph: 26x32px, `linear-gradient(#d3f07a, #7ea82c)`, `clip-path: polygon(50% 0, 100% 32%, 82% 100%, 18% 100%, 0 32%)`, `drop-shadow(0 0 8px rgba(168,213,58,0.5))`.
- Count: Bungee 26px, #f2f5ea. Label "SCALES": Chakra Petch 14px, #949a85, letter-spacing 2px.

*Action buttons (bottom-right)*
- Row of three, 11px gap. Each is a 76x76px square above a 12px #949a85 key-hint label, 6px gap.
- Available button: radius 8px, `linear-gradient(rgba(28,34,22,0.78), rgba(12,15,10,0.86))`, `backdrop-filter: blur(7px)`, `2px solid #9cc94f`, label Bungee #d6ed9c, `box-shadow: 0 0 22px rgba(156,201,79,0.25), 0 10px 24px rgba(0,0,0,0.67)`.
- Disabled / cooling-down button: `linear-gradient(rgba(20,22,17,0.78), rgba(9,11,8,0.86))`, `2px solid #545a48`, label #8a9079, no green glow.
- Buttons: SCRATCH (label 14px, hint "LMB"), BOX (label 18px, hint "RMB"), REGENERATE (label 12px on two lines, hint shows remaining cooldown e.g. "12s", rendered disabled).

### 2. Training row (first person)
**Purpose:** The player attacks hanging punching bags to build strength. Each bag tier has a different defence. Bags are bought and upgraded with scales.

**Layout:** Full-bleed viewport, 26px insets. Four anchors — top-left, top-right, upper-centre, bottom-left, bottom-right. The lower centre is deliberately clear because the player's own claws occupy it.

**Components**

*Player health (top-left)* — heart row only, no label. 4 cells, 3 filled. Same cell spec as match view.

*Scale counter (top-right)* — compact variant of the bottom-left panel: padding 10px 17px, glyph 21x26px, count Bungee 21px, no "SCALES" label.

*Bag status (upper-centre, 92px from top)*
- Text "LVL 2 STUDDED — HURTS TO SCRATCH": Bungee 15px, #f6b455, letter-spacing 2px, `text-shadow: 0 2px 12px #000`. Format is `LVL {n} {MATERIAL} — {DEFENCE DESCRIPTION}`.
- Progress bar below, 8px gap: 300x8px, radius 5px, same track and fill as the objective bar. Shown at 44%. Represents damage dealt to the current bag.

*Action buttons (bottom-left)*
- Vertical stack, 8px gap: SCRATCH, then BOX. Pill style, not square: radius 6px, padding 10px 20px, `rgba(9,11,8,0.68)`, `backdrop-filter: blur(7px)`, `2px solid #9cc94f`, Bungee 15px #d6ed9c, `box-shadow: 0 10px 24px rgba(0,0,0,0.67)`.

*Context actions (bottom-right)*
- Vertical stack, 8px gap, right-aligned.
- "UPGRADE BAG 50": neutral panel, `1px solid #414736`, radius 6px, padding 10px 18px, Chakra Petch 15px #e2e6d6 letter-spacing 1px; the cost "50" in Bungee #bfe06e. Cost comes from the bag tier.
- "LEAVE TRAINING": amber-outlined, `2px solid #f0b256`, radius 6px, padding 10px 18px, Bungee 14px #f6c987.

### 3. Bag tiers (reference, from the vector concept sheet)
Five tiers, ascending in height and defence. Each shows name, defence description, and state (OWNED / cost in scales / LOCKED).
1. LVL 1 CANVAS — "No defence" — owned
2. LVL 2 STUDDED — "Hurts to scratch" — owned
3. LVL 3 IRON — "Needs sharp claws" — 50 scales
4. LVL 4 SHIELDED — "Blocks every 3rd hit" — locked
5. LVL 5 (unnamed, violet) — "Beat it with enough scales and the dimension opens" — 200 scales

Tier 5 uses a separate violet accent set: fill `linear-gradient(90deg, #161233, #2f2560 34%, #40317e 48%, #241c50 76%, #120f28)`, border #6B4BD6, text #b79bff, glow `0 0 56px rgba(107,75,214,0.35)`.

### 4. Market (reference, from the vector concept sheet)
Four stalls in a 4-column grid, 24px gap. Each card: `linear-gradient(rgba(30,34,25,0.9), rgba(16,19,13,0.95))`, `1px solid #343a2c`, radius 6px, `box-shadow: 0 18px 34px rgba(0,0,0,0.55)`, with a 16px striped awning strip across the top (`repeating-linear-gradient(90deg, <accent> 0 20px, #e8e0cd 20px 40px)` plus `inset 0 -5px 8px rgba(0,0,0,0.35)`).
Card body: 22px padding, centred column, 15px gap — icon, name (Bungee 19px #eef1e6), description (15px #858b78), then a price button (full width, `linear-gradient(rgba(40,54,24,0.9), rgba(24,32,15,0.9))`, `1px solid #9cc94f`, radius 4px, padding 11px, Bungee 17px #cfe98d).

| Stall | Awning accent | Description | Cost |
|---|---|---|---|
| HEARTS | #c9573f | One more heart to lose before you're out | 20 scales |
| FOOD | #d79a3c | Refills hearts you already have | 5 scales |
| CLAWS | #8fae4a | Better scratching and better boxing | 35 scales |
| BAGS | #8a6a3c | Next bag up, next defence to beat | 50 scales |

### 5. Croc select ladder (reference, from the vector concept sheet)
Header "CHOOSE A CROC TO FIGHT" (Bungee 26px #eef1e6) with the scale counter right-aligned. Below, a 6-column grid, 18px gap, of opponent cards. Each card: portrait, name, scale reward, state.

Reward doubles down the ladder: croc 1 = 1 scale, croc 2 = 2, croc 3 = 4, croc 4 = 8, croc 5 = 16, dimension 2 = 32. Opponent portraits get visibly larger with rank.

Card states:
- **Beaten** — `opacity: 0.82`, state label "BEATEN" (13px #6d7365).
- **Available** — `2px solid #9cc94f`, `box-shadow: 0 0 40px rgba(156,201,79,0.22)`, and a FIGHT button (`linear-gradient(#c6ea7d, #8bb83c)`, radius 4px, padding 7px 16px, Bungee 14px #101310).
- **Locked by progression** — normal card, state label "BEAT CROC 4 FIRST".
- **Dimension gate** — violet card, `1px solid #6B4BD6`, `box-shadow: 0 0 36px rgba(107,75,214,0.22)`, label "DIMENSION 2", subtitle "HARDER. PAYS MORE."

## Interactions & Behavior

**Match flow**
1. Player opens the croc select ladder and taps an available opponent -> FIGHT.
2. Match starts in the stadium. Camera mode is player-switchable between first person and third person; the transcript explicitly calls for both, plus a front-facing third-person view.
3. Combat has two attacks — SCRATCH (claws) and BOX. Crocodiles fight on all fours; they wear no gloves.
4. REGENERATE is a cooldown ability: the crocodile rears up onto two legs, restores hearts, and drops back down. It is animation-locked and should read as a commitment — the button renders disabled with a seconds countdown while cooling.
5. Win condition is either health depletion (knockout) or pushing the opponent past the painted boundary (ring-out). The objective progress bar tracks ring-out proximity.
6. On win, award the opponent's scale reward and mark that ladder entry beaten, unlocking the next.

**Training flow**
- Attacking a bag fills its damage bar. Higher tiers resist: LVL 2 damages the player on scratch, LVL 3 requires a claw upgrade to damage at all, LVL 4 blocks every third hit.
- UPGRADE BAG spends scales and advances the tier. Clearing the top tier with sufficient scales unlocks the next dimension.

**Economy**
- Scales are the single currency, earned only by beating crocs.
- Prices: food 5, hearts 20, claws 35, bags 50, dimension gate 200.
- Purchases must fail gracefully when the player can't afford them — the price button should render in a disabled state rather than erroring on tap.

**HUD behaviour**
- Heart cells animate from filled to empty on damage; the objective and bag bars tween rather than snapping.
- Glass panels use backdrop blur; if the target platform can't blur cheaply behind a 3D scene, substitute a flat `rgba(9,11,8,0.82)` fill — do not drop the panel entirely, the text needs the contrast.
- No element sits in the centre of the screen during a match.

**Responsive behaviour**
- HUD anchors to corners with a consistent inset; it must not scale with resolution. Panel sizes are fixed in logical pixels at the 1120px-wide reference.
- Bag tier and market grids reflow from 4-6 columns down to 2 on narrow viewports.

## State Management

```
player:   { hearts, maxHearts, scales, clawLevel, bagLevel, dimension, cameraMode }
ladder:   [ { id, rank, reward, state: 'beaten' | 'available' | 'locked' } ]
match:    { opponentId, playerHearts, opponentHearts, ringOutProgress, regenCooldown, status }
training: { bagTier, bagDamage }
shop:     derived — affordability per item from player.scales
```

Transitions: selecting an opponent moves ladder -> match. Match end awards `reward` to `player.scales`, sets that entry to `beaten` and the next to `available`. Purchases decrement `player.scales` and increment the matching stat. Clearing the top bag tier with scales >= the gate cost increments `player.dimension` and regenerates the ladder at higher difficulty and reward.

No data fetching — all state is local to the session, plus a save.

## Design Tokens

**Colour**
```
--ink-900            #070806   frame / page background
--ink-800            #0a0b09   viewport background
--ink-700            #12150f   card background
--panel-glass        rgba(9,11,8,0.68)    HUD panel fill (with blur 7px)
--panel-flat         rgba(9,11,8,0.82)    no-blur fallback
--panel-border       #414736
--card-border        #343a2c
--stroke-muted       #545a48   disabled border, empty heart border
--cell-empty         rgba(16,19,14,0.72)

--green-400          #bfe06e   primary accent, values, player label
--green-500          #9cc94f   active button border
--green-300          #d6ed9c   active button label
--green-600          #7ea82c   scale glyph gradient end
--green-200          #d3f07a   scale glyph gradient start
--green-btn-from     #c6ea7d   FIGHT button gradient
--green-btn-to       #8bb83c

--amber-400          #f0b256   annotation, secondary action
--amber-300          #f6b455   objective text
--amber-200          #f6c987   secondary action label
--amber-fill-from    #ffd287   progress fill
--amber-fill-to      #e0912c
--orange-400         #f0a05c   opponent label

--red-heart-from     #ff6a5c   heart cell gradient
--red-heart-to       #c31f1f

--violet-500         #6B4BD6   dimension gate border
--violet-300         #b79bff   dimension gate text
--violet-200         #9c8ad4   dimension gate subtitle

--text-100           #f2f5ea   counters
--text-200           #eef1e6   headings
--text-300           #e2e6d6   body on glass
--text-400           #949a85   labels, key hints
--text-500           #858b78   card descriptions
--text-600           #6d7365   beaten / disabled state
```

**Typography**
- Display / numerals / buttons: **Bungee** 400. Sizes 12, 14, 15, 16, 17, 18, 19, 21, 26, 56px. Letter-spacing 1px at label sizes, 2px on all-caps banners.
- UI text: **Chakra Petch** 400/600/700. Sizes 14, 15, 17, 19px. Line-height 1.65 for paragraphs.
- Documentation only: **IBM Plex Mono** 400/500, 15px / 1.72.
- Both game faces are Google Fonts. If licensing in the target build is a problem, substitute a wide slab display face and a squared technical sans; do not fall back to a geometric sans, it loses the arcade signage read.

**Spacing** — 6, 8, 9, 11, 12, 14, 18, 22, 24, 26, 36, 40, 56px. HUD edge inset is 26px; card padding 22-30px.

**Radius** — 3px (heart cells), 4px (price buttons), 6px (panels, pills, cards), 8px (square action buttons), 50% (eye/portrait ellipses).

**Shadow & blur**
```
panel        0 10px 28px rgba(0,0,0,0.67)   + backdrop-filter: blur(7px)
button       0 10px 24px rgba(0,0,0,0.67)
button-glow  0 0 22px rgba(156,201,79,0.25)
card         0 18px 34px rgba(0,0,0,0.55)
cell-inset   inset 0 -6px 8px rgba(0,0,0,0.33), 0 2px 8px rgba(0,0,0,0.67)
bar-inset    inset 0 2px 5px rgba(0,0,0,0.69)
text-hud     0 2px 8px #000
text-banner  0 2px 12px #000, 0 0 26px rgba(246,180,85,0.4)
vignette     radial-gradient(ellipse 84% 72% at 50% 46%, transparent, rgba(4,5,4,0.55))
```

## Assets
- `grok_image_20260913_0a6968e2-9dc8-4d20-9158-fc509e792434.jpg` — 768x1152 AI-generated concept render (Grok), supplied by the client. Contains two stacked scenes: the match view (source y 60-520) and the first-person training row (source y 600-1080). Used as a placeholder background in the real-render mockup, cropped by absolute offset at 1120px display width. Carries a visible "Grok" watermark near the bottom edge, outside both crops. **Not licensed or suitable for production** — replace with real game art.
- The client has ~176 further renders from other angles, available for the remaining screens (market, croc select, regenerate).
- No icons are imported. The scale glyph is a CSS `clip-path` pentagon; hearts, claws, food and bags in the market are CSS shapes. Replace all of these with real icon art.
- Fonts load from Google Fonts at runtime in the mockups; bundle them in production.

## Files

| File | What it is | Use it for |
|---|---|---|
| `Croco Box Mockup (real renders).dc.html` | **Primary reference.** Match view + training row HUD over the real concept render, 1120px frames. | Exact HUD spec, layout, anchoring. |
| `Croco Box Concept Sheet v2.dc.html` | Five-frame vector concept sheet: match view, first person, bag tiers, market, croc select ladder. | Screens 3, 4 and 5, plus overall art direction. Ignore the hand-drawn crocodiles. |
| `Croco Box Image Prompts.dc.html` | Image-generation prompts, one per frame, plus a shared style block. | Generating replacement background art for the remaining screens. |
| `uploads/grok_image_20260913_...jpg` | The concept render used in the primary reference. | Placeholder only. |

Both `.dc.html` files are self-contained HTML — open them directly in a browser. They use inline styles throughout; there is no stylesheet to extract.

## Source of truth
Everything in this handoff traces to a recorded conversation with Tristan on 12 September 2026. Two details he had not decided, and which are deliberately unspecified here:
1. What the world outside the stadium looks like — he confirmed you can leave the boxing area, but not where you go.
2. What a boxing move actually looks like performed from a crawl.

Both need answering before combat animation work starts. Ask him.
