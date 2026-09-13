import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { getCroc } from '../data/ladder.js';
import { createMatch, hudSnapshot, stepMatch } from '../game/combat.js';
import { renderMatch } from '../game/render/scene.js';
import { DEFEAT_SCALE_COST, FINISHER_THRESHOLD, STAGE } from '../game/constants.js';
import { useMatchInput } from '../game/useInput.js';
import { ActionButton, Health, ObjectiveBanner, ScaleCounter } from '../hud/HudPieces.jsx';
import './match.css';

const RESULT_GRACE = 0.4; // beat before a stray tap can skip the dance
const AUTO_REVEAL = 5.0;
const WALLET_TICK = 1.1;

const REASON_TEXT = {
  ko: 'KNOCKOUT',
  ringout: 'RING OUT',
  finisher: 'JUMP BITE FINISHER'
};

export default function MatchScreen({ stageRef }) {
  const { state } = useGame();
  const [runId, setRunId] = useState(0);
  const opponentId = state.match?.opponentId;
  if (!opponentId) return null;
  // Remounting on retry is what makes the retry genuinely one tap: a fresh
  // match, a fresh canvas, no teardown order to get wrong.
  return (
    <MatchRun
      key={`${opponentId}:${runId}`}
      stageRef={stageRef}
      opponentId={opponentId}
      onRetry={() => setRunId((n) => n + 1)}
    />
  );
}

function MatchRun({ stageRef, opponentId, onRetry }) {
  const { state, dispatch } = useGame();
  const opponent = useMemo(() => getCroc(opponentId), [opponentId]);

  const canvasRef = useRef(null);
  const matchRef = useRef(null);
  const preWallet = useRef(state.player.scales);
  if (matchRef.current === null && opponent) {
    matchRef.current = createMatch({ player: state.player, opponent });
  }

  const [hud, setHud] = useState(() => (matchRef.current ? hudSnapshot(matchRef.current) : null));
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(false);

  const onAnyInput = useCallback(() => {
    const m = matchRef.current;
    if (m && m.status === 'result' && m.danceT > RESULT_GRACE) {
      setRevealed(true);
      return false; // the tap skipped the dance; it is not also an attack
    }
    return true;
  }, []);

  const { input, press, clearEdges } = useMatchInput(stageRef, {
    enabled: !paused,
    onAnyInput
  });

  // The loop. Fixed 120hz substeps under a variable frame so the physics and
  // the shed VFX stay identical whatever the display does.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !opponent) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = STAGE.w * dpr;
    canvas.height = STAGE.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();
    let publish = 0;
    let alive = true;

    const frame = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const m = matchRef.current;
      if (!m) return;

      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25;

      if (!paused) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const sub = dt / steps;
        for (let i = 0; i < steps; i += 1) {
          stepMatch(m, sub, input.current);
          clearEdges();
        }
      }

      renderMatch(ctx, m, { victoryDance: state.player.victoryDance });

      publish += dt;
      if (publish > 1 / 30) {
        publish = 0;
        setHud(hudSnapshot(m));
      }
      if (m.status === 'result' && m.danceT > AUTO_REVEAL) setRevealed(true);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentId, paused]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!opponent || !hud) return null;

  const won = hud.outcome?.winner === 'player';
  const finalWallet = won
    ? preWallet.current + opponent.reward
    : Math.max(0, preWallet.current - DEFEAT_SCALE_COST);

  let walletShown = hud.playerScales;
  if (hud.status === 'result' || hud.status === 'ending') {
    const m = matchRef.current;
    const k = Math.max(0, Math.min(1, ((m?.danceT ?? 0) - 0.2) / WALLET_TICK));
    walletShown = Math.round(preWallet.current + (finalWallet - preWallet.current) * k);
  }

  const settle = () => {
    dispatch({
      type: 'match-result',
      won,
      reason: hud.outcome?.reason,
      heartsLeft: hud.playerHearts,
      opponentId
    });
  };

  const retry = () => {
    // Settle first so the reward or the five-scale loss lands, then rebuild.
    settle();
    dispatch({ type: 'start-match', id: opponentId });
    onRetry();
  };

  let objectiveText = 'KNOCK HIM OUT OF THE STADIUM';
  let objectiveTone = null;
  if (hud.banner) {
    objectiveText = hud.banner;
    objectiveTone = hud.bannerTone === 'green' ? 'finisher' : null;
  } else if (hud.playerDanger > 0.68) {
    objectiveText = 'GET BACK IN THE RING';
    objectiveTone = 'danger';
  } else if (hud.finisherOpen) {
    objectiveText = 'JUMP BITE TO FINISH HIM';
    objectiveTone = 'finisher';
  }

  const acting = hud.status === 'fighting';

  return (
    <div className="screen match-screen">
      <canvas ref={canvasRef} className="arena" />

      <div className="hud">
        <div className="hud-anchor tl">
          <Health label="YOU" filled={hud.playerHearts} max={hud.playerMaxHearts} />
        </div>

        <div className="hud-anchor tc">
          <ObjectiveBanner text={objectiveText} tone={objectiveTone} progress={hud.ringOutProgress} />
        </div>

        <div className="hud-anchor tr">
          <Health
            label={`CROC ${opponent.rank}`}
            labelTone="opponent"
            filled={hud.oppHearts}
            max={hud.oppMaxHearts}
            reward={opponent.reward}
            align="right"
          />
        </div>

        <div className="hud-anchor bl">
          <ScaleCounter count={walletShown} warn={hud.finisherRisk} />
          {hud.finisherRisk && acting ? (
            <div className="finisher-warning">UNDER {FINISHER_THRESHOLD}: ONE BITE ENDS YOU</div>
          ) : null}
        </div>

        <div className="hud-anchor br">
          <div className="action-row">
            <ActionButton
              label="SCRATCH"
              hint="LMB"
              size="s14"
              disabled={!acting}
              onPress={() => press('scratch')}
            />
            <ActionButton label="BOX" hint="RMB" size="s18" disabled={!acting} onPress={() => press('box')} />
            <ActionButton
              label="JUMP BITE"
              hint="SPACE"
              size="s12"
              disabled={!acting}
              primed={hud.finisherOpen}
              onPress={() => press('bite')}
            />
            <ActionButton
              label={'REGEN\nERATE'}
              hint={hud.regenCooldown > 0 ? `${hud.regenCooldown}s` : 'E'}
              size="s12"
              disabled={!acting || !hud.regenReady}
              onPress={() => press('regen')}
            />
          </div>
        </div>

        <button type="button" className="pause-tab" onClick={() => setPaused((p) => !p)}>
          {paused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>

      {hud.status === 'countdown' ? (
        <div className="centre-flash">
          <div className="countdown">FIGHT!</div>
        </div>
      ) : null}

      {hud.status === 'result' && !revealed ? (
        <div className="skip-hint">TAP TO SKIP</div>
      ) : null}

      {revealed ? (
        <div className="result-card">
          <div className={`result-title ${won ? 'win' : 'loss'}`}>{won ? 'YOU WIN' : 'KNOCKED OUT'}</div>
          <div className="result-reason">{REASON_TEXT[hud.outcome?.reason] ?? ''}</div>
          <div className={`result-scales ${won ? 'win' : 'loss'}`}>
            {won ? `+${opponent.reward} SCALES` : `-${DEFEAT_SCALE_COST} SCALES`}
          </div>
          <div className="result-actions">
            <button type="button" className="btn big" onClick={retry}>
              {won ? 'FIGHT AGAIN' : 'RETRY'}
            </button>
            <button type="button" className="btn ghost" onClick={settle}>
              BACK TO LADDER
            </button>
          </div>
        </div>
      ) : null}

      {paused ? (
        <div className="pause-overlay">
          <div className="result-title">PAUSED</div>
          <div className="result-actions">
            <button type="button" className="btn big" onClick={() => setPaused(false)}>
              RESUME
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => dispatch({ type: 'goto', screen: 'ladder' })}
            >
              LEAVE FIGHT
            </button>
          </div>
          <div className="note">Leaving mid-fight costs nothing. Scales only change when a fight ends.</div>
        </div>
      ) : null}
    </div>
  );
}
