import { useGame } from '../state/GameContext.jsx';
import { STALLS } from '../data/market.js';
import { getBag } from '../data/bags.js';
import { ScaleCounter } from '../hud/HudPieces.jsx';
import { FINISHER_THRESHOLD } from '../game/constants.js';
import './market.css';

function StallIcon({ id }) {
  if (id === 'hearts') return <div className="icon heart-icon" />;
  if (id === 'food') return <div className="icon food-icon" />;
  if (id === 'claws') return <div className="icon claw-icon" />;
  return <div className="icon bag-icon" />;
}

export default function MarketScreen() {
  const { state, dispatch } = useGame();
  const { player } = state;
  const nextBag = getBag(player.bagLevel + 1);

  const unavailable = (stall) => {
    if (player.scales < stall.cost) return true;
    if (stall.id === 'food' && player.hearts >= player.maxHearts) return true;
    if (stall.id === 'bags' && (!nextBag || nextBag.locked)) return true;
    return false;
  };

  return (
    <div className="screen menu market-screen">
      <div className="menu-head">
        <div>
          <div className="menu-title">MARKET</div>
          <div className="menu-sub">
            Everything here is paid for in armour. Walk out empty and the next croc only needs one good bite.
          </div>
        </div>
        <ScaleCounter count={player.scales} warn={player.scales < FINISHER_THRESHOLD} />
      </div>

      <div className="market-grid">
        {STALLS.map((stall) => {
          const disabled = unavailable(stall);
          return (
            <div key={stall.id} className="card stall">
              <div
                className="awning"
                style={{
                  background: `repeating-linear-gradient(90deg, ${stall.accent} 0 20px, #e8e0cd 20px 40px)`
                }}
              />
              <div className="stall-body">
                <StallIcon id={stall.id} />
                <div className="stall-name">{stall.name}</div>
                <div className="stall-desc">{stall.description}</div>
                <button
                  type="button"
                  className="price-btn"
                  disabled={disabled}
                  onClick={() => dispatch({ type: 'buy', item: stall.id })}
                >
                  {stall.cost} SCALES
                </button>
                <div className="stall-owned">
                  {stall.id === 'hearts' ? `${player.maxHearts} HEARTS MAX` : null}
                  {stall.id === 'food' ? `${player.hearts} / ${player.maxHearts} FULL` : null}
                  {stall.id === 'claws' ? `CLAW LVL ${player.clawLevel}` : null}
                  {stall.id === 'bags'
                    ? nextBag && !nextBag.locked
                      ? `NEXT: LVL ${nextBag.tier} ${nextBag.name}`
                      : 'TOP BAG OWNED'
                    : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="nav-row">
        <button type="button" className="btn" onClick={() => dispatch({ type: 'goto', screen: 'ladder' })}>
          BACK TO THE LADDER
        </button>
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'goto', screen: 'training' })}>
          TRAINING ROW
        </button>
      </div>

      <div className="note">
        Prices are Tristan&apos;s: food 5, hearts 20, claws 35, bags 50. If the player ends up permanently broke and
        permanently naked, drop the prices before touching the scales model.
      </div>
    </div>
  );
}
