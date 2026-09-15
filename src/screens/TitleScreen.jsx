import { useGame } from '../state/GameContext.jsx';
import CrocPortrait from '../components/CrocPortrait.jsx';
import { clearSave } from '../state/persistence.js';
import './title.css';

export default function TitleScreen() {
  const { state, dispatch } = useGame();
  const beaten = state.ladder.filter((e) => e.state === 'beaten').length;

  const startOver = () => {
    clearSave();
    dispatch({ type: 'reset' });
  };

  return (
    <div className="screen title-screen">
      <div className="title-glow" />
      <div className="title-stack">
        <div className="title-word">CROCO</div>
        <div className="title-word alt">BOX</div>
        <div className="title-tag">FIGHT. STRIP HIS SCALES. SPEND THEM.</div>
        <div className="title-croc">
          <CrocPortrait tint={state.player.tint} scales={34} maxScales={40} width={330} height={230} zoom={1} />
        </div>
        <div className="nav-row title-actions">
          <button type="button" className="btn big" onClick={() => dispatch({ type: 'goto', screen: 'ladder' })}>
            {beaten > 0 ? 'KEEP FIGHTING' : 'START'}
          </button>
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'goto', screen: 'customise' })}>
            CUSTOMISE
          </button>
          {beaten > 0 ? (
            <button type="button" className="btn ghost" onClick={startOver}>
              START OVER
            </button>
          ) : null}
        </div>
        <div className="note title-note">
          Left thumb moves you: lean to walk, flick up to jump, pull down to crouch, pull back to guard.
          Right hand hits: J scratch, K box, L bite, E regenerate. What each one does depends on your stance,
          so watch the buttons rename themselves.
        </div>
      </div>
    </div>
  );
}
