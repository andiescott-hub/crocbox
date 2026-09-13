# Croco Box — build plan

Companion to `README.md`. The README is the UI handoff: HUD anatomy, design tokens, exact colours
and sizes. It stands. This file is the game plan that sits underneath it: what gets built, in what
order, and how the systems actually work.

Where the two disagree, this file wins, because it carries decisions Tristan made on 13 September
2026 that postdate the handoff. Those decisions are marked **[T13]**.

Everything here traces to Tristan. Where a number was invented to make a system work, it is marked
**[proposed]** and needs his sign-off before it hardens.

---

## 1. What we are building

A 2D browser game. Side-on arena, sprites over stadium backdrops, no 3D engine.

**Stack**
- React + Vite. Single page, no router, no server.
- Game state in one reducer. No state library.
- Save to `localStorage` under one key.
- Canvas for the arena and all VFX. DOM for the HUD and menus, so the README's HUD spec ports
  directly as styled elements rather than being redrawn in canvas.
- Deployed to Vercel. Tristan opens a URL on the iPad. No install, no account, no login.

**Explicit non-goals for v1**
- No 3D, no physics engine, no animation middleware.
- No multiplayer, no leaderboard, no accounts.
- No world outside the stadium. **[T13]** Nothing exists outside it for now. Later levels may open
  it up; nothing in v1 should assume it stays closed forever, but nothing should build for it either.
- Dimension 2 is parked. **[T13]** Build the ladder so a second dimension can be appended later
  (see §5), but do not build the gate, the violet tier or the difficulty scaling yet.

**Target feel.** A fight lasts 30 to 60 seconds. A play session is five or six fights. It must be
possible to lose, retry and be back in the arena within three seconds.

---

## 2. Scales, hearts and armour

This is the core model and everything else hangs off it.

**Scales are armour that you can also spend.** They sit on the outside of the crocodile. Hits knock
them off. They are also the only currency.

**Hearts are health underneath.** Once a crocodile has no scales left, hits go to its hearts. At
zero hearts it is knocked out.

So a fight has two layers. Strip the armour, then go for the kill. **[proposed]** The README's
hearts, the market's heart and food stalls and the HUD heart row all survive intact under this
model, which is why it is the recommended reading of Tristan's "you lose your scales too". Confirm
with him before building.

**Both fighters work this way.** **[T13]** The player's scales come off exactly as an opponent's do.

**The underpants state.** **[T13]** A crocodile with zero scales is visibly stripped: pale hide,
white waistband, red spotted underpants. This is the readable signal that it is one good hit from
losing, and it replaces the need for an opponent health bar to be read carefully. It should be
impossible to miss from across the arena.

**Regeneration.** **[T13]** Opponents regrow their scales. **[proposed]** Between matches only, not
during. Leave the arena and come back and croc 3 is fully coated again. This makes refighting a
beaten croc a slow but real way to farm scales, and it keeps mid-fight tuning simple. Mid-fight
regrowth is a good v2 idea and a bad v1 one.

**Spending is risky.** Because scales are armour and money at once, a shopping spree before a fight
sends you in underdressed. That tension is the point and should not be designed away. It does mean
prices need watching once the game is playable: if the player is permanently broke and permanently
naked, drop prices before touching the model.

---

## 3. Combat

### Arena

Side-on. Both crocodiles on all fours, facing each other, on bare concrete. A painted amber
boundary line at each end. The camera follows the midpoint between the fighters.

### Moves

| Move | Input | Speed | Effect |
|---|---|---|---|
| Scratch | LMB / left tap | Fast | Small scale shed, small push |
| Box | RMB / right tap | Slow, committed | Double shed, hard push |
| Jump bite | Space / up swipe | Slow, leaves the ground | Big shed, and the finisher (below) |
| Regenerate | E / hold | Cooldown, animation locked | Restores hearts, cannot act during |

**Box is one arm.** **[T13]** On all fours a crocodile punches with one front leg, either the left
or the right, while the other three legs hold it up. Alternate arms on consecutive punches. This is
the answer to the README's open question about what a boxing move looks like from a crawl.

**Jump bite.** **[T13]** The crocodile leaves the ground, comes down jaws first. It is the only move
with air time, so it is also the only move with real risk: **[proposed]** the biter cannot turn or
block while airborne, and a bite that misses leaves it open for roughly a second.

### The finisher

**[T13]** If the target has fewer than 25 scales when a jump bite connects, the bite kills
instantly. The match ends and the winner takes the target's scales.

This is the single most important number in the game and it needs care:

- It applies **both ways**. **[proposed]** An opponent can finish the player the same way. Anything
  else makes the rule feel like a cheat code rather than a duel, and the danger is what makes
  stripping your own armour to go shopping a real decision.
- Opponent scale coats must therefore start **above 25**, or every croc dies to an opening bite.
  See §5 for the proposed coats.
- The threshold is a tuning dial. Start at 25 and expect to move it.

### Winning

Two ways, as Tristan specified:
1. **Knockout.** Strip the scales, then empty the hearts. Or land the jump bite finisher.
2. **Ring-out.** Push the opponent past the painted boundary. Every landed hit shoves; box shoves
   hardest. The README's objective progress bar tracks distance to the line, so the HUD element
   already specced drives itself.

Both routes stay live the whole fight, so the player chooses between chipping away and committing
to a shove.

### Losing

**[T13]** You lose 5 scales. That is all. No hearts lost permanently, no progress lost, no ladder
position lost. Floor the scale count at zero so a broke player cannot go negative. Retry must be
one tap from the defeat screen.

---

## 4. Screens and flow

```
title
  └─ croc select ladder ──► match ──► result (dance) ──► ladder
       ├─ market
       ├─ training row
       └─ customise
```

Five screens, all specced for layout and colour in `README.md` §3 to §5 except customise, which is
new.

**Result screen.** **[T13]** Not an instant cut to a menu. The loser dances in the middle of the
arena (§7.2) while the winner's scale count ticks up on the HUD. Any input skips it. Assume Tristan
will skip it by the fiftieth fight and make sure skipping is instant.

---

## 5. Economy and progression

Prices unchanged from the README: food 5, hearts 20, claws 35, bags 50.

**Ladder rewards** stay as Tristan designed them, doubling down the ladder: 1, 2, 4, 8, 16.

**Opponent scale coats** are separate from the reward and are a new number this plan introduces,
because the finisher rule needs them. **[proposed]**

| Croc | Coat | Hearts | Reward |
|---|---|---|---|
| 1 | 30 | 3 | 1 |
| 2 | 40 | 4 | 2 |
| 3 | 55 | 5 | 4 |
| 4 | 70 | 5 | 8 |
| 5 | 90 | 6 | 16 |

All coats start above the 25 finisher threshold, so the bite is an endgame move rather than an
opener. The gap between coat and threshold widens up the ladder, so higher crocs take more work to
get into finisher range.

**Dimension 2** is out of scope. **[T13]** Keep the ladder data-driven (an array of croc configs,
not five hardcoded cards) so a second set can be appended without a rewrite.

---

## 6. Customisation

**[T13]** New screen, not in the README. Three things the player can change:

1. **Crocodile name.**
2. **Tint colour.** A colour multiply over the crocodile sprite. The art is desaturated olive, so a
   multiply actually reads. Offer a fixed palette rather than a free colour picker; a free picker
   produces invisible crocodiles.
3. **Nameplate text** floating above the crocodile's head in the arena. Separate from the name, so
   it can be a taunt rather than a label.

This screen also hosts victory dance recording (§7.3).

Build this early. It is the first thing a kid wants to touch and it costs almost nothing.

---

## 7. Animation

Working prototypes for 7.1 and 7.2 are in `Croco_Box_VFX_Prototypes.html`. The crocodiles in that
file are deliberately crude stand-ins. The motion and the numbers are the deliverable, not the
drawing.

### 7.1 Losing scales

Individual scale particles come off at the point of impact.

- Scales flip end over end, not spin flat. Horizontal squash on `cos(spin)`; lit face `#d3f07a`,
  back face `#6f9526`.
- Gravity `0.46`, air drag `0.992`, floor restitution `0.35`, horizontal friction `0.66` per bounce.
- Shed counts before multipliers: scratch 3, box 6, bite 12.
- Screen shake scales with the move: 5, 11, 17.
- Landed scales rest about a second, catch a white glint, then fade.

### 7.2 The loser's dance

**[T13]** Three beats: flat on its back with stars circling, a slow ease-out push up onto the hind
legs so the last part of standing is unsteady, then a loop. In the loop the crocodile hops foot to
foot, hips swaying, tail counter-swinging, head tilting against the lean, front arms clamped over
its underpants and jiggling half a beat behind the body. Crossed eyes, tongue flicking on the same
beat as the feet.

**[T13]** The player's crocodile does the same dance when it loses. Same animation, no special case.

One sine wave drives every part, so the dance is five numbers over time: tempo, hop height, lean,
arm position, head tilt. That matters for 7.3.

### 7.3 Victory dance capture

**[T13]** On a win, Tristan dances in front of the iPad camera and his crocodile copies him.

Because the dance in 7.2 is parameterised, this does not need motion capture or skeleton
retargeting. It needs those same five numbers, extracted from video.

**Approach**
- MediaPipe Pose in the browser, on-device, about 30fps on an iPad. 33 body points per frame.
- Derive the five signals: vertical bounce frequency becomes tempo, shoulder tilt becomes lean,
  wrist height becomes arm position, head angle becomes head tilt, bounce amplitude becomes hop.
- Store the resulting curves as JSON. A few hundred numbers, a few kilobytes.
- Replay the curves through the same rig used in 7.2.

It will approximate rather than copy. A crocodile has a tail, stubby arms and no neck. The
approximation is funnier than precision would be.

**Rules**
- **Nothing leaves the device.** Store the dance recipe, never the video. No upload, no server, no
  network call in this feature at all.
- **Opt-in and deliberate.** Recording lives in the customise screen, not as a camera that snaps on
  after every win. Flow: tap record, countdown, five seconds, preview, keep or redo, name it. Plays
  on every win until replaced. iOS needs HTTPS and a user gesture for camera access, which this
  flow provides anyway.
- **Fallback first.** Ship the win screen with the hand-animated dance. Add capture as an upgrade.
  A refused permission or a bad pose read must degrade to a crocodile that still dances, never to a
  broken victory screen.

---

## 8. Art

The project holds 176 AI-generated concept renders, all 784x1176, most of them two scenes stacked
in one portrait image. They are consistent and good: same stadium, same crocodile, same lighting.

**They are not licensed for production.** Treat them as concept and placeholder.

**What they can do.** Anything that holds still: stadium backdrops, ladder portraits, market
backdrops, loading screens, the title screen. Crop the stacked images into single panels first,
then curate hard. Twelve keepers, named by screen, beats 352 unsorted panels. Ladder portraits crop
out of existing renders, and the crocodiles in them already vary in size, which suits the README's
rule that portraits grow with rank.

**What they cannot do.** Anything that moves. A photoreal crocodile slid around as a flat sprite
reads as broken. The fighters, the bags being hit and the dancing crocodile all need art drawn for
animation, in a stylised version of the renders' look.

Set this expectation with Tristan early, framed as the poster versus the game. It goes down well in
advance and badly as a discovery.

**Missing coverage.** No dedicated market stall shot, and no rearing-up regenerate shot. Prompts 04
and 05 in `Croco Box Image Prompts.dc.html` are written and unused. Generate those.

---

## 9. State

Extends the README's shape.

```
player:   { name, tint, nameplate,
            scales, maxScales, hearts, maxHearts,
            clawLevel, bagLevel, victoryDance }
ladder:   [ { id, rank, coat, hearts, reward, state } ]
match:    { opponentId, playerScales, playerHearts,
            oppScales, oppHearts, ringOutProgress,
            regenCooldown, status }
training: { bagTier, bagDamage }
shop:     derived from player.scales
```

`victoryDance` is the captured curve set, or null.

`player.scales` is both the wallet and the armour. There is one number, not two. Resist the urge to
split it; the tension is the design.

Transitions: ladder to match on FIGHT. Match end awards or deducts scales, marks the entry beaten,
unlocks the next. Purchases decrement scales and increment the matching stat. All state is local,
plus one save.

---

## 10. Build order

Each step ends with something Tristan can play at the same URL.

1. **One fight.** Croc 1 only. Scratch, box, push, ring-out, scale shed VFX, win screen awarding 1
   scale. No menus, no bite, no hearts. This is the step that proves the game is fun. Do not move on
   until it is.
2. **The full fight.** Hearts under the scales, jump bite, the finisher, regenerate, defeat at minus
   5 scales, the loser's dance.
3. **Customise.** Name, tint, nameplate. Cheap, and the first thing he will want.
4. **Economy.** Market with all four stalls, persistent save, scales that actually buy things.
5. **Ladder.** Five crocs, unlocking, rewards, beaten states, coats that regrow between matches.
6. **Training row.** Bag tiers and their defences, upgrade with scales.
7. **Victory dance capture.** Only after 1 to 6 are solid.

---

## 11. Open questions for Tristan

Answered so far: no world outside the stadium; box is a one-armed punch from a crawl; jump bite
finishes under 25 scales; losing costs 5 scales; name, tint and nameplate are customisable; the
player dances when beaten too; the winner's dance is captured on camera.

Still open:

1. Do the scales that land on the floor get picked up, or do they just fade? (Pickups would add a
   scramble to the middle of a fight.)
2. When your own scales come off, should they fly towards the camera so it feels worse than hitting
   someone else?
3. When a crocodile regenerates its scales, are the ones that fell off gone for good, or do those
   exact scales come back?
4. Can an opponent finish you with a jump bite the same way you finish them?
5. How much armour should each of the five crocodiles have? (The §5 table is a guess.)
6. Does the crocodile have a name already, or is naming it part of playing?

---

## 12. Source of truth

- `README.md` — UI handoff. HUD anatomy, design tokens, screen layouts. Still authoritative for
  anything visual.
- `Croco Box Mockup (real renders).dc.html` — exact HUD spec over a real render.
- `Croco Box Concept Sheet v2.dc.html` — bag tiers, market, ladder.
- `Croco Box Image Prompts.dc.html` — prompts for generating the missing art.
- `Croco_Box_VFX_Prototypes.html` — working scale shed and loser's dance, with tuning dials.
- This file — game systems, combat, economy, animation and build order.

Design decisions come from recorded conversations with Tristan on 12 and 13 September 2026. Anything
marked **[proposed]** is not his and should be checked before it hardens.
