import { useEffect, useRef } from 'react';
import { renderPortrait } from '../game/render/scene.js';
import { danceState } from '../game/render/dance.js';

// A live crocodile in a box, used for ladder portraits and the customise
// preview. Same rig as the arena, so a tint change reads exactly as it will in
// the fight.
export default function CrocPortrait({
  tint = '#ffffff',
  scales = 30,
  maxScales = 40,
  width = 150,
  height = 130,
  zoom = 1,
  animated = true,
  dancing = false,
  className = ''
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const t0 = performance.now();
    const draw = (now) => {
      const t = (now - t0) / 1000;
      renderPortrait(ctx, {
        tint,
        scales,
        maxScales,
        time: t,
        dance: dancing ? danceState(t % 9) : null,
        w: width,
        h: height,
        zoom
      });
      if (animated) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [tint, scales, maxScales, width, height, zoom, animated, dancing]);

  return <canvas ref={ref} className={className} style={{ width, height, display: 'block' }} />;
}
