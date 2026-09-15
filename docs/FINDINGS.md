# Findings for Tristan

Three things came out of building the plan that the plan cannot settle on its
own. Numbers below come from `node tools/simulate.mjs`, which plays the whole
ladder headless.

## 1. Fights run 6 to 13 seconds, not 30 to 60

`PLAN.md` §1 asks for a 30 to 60 second fight. With the §5 coats (30, 40, 55,
70, 90) and the §7.1 shed counts (scratch 3, box 6, bite 12), a coat is stripped
in five to twelve landed hits. At any cadence that still feels lively, that is a
ten second fight. The two sets of numbers cannot both hold.

Two ways out, and they are his call:

- **Bigger coats.** Roughly doubling them and halving the opponents' punch
  gets fights to 15 to 20 seconds and lifts ring-outs from 5% to about 30%:
  `coat 55/80/110/150/200, power 0.34/0.44/0.56/0.66/0.76`. The suggestion is
  written into `src/data/ladder.js` as a comment. Coats are already flagged
  [proposed] in the plan and are open question 5, so this is the cheaper change.
- **Smaller shed counts.** Those come from the VFX prototype, so changing them
  changes the look of a hit as well as the maths.

## 2. Nothing ever dies to hearts

Across thousands of simulated fights, the knockout-by-hearts route fires
essentially never. It cannot: hearts are only reachable at zero scales, zero
scales is inside the under-25 finisher window, and any jump bite in that window
kills outright. So the finisher always gets there first, and hearts only decide
a fight if neither crocodile throws a bite.

This follows directly from the [T13] rules rather than from any tuning, and it
matches the plan's own line that a stripped crocodile is "one good hit from
losing". But it does mean the heart row, the FOOD stall and REGENERATE are all
paying for a phase of the fight that mostly does not happen. Endings currently
split roughly 90% finisher, 10% ring-out, 0% knockout.

If hearts are meant to matter, the smallest fix is to make the finisher require
something more than being under the threshold, and that is a change to his rule.

**Resolved, and it needs Tristan's blessing.** This surfaced in his hands as
"box and scratch don't have much impact", which is the same finding wearing
different clothes. Two changes fixed it.

First, the stance grid: the jump bite is no longer a button, it is a jump and
then a bite, so the finisher costs two correct inputs and can be answered with
a crouched uppercut or a guard.

Second, and this is the one that needs him, the threshold moved from 25 scales
to none at all. The measurement that settled it: at 25, against croc 1's
30-scale coat, the lethal window was open for **half** of every fight, because
one box puts him under it. At zero it is open for a **fifth**. Endings went
from 95% finisher to 55-81% finisher, 6-45% ring-out and 0-13% knockout, and
fights stretched from six seconds to ten to eighteen.

It also makes his own rule visible. Under 25 scales looks like any other
crocodile. No scales at all is the underpants state he designed, readable from
across the arena, and the plan already calls it "one good hit from losing".
Now it is.

## 3. The finisher reward and the ladder reward disagree

§3 says the winner of a finisher "takes the target's scales". §5 fixes the
reward at 1, 2, 4, 8, 16, and the HUD in the handoff prints that reward on
screen before the fight starts. Croc 5 carries 90 scales and pays 16.

The build pays the fixed ladder reward, because that is what the HUD promises
and what the README specs. Worth confirming that is what he meant.

## Still open from §11

Unanswered and unbuilt:

1. Do scales on the floor get picked up, or just fade? Currently they fade. The
   particle system already carries the flag needed to make them collectable.
2. Should your own scales fly towards the camera? Wired (`towardCamera` in
   `spawnScales`) and currently on for the player, subtle enough to change.
3. When a crocodile regenerates its coat, are those the same scales? Currently
   a fresh full coat between matches.
4. Can an opponent finish you with a jump bite? **Built as yes**, both ways.
   It is what makes shopping before a fight a real decision.
5. How much armour should each croc have? See finding 1.
6. Does the crocodile have a name already? Currently defaults to CROCO and the
   customise screen lets him change it.
