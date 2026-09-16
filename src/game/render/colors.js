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

// A crocodile is darkest along the spine and pale underneath, with a warmer
// olive through the flank. Seven steps rather than four, because the shading
// passes need somewhere to go.
const BASE = {
  spine: '#2f3a1b',
  back: '#46522a',
  mid: '#6f8434',
  flank: '#879c46',
  light: '#93ab52',
  belly: '#cdd39a',
  line: '#232a15'
};

// [T13] Zero scales means visibly stripped: pale hide, white waistband, red
// spotted underpants. It has to be impossible to miss from across the arena.
const PALE = '#ded7bd';

export function hideColors(tint, stripped) {
  const t = (key) => {
    const base = multiply(BASE[key], tint);
    return stripped ? mix(base, PALE, 0.66) : base;
  };
  const mid = t('mid');
  return {
    spine: t('spine'),
    back: t('back'),
    mid,
    flank: t('flank'),
    light: t('light'),
    belly: stripped ? mix(multiply(BASE.belly, tint), '#f4eddb', 0.7) : multiply(BASE.belly, tint),
    line: stripped ? mix(multiply(BASE.line, tint), PALE, 0.45) : multiply(BASE.line, tint),
    // The stadium floods are overhead, so everything catches a cool edge along
    // its top and sits in a warm shadow underneath.
    rim: mix(mid, '#fff6d8', 0.62),
    shadow: mix(t('spine'), '#000000', 0.45),
    // Scutes are keratin over bone: drier and paler than the hide around them.
    scute: mix(t('back'), '#d8dfae', 0.3),
    scuteLit: mix(t('mid'), '#eef3c8', 0.45)
  };
}

// Deterministic 0..1 from an integer, so skin texture never shimmers between
// frames the way Math.random would.
export function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const SCALE_LIT = '#d3f07a';
export const SCALE_BACK = '#6f9526';
