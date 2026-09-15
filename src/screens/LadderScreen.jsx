import { useGame } from '../state/GameContext.jsx';
import { LADDER, getCroc, portraitScale } from '../data/ladder.js';
import { ScaleCounter } from '../hud/HudPieces.jsx';
import CrocPortrait from '../components/CrocPortrait.jsx';
import { FINISHER_THRESHOLD } from '../game/constants.js';
import './ladder.css';

export default function LadderScreen() {
  const { state, dispatch } = useGame();
  const { player, ladder, lastResult } = state;

  const previousName = (index) => (index > 0 ? LADDER[index - 1].name : '');

  return (
    <div className="screen menu ladder-screen">
      <div className="menu-head">
        <div>
          <div className="menu-title">CHOOSE A CROC TO FIGHT</div>
          {lastResult ? (
            <div className={`last-result ${lastResult.won ? 'win' : 'loss'}`}>
              {lastResult.won
                ? `BEAT ${getCroc(lastResult.opponentId)?.name} FOR ${lastResult.reward} SCALES`
                : `BEATEN BY ${getCroc(lastResult.opponentId)?.name}: 5 SCALES GONE`}
            </div>
          ) : (
            <div className="menu-sub">
              Your scales are your armour and your money. Spend them and you fight underdressed.
            </div>
          )}
        </div>
        <ScaleCounter count={player.scales} warn={player.scales < FINISHER_THRESHOLD} />
      </div>

      <div className="ladder-grid">
        {LADDER.map((croc, i) => {
          const entry = ladder.find((e) => e.id === croc.id) ?? { state: 'locked' };
          const available = entry.state === 'available';
          const beaten = entry.state === 'beaten';
          return (
            <div
              key={croc.id}
              className={`card croc-card${available ? ' available' : ''}${beaten ? ' beaten' : ''}`}
            >
              <div className="croc-portrait">
                <CrocPortrait
                  tint={croc.tint}
                  scales={croc.coat}
                  maxScales={croc.coat}
                  width={140}
                  height={118}
                  zoom={portraitScale(croc.rank)}
                  animated={available}
                />
              </div>
              <div className="croc-name">{croc.name}</div>
              <div className="croc-reward">
                <span className="glyph-mini" />
                {croc.reward} SCALES
              </div>
              <div className="croc-stats">
                {croc.coat} COAT · {croc.hearts} HEARTS
              </div>
              {available ? (
                <button
                  type="button"
                  className="fight-btn"
                  onClick={() => dispatch({ type: 'start-match', id: croc.id })}
                >
                  FIGHT
                </button>
              ) : beaten ? (
                <>
                  <div className="croc-state">BEATEN</div>
                  <button
                    type="button"
                    className="refight-btn"
                    onClick={() => dispatch({ type: 'start-match', id: croc.id })}
                  >
                    FIGHT AGAIN
                  </button>
                </>
              ) : (
                <div className="croc-state">BEAT {previousName(i)} FIRST</div>
              )}
            </div>
          );
        })}

        {/* Dimension 2 is parked (PLAN.md §1). The card stays so the ladder
            reads the way Tristan drew it, and the data is already an array. */}
        <div className="card croc-card gate">
          <div className="croc-portrait gate-portrait">
            <div className="gate-swirl" />
          </div>
          <div className="croc-name violet">DIMENSION 2</div>
          <div className="croc-reward violet">32 SCALES</div>
          <div className="croc-state violet-sub">HARDER. PAYS MORE.</div>
          <div className="croc-state">NOT IN THIS BUILD</div>
        </div>
      </div>

      <div className="nav-row">
        <button type="button" className="btn" onClick={() => dispatch({ type: 'goto', screen: 'market' })}>
          MARKET
        </button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'goto', screen: 'training' })}>
          TRAINING ROW
        </button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'goto', screen: 'customise' })}>
          CUSTOMISE
        </button>
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'goto', screen: 'title' })}>
          TITLE
        </button>
      </div>

      <div className="note ladder-note">
        Beaten crocodiles regrow a full coat between matches, so a rematch is a slow but real way to farm
        scales. Strip a crocodile to its underpants and a jump bite finishes it outright, and that works on
        you too. Pull the left thumb back to block one.
      </div>
    </div>
  );
}
