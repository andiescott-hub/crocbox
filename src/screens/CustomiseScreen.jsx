import { useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { TINTS } from '../data/palette.js';
import CrocPortrait from '../components/CrocPortrait.jsx';
import { ScaleCounter } from '../hud/HudPieces.jsx';
import './customise.css';

const clean = (value, max) => value.toUpperCase().replace(/[^A-Z0-9 !?'.-]/g, '').slice(0, max);

export default function CustomiseScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const [dancing, setDancing] = useState(false);

  const set = (patch) => dispatch({ type: 'customise', patch });

  return (
    <div className="screen menu customise-screen">
      <div className="menu-head">
        <div>
          <div className="menu-title">CUSTOMISE</div>
          <div className="menu-sub">Name it, colour it, and give it something to say in the ring.</div>
        </div>
        <ScaleCounter count={player.scales} />
      </div>

      <div className="customise-body">
        <div className="card preview">
          <div className="preview-plate">{player.nameplate || ' '}</div>
          <CrocPortrait
            tint={player.tint}
            scales={34}
            maxScales={40}
            width={320}
            height={240}
            zoom={1}
            dancing={dancing}
          />
          <div className="preview-name">{player.name || 'UNNAMED'}</div>
          <button type="button" className="btn ghost" onClick={() => setDancing((d) => !d)}>
            {dancing ? 'STOP DANCING' : 'SEE THE DANCE'}
          </button>
        </div>

        <div className="customise-fields">
          <label className="field">
            <span className="field-label">CROCODILE NAME</span>
            <input
              className="text-input"
              value={player.name}
              maxLength={12}
              onChange={(e) => set({ name: clean(e.target.value, 12) })}
              placeholder="CROCO"
            />
          </label>

          <div className="field">
            <span className="field-label">TINT</span>
            <div className="tint-grid">
              {TINTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tint-chip${player.tint === t.value ? ' active' : ''}`}
                  onClick={() => set({ tint: t.value })}
                >
                  <span className="tint-swatch" style={{ background: t.value }} />
                  <span className="tint-name">{t.name}</span>
                </button>
              ))}
            </div>
            <div className="note">
              A multiply over the desaturated olive hide, so every tint still reads as a crocodile. A free colour
              picker produces invisible crocodiles, which is why this is a fixed palette.
            </div>
          </div>

          <label className="field">
            <span className="field-label">NAMEPLATE</span>
            <input
              className="text-input"
              value={player.nameplate}
              maxLength={16}
              onChange={(e) => set({ nameplate: clean(e.target.value, 16) })}
              placeholder="BITE ME"
            />
            <span className="note">Floats above your head in the arena. Separate from the name, so it can be a taunt.</span>
          </label>

          <div className="card dance-capture">
            <div className="dance-title">VICTORY DANCE</div>
            <div className="note">
              Recording your own dance through the iPad camera is build step 7 and is not in this build. The win
              screen already plays the hand-animated dance, which is the fallback the capture feature degrades to.
              Nothing about it will ever leave the device: the recipe is stored, never the video.
            </div>
            <button type="button" className="btn" disabled>
              RECORD A DANCE
            </button>
          </div>
        </div>
      </div>

      <div className="nav-row">
        <button type="button" className="btn" onClick={() => dispatch({ type: 'goto', screen: 'ladder' })}>
          BACK TO THE LADDER
        </button>
      </div>
    </div>
  );
}
