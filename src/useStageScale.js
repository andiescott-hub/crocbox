import { useEffect, useState } from 'react';
import { STAGE } from './game/constants.js';

// One scale factor for the whole 1120x671 frame, so the HUD keeps the exact
// logical pixel sizes the handoff specifies at any window size.
export function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const k = Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h);
      // Round down so a fractional pixel never clips the right-hand HUD anchor.
      setScale(Math.max(0.2, Math.floor(k * 1000) / 1000));
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
  }, []);
  return scale;
}
