export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

// The customise tint is a multiply over the desaturated olive hide (PLAN.md §6).
export function multiply(hex, tintHex) {
  const a = hexToRgb(hex);
  const b = hexToRgb(tintHex);
  return rgbToHex([(a[0] * b[0]) / 255, (a[1] * b[1]) / 255, (a[2] * b[2]) / 255]);
}

export function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

const BASE = {
  back: '#46522a',
  mid: '#6f8434',
  light: '#93ab52',
  belly: '#cdd39a',
  line: '#2b331a'
};

// [T13] Zero scales means visibly stripped: pale hide, white waistband, red
// spotted underpants. It has to be impossible to miss from across the arena.
const PALE = '#ded7bd';

export function hideColors(tint, stripped) {
  const t = (key) => {
    const base = multiply(BASE[key], tint);
    return stripped ? mix(base, PALE, 0.66) : base;
  };
  return {
    back: t('back'),
    mid: t('mid'),
    light: t('light'),
    belly: stripped ? mix(multiply(BASE.belly, tint), '#f4eddb', 0.7) : multiply(BASE.belly, tint),
    line: stripped ? mix(multiply(BASE.line, tint), PALE, 0.45) : multiply(BASE.line, tint)
  };
}

export const SCALE_LIT = '#d3f07a';
export const SCALE_BACK = '#6f9526';
