import { MATCH_LENGTH, MOVES } from '../game';
import type { Round } from '../game';

export function BattleLog({ rounds }: { rounds: Round[] }) {
  return <section className="battle-log pixel-panel" aria-label="Battle log">
    <div className="log-heading"><h2>BATTLE LOG</h2><p>100 throws. One chance to change everything.</p><div className="log-legend"><span className="human-color">+ HUMAN</span><span className="robot-color">− ROBOT</span><span>= DRAW</span></div></div>
    <div className="battle-cells">
      {Array.from({ length: MATCH_LENGTH }, (_, index) => {
        const round = rounds[index];
        const description = round ? `Round ${index + 1}: you ${MOVES[round.human]}, robot ${MOVES[round.ai]}. ${round.result === 1 ? 'Human wins' : round.result === -1 ? 'Robot wins' : 'Draw'}.` : `Round ${index + 1}: not played`;
        return <div key={index} className={`battle-cell ${round ? round.result === 1 ? 'human' : round.result === -1 ? 'robot' : 'draw' : 'unplayed'} ${index === rounds.length - 1 ? 'latest' : ''}`} title={description} aria-label={description} tabIndex={round ? 0 : undefined}>
          <span className="cell-box">{round ? round.result === 1 ? '+' : round.result === -1 ? '−' : '=' : ''}</span><span className="cell-number">{String(index + 1).padStart(2, '0')}</span>
        </div>;
      })}
    </div>
  </section>;
}
