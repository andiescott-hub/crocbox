import { useEffect, useRef, useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { BAGS, BAG_UPGRADE_COST, getBag } from '../data/bags.js';
import { CLAW_MULTIPLIER, STAGE } from '../game/constants.js';
import { drawGym } from '../game/render/gym.js';
import { Bar, HeartRow, ScaleCounter } from '../hud/HudPieces.jsx';
import './training.css';

export default function TrainingScreen() {
  const { state, dispatch } = useGame();
  const { player, training } = state;
  const bag = getBag(training.bagTier);

  const canvasRef = useRef(null);
  const anim = useRef({ swing: 0, swingV: 0, flash: 0, claw: 0, side: 'right', hits: 0 });
  const [message, setMessage] = useState(null);

  const damageRatio = Math.min(1, training.bagDamage / bag.hp);
  const cleared = training.bagDamage >= bag.hp;
  const nextBag = BAGS.find((b) => b.tier === bag.tier + 1);
  const canUpgrade = !!nextBag && !nextBag.locked && player.scales >= BAG_UPGRADE_COST;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = STAGE.w * dpr;
    canvas.height = STAGE.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const a = anim.current;
      // Pendulum, lightly damped.
      a.swingV += -a.swing * 16 * dt;
      a.swingV *= Math.exp(-2.2 * dt);
      a.swing += a.swingV * dt;
      a.swing = Math.max(-0.32, Math.min(0.32, a.swing));
      a.flash = Math.max(0, a.flash - dt * 4);
      a.claw = Math.max(0, a.claw - dt * 5);
      drawGym(ctx, {
        tier: bag.tier,
        swing: a.swing,
        hitFlash: a.flash,
        time: now / 1000,
        claw: a.claw,
        clawSide: a.side,
        damage: damageRatio
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [bag.tier, damageRatio]);

  const say = (text) => {
    setMessage(text);
    window.clearTimeout(say.id);
    say.id = window.setTimeout(() => setMessage(null), 1400);
  };

  const hit = (kind) => {
    const a = anim.current;
    a.side = a.side === 'right' ? 'left' : 'right';
    a.claw = 1;

    if (cleared) {
      say('BAG CLEARED — UPGRADE IT');
      return;
    }

    // README §2: higher tiers resist.
    if (bag.needsClaws > player.clawLevel) {
      a.swingV += 0.25;
      say(`NEEDS SHARP CLAWS — BUY CLAW LVL ${bag.needsClaws}`);
      return;
    }

    a.hits += 1;
    if (bag.blocksEveryThird && a.hits % 3 === 0) {
      a.swingV += 0.3;
      say('BLOCKED');
      return;
    }

    const mul = CLAW_MULTIPLIER(player.clawLevel);
    const damage = Math.round((kind === 'box' ? 9 : 4) * mul);
    a.flash = 0.35;
    a.swingV += kind === 'box' ? 1.15 : 0.6;

    let hearts = player.hearts;
    // LVL 2 and up damage the player on scratch. Floored at one heart: a
    // training bag should never knock you out.
    if (kind === 'scratch' && bag.hurtsToScratch && Math.random() < 0.28 && hearts > 1) {
      hearts -= 1;
      say('THAT ONE HURT');
    }

    const total = Math.min(bag.hp, training.bagDamage + damage);
    dispatch({ type: 'bag-progress', damage: total, hearts });
    if (total >= bag.hp) say('BAG CLEARED');
  };

  return (
    <div className="screen training-screen">
      <canvas ref={canvasRef} className="arena" />

      <div className="hud">
        <div className="hud-anchor tl">
          <HeartRow filled={player.hearts} max={player.maxHearts} />
        </div>

        <div className="hud-anchor tr">
          <ScaleCounter count={player.scales} compact />
        </div>

        <div className="hud-anchor uc">
          <div className="objective">
            <div className="objective-text">
              LVL {bag.tier} {bag.name} — {message ?? bag.defence}
            </div>
            <Bar value={damageRatio} width={300} slim />
          </div>
        </div>

        <div className="hud-anchor bl">
          <div className="pill-stack">
            <button type="button" className="pill" onClick={() => hit('scratch')}>
              SCRATCH
            </button>
            <button type="button" className="pill" onClick={() => hit('box')}>
              BOX
            </button>
          </div>
        </div>

        <div className="hud-anchor br">
          <div className="pill-stack right">
            <button
              type="button"
              className="context-action"
              disabled={!canUpgrade}
              onClick={() => dispatch({ type: 'upgrade-bag' })}
            >
              {nextBag && !nextBag.locked ? `UPGRADE BAG` : 'TOP BAG REACHED'}
              {nextBag && !nextBag.locked ? <b>{BAG_UPGRADE_COST}</b> : null}
            </button>
            <button
              type="button"
              className="context-action amber"
              onClick={() => dispatch({ type: 'goto', screen: 'ladder' })}
            >
              LEAVE TRAINING
            </button>
          </div>
        </div>
      </div>

      <div className="tier-strip">
        {BAGS.map((b) => {
          const owned = b.tier <= player.bagLevel;
          const current = b.tier === bag.tier;
          return (
            <button
              key={b.tier}
              type="button"
              className={`tier-chip${current ? ' current' : ''}${b.locked ? ' gate' : ''}`}
              disabled={!owned || b.locked}
              onClick={() => dispatch({ type: 'set-bag-tier', tier: b.tier })}
            >
              <span className="tier-name">
                LVL {b.tier} {b.name}
              </span>
              <span className="tier-state">
                {b.locked ? 'LOCKED' : owned ? (current ? 'HANGING' : 'OWNED') : `${b.cost} SCALES`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
