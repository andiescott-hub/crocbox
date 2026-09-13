import { memo, useEffect, useRef, useState } from 'react';
import './hud.css';

// Heart row. Max heart count is not fixed - hearts are purchasable - so the row
// grows rather than assuming six cells.
export const HeartRow = memo(function HeartRow({ filled, max }) {
  const prev = useRef(filled);
  const [lost, setLost] = useState(-1);

  useEffect(() => {
    if (filled < prev.current) {
      setLost(filled);
      const id = setTimeout(() => setLost(-1), 340);
      prev.current = filled;
      return () => clearTimeout(id);
    }
    prev.current = filled;
    return undefined;
  }, [filled]);

  return (
    <div className="heart-row">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`heart-cell ${i < filled ? 'filled' : 'empty'}${i === lost ? ' just-lost' : ''}`}
        />
      ))}
    </div>
  );
});

export const Health = memo(function Health({ label, labelTone, filled, max, reward, align = 'left' }) {
  return (
    <div className={`health${align === 'right' ? ' right' : ''}`}>
      {label ? (
        <div className={`health-label${labelTone === 'opponent' ? ' opponent' : ''}`}>{label}</div>
      ) : null}
      <HeartRow filled={filled} max={max} />
      {reward !== undefined ? (
        <div className="reward-line">
          REWARD <b>{reward} SCALES</b>
        </div>
      ) : null}
    </div>
  );
});

export const Bar = memo(function Bar({ value, width = 360, slim = false }) {
  return (
    <div className={`bar${slim ? ' slim' : ''}`} style={{ width }}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
});

export const ObjectiveBanner = memo(function ObjectiveBanner({ text, tone, progress }) {
  return (
    <div className="objective">
      <div className={`objective-text${tone ? ` ${tone}` : ''}`}>{text}</div>
      <Bar value={progress} width={360} />
    </div>
  );
});

export const ScaleCounter = memo(function ScaleCounter({ count, compact = false, showLabel = true, warn = false }) {
  return (
    <div className={`scale-counter${compact ? ' compact' : ''}${warn ? ' warn' : ''}`}>
      <div className="scale-glyph" />
      <div className="scale-count">{count}</div>
      {showLabel && !compact ? <div className="scale-label">SCALES</div> : null}
    </div>
  );
});

export function ActionButton({ label, hint, size = 's14', disabled, primed, onPress }) {
  const fire = (e) => {
    e.preventDefault();
    if (!disabled) onPress();
  };
  return (
    <button
      type="button"
      className={`action${disabled ? ' disabled' : ''}`}
      onPointerDown={fire}
      onContextMenu={(e) => e.preventDefault()}
      aria-disabled={disabled}
    >
      <span className={`action-face ${size}${primed && !disabled ? ' primed' : ''}`}>{label}</span>
      <span className="action-key">{hint}</span>
    </button>
  );
}
