// Customise tints - PLAN.md §6. A fixed palette, not a free colour picker:
// a free picker produces invisible crocodiles.
//
// Each tint is a multiply over the desaturated olive hide, so '#ffffff' is
// "no tint" and everything else darkens in its own direction.
export const TINTS = [
  { id: 'olive', name: 'SWAMP', value: '#ffffff' },
  { id: 'lime', name: 'LIME', value: '#d8ff9a' },
  { id: 'gold', name: 'GOLD', value: '#ffd479' },
  { id: 'rust', name: 'RUST', value: '#ff9a6a' },
  { id: 'blood', name: 'BLOOD', value: '#ff7d7d' },
  { id: 'grape', name: 'GRAPE', value: '#b79bff' },
  { id: 'ocean', name: 'OCEAN', value: '#7fd3ff' },
  { id: 'mint', name: 'MINT', value: '#8effd0' },
  { id: 'ash', name: 'ASH', value: '#a9ad9c' },
  { id: 'coal', name: 'COAL', value: '#6b6f63' }
];

export const getTint = (value) => TINTS.find((t) => t.value === value) ?? TINTS[0];
