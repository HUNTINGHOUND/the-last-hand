import { MOVES, rollingEdge } from '../game.ts';
import type { Snapshot } from '../game.ts';

export function Insights({ state }: { state: Snapshot }) {
  const latest = state.history.at(-1);
  const probabilities = latest?.probabilities ?? [1 / 3, 1 / 3, 1 / 3];
  const edge = rollingEdge(state.history);
  const recent = state.history.slice(-100);
  const points = recent.map((_, index) => {
    const historyIndex = state.history.length - recent.length + index;
    const value = rollingEdge(state.history.slice(0, historyIndex + 1));
    return `${30 + index / Math.max(1, recent.length - 1) * 310},${64 - value * 48}`;
  }).join(' ');

  return <aside className="insights pixel-panel" aria-label="Neural network insights">
    <h2>MACHINE MIND</h2>
    <section className="prediction-section">
      <h3>LAST HUMAN PREDICTION</h3>
      <div className="probabilities">
        {MOVES.map((move, index) => <div className="probability-row" key={move}>
          <span>{move}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${probabilities[index] * 100}%` }} /></div>
          <span className="mono">{Math.round(probabilities[index] * 100)}%</span>
        </div>)}
      </div>
      <p className="prediction-note">Revealed after each round.</p>
    </section>
    <section className="edge-section">
      <h3>MACHINE ADVANTAGE</h3>
      <svg className="edge-chart" viewBox="0 0 350 132" role="img" aria-label={`AI average reward over the latest 50 rounds: ${edge.toFixed(2)}. Positive means the AI is ahead.`}>
        <line x1="30" y1="16" x2="30" y2="112" className="chart-axis" />
        <line x1="30" y1="112" x2="340" y2="112" className="chart-axis" />
        <line x1="30" y1="64" x2="340" y2="64" className="chart-zero" />
        <text x="2" y="20">1.0</text><text x="2" y="68">0.0</text><text x="0" y="116">−1.0</text>
        {recent.length > 1 ? <polyline points={points} className="chart-line" /> : recent.length === 1 ? <circle cx="30" cy={64 - edge * 48} r="3" fill="var(--olive)" /> : null}
        <text x="30" y="130">{recent[0]?.id ?? 0}</text><text x="340" y="130" textAnchor="end">{latest?.id ?? 0}</text>
      </svg>
      <div className="edge-value">{edge > 0 ? '+' : ''}{edge.toFixed(2)}</div>
      <p className="muted">Average reward / last 50 throws</p>
    </section>
  </aside>;
}
