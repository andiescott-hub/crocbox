import { useEffect, useRef, useState } from 'react';
import { GameProvider, useGame } from './state/GameContext.jsx';
import { useStageScale } from './useStageScale.js';
import TitleScreen from './screens/TitleScreen.jsx';
import LadderScreen from './screens/LadderScreen.jsx';
import MatchScreen from './screens/MatchScreen.jsx';
import MarketScreen from './screens/MarketScreen.jsx';
import TrainingScreen from './screens/TrainingScreen.jsx';
import CustomiseScreen from './screens/CustomiseScreen.jsx';
import './styles/app.css';

function Screens({ stageRef }) {
  const { state } = useGame();
  switch (state.screen) {
    case 'match':
      return <MatchScreen stageRef={stageRef} />;
    case 'ladder':
      return <LadderScreen />;
    case 'market':
      return <MarketScreen />;
    case 'training':
      return <TrainingScreen />;
    case 'customise':
      return <CustomiseScreen />;
    case 'title':
    default:
      return <TitleScreen />;
  }
}

// The arena is a wide frame and the target device is an iPad. In tall portrait
// it scales down to something unplayable, so say so rather than shipping a
// postage stamp.
function usePortraitBlock() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const check = () =>
      setBlocked(window.innerHeight > window.innerWidth * 1.15 && window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return blocked;
}

export default function App() {
  const stageRef = useRef(null);
  const scale = useStageScale();
  const portrait = usePortraitBlock();

  return (
    <GameProvider>
      <div className="viewport">
        <div className="stage" ref={stageRef} style={{ transform: `scale(${scale})` }}>
          <Screens stageRef={stageRef} />
        </div>
        {portrait ? (
          <div className="rotate-hint">
            <div className="rotate-icon" />
            <div className="rotate-text">TURN IT SIDEWAYS</div>
            <div className="rotate-sub">Croco Box wants a landscape screen.</div>
          </div>
        ) : null}
      </div>
    </GameProvider>
  );
}
