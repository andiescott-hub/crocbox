# Croco Box

A 2D crocodile boxing game for the browser. React + Vite, canvas arena, DOM HUD,
one `localStorage` save, no server.

Built from two documents, both kept in `docs/`:

| Doc | What it governs |
|---|---|
| [`docs/PLAN.md`](docs/PLAN.md) | Game systems, combat, economy, animation, build order. Wins where the two disagree. |
| [`docs/UI-HANDOFF.md`](docs/UI-HANDOFF.md) | HUD anatomy, design tokens, exact colours and sizes. Authoritative for anything visual. |

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
```

Deploys to Vercel as a static build (`vercel.json` is in the repo). No install,
no account, no login: open the URL on the iPad.

## Controls

| | Desk | iPad |
|---|---|---|
| Move | `A` / `D` or arrows | left thumb anywhere on the left half |
| Scratch | left mouse or `J` | the SCRATCH button |
| Box | right mouse or `K` | tap the right half, or the BOX button |
| Jump bite | `Space` / `W` / `↑` | swipe up on the right half, or the JUMP BITE button |
| Regenerate | `E` | the REGENERATE button |
| Pause | `Esc` | the PAUSE tab |

On touch the left half is the movement hand and the right half is the fighting
hand, and the two never overlap. Put a thumb down anywhere on the left and that
spot becomes the centre: lean left to back off, lean right to close in, let go
to stop. Push past full tilt and the centre follows your thumb, so you never
run out of screen mid-fight. Speed is proportional, so a small lean is a careful
step into range and a full push is a run.

Nothing on the left half attacks, so planting a thumb never throws a punch, and
nothing on the right half moves you. A faint ring shows where the pad has taken
hold and disappears the moment you lift off.

## What is built

Build order from `PLAN.md` §10, steps 1 to 6:

1. **The fight.** Scratch, box, jump bite, regenerate. Scales as armour over
   hearts, the jump bite finisher, ring-out, per-move screen shake, the scale
   shed VFX at the prototype's exact constants.
2. **Result.** The loser's three-beat dance (flat on its back with stars, the
   unsteady push up onto the hind legs, then the loop), the winner's bounce, the
   scale count ticking on the HUD, any input skips it, retry is one tap.
3. **Customise.** Name, tint from a fixed palette, arena nameplate.
4. **Economy.** All four market stalls at Tristan's prices, one save key.
5. **Ladder.** Five crocs, unlocking, rewards, beaten states, coats that regrow
   between matches, rematches for farming.
6. **Training row.** Five bag tiers with their defences, upgrades, first-person
   claws.

**Not built:** victory dance capture (`PLAN.md` §7.3, step 7) and dimension 2.
The dance rig is already parameterised the way §7.3 needs — `danceState()` reads
five curves and falls back to the hand-animated defaults — so capture is a
matter of feeding it MediaPipe output. Dimension 2 is parked but the ladder is a
plain array of configs (`src/data/ladder.js`), so a second set appends without a
rewrite.

## Layout

```
src/
  game/
    constants.js        every tuning number the fight uses
    combat.js           the match simulation and the HUD snapshot
    fighter.js          fighter state, moves, hit detection
    ai.js               the opponent brain, one skill dial per croc
    particles.js        scale shed VFX (PLAN.md §7.1 constants)
    useInput.js         keyboard and multi-touch
    render/             arena, crocodile rig, dance, gym, scene, colours
  hud/                  HUD pieces at the handoff's exact values
  screens/              title, ladder, match, market, training, customise
  state/                reducer, context, localStorage save
  data/                 ladder, bags, market, tint palette
  styles/tokens.css     the handoff's design tokens, verbatim
tools/simulate.mjs      headless balance harness
```

The fight sim has no DOM dependency, which is what makes `tools/simulate.mjs`
possible.

## Art

Everything on screen is drawn in code. `PLAN.md` §8 rules the 176 concept
renders out for anything that moves, and there is no production art yet, so the
crocodile, the stadium and the bags are stylised placeholders sized to be
swapped for real assets. The crocodile rig is one function that poses itself
from fighter state, so replacing the drawing does not touch the animation logic.

Both fonts (Bungee, Chakra Petch) are bundled in `public/fonts` rather than
fetched from Google at runtime, as the handoff asks for production.

## Balance

`node tools/simulate.mjs [runs] [playerSkill]` plays the whole ladder headless
against a reference bot and prints win rate, fight length and how each fight
ended. Run it before touching coats, rewards or the finisher threshold.

Current reading at 250 fights per croc:

```
fresh  (45 scales, 3 hearts, claw 0)   96 / 76 / 51 / 22 / 14 %
geared (70 scales, 5 hearts, claw 2)   96 / 81 / 78 / 82 / 41 %
```

Three findings worth Tristan's attention are in
[`docs/FINDINGS.md`](docs/FINDINGS.md).

## Where the build differs from the plan

Everything below is **[proposed]** and needs sign-off.

- **Starting scales: 45.** The plan does not name a number. Thirty puts the
  player inside the 25-scale finisher window after a single box, which turns
  every fight into a bite race and stops the rest of the model from working.
- **Damage does not spill from scales into hearts on the same hit.** Strip the
  armour, then go for the kill, as two readable phases.
- **Hearts carry between fights; a defeat restores them.** Otherwise FOOD has
  no job. A defeat still costs only the five scales the plan specifies.
- **Opponents have a `power` multiplier** (0.5 up to 1.0) on what they shed off
  you, on top of the coats in §5. Without it croc 1 is not a pushover.
- **The jump bite hitbox is small and only live near the concrete.** The plan
  makes the bite the only committed move; this is what makes it dodgeable
  rather than a button that wins fights.
- **A whiffed bite opens the biter for 1.5s**, not the ~1s in §3, for the same
  reason.
- **The whole 1120x671 frame scales to fit the window.** The handoff's HUD
  values are then exact at any resolution. Portrait phones get a rotate prompt.
