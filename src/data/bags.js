// Bag tiers - README §3. Tier 5 is the dimension gate and stays visible but
// unreachable in v1 (PLAN.md §1: dimension 2 is parked).
export const BAGS = [
  {
    tier: 1,
    name: 'CANVAS',
    defence: 'NO DEFENCE',
    cost: 0,
    hp: 60,
    hurtsToScratch: false,
    needsClaws: 0,
    blocksEveryThird: false
  },
  {
    tier: 2,
    name: 'STUDDED',
    defence: 'HURTS TO SCRATCH',
    cost: 0,
    hp: 110,
    hurtsToScratch: true,
    needsClaws: 0,
    blocksEveryThird: false
  },
  {
    tier: 3,
    name: 'IRON',
    defence: 'NEEDS SHARP CLAWS',
    cost: 50,
    hp: 180,
    hurtsToScratch: true,
    needsClaws: 1,
    blocksEveryThird: false
  },
  {
    tier: 4,
    name: 'SHIELDED',
    defence: 'BLOCKS EVERY 3RD HIT',
    cost: 50,
    hp: 260,
    hurtsToScratch: true,
    needsClaws: 2,
    blocksEveryThird: true
  },
  {
    tier: 5,
    name: 'DIMENSION',
    defence: 'BEAT IT WITH ENOUGH SCALES AND THE DIMENSION OPENS',
    cost: 200,
    hp: 400,
    hurtsToScratch: true,
    needsClaws: 3,
    blocksEveryThird: true,
    locked: true
  }
];

export const getBag = (tier) => BAGS.find((b) => b.tier === tier) ?? BAGS[0];
export const BAG_UPGRADE_COST = 50;
