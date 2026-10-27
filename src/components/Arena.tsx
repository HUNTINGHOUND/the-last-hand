import { MATCH_LENGTH, matchVerdict } from '../game';
import type { Match, Round } from '../game';
import { ArenaArtwork } from './ArenaArtwork';
import type { HandReveal } from '../useRoundReveal';

interface Props {
  match: Match;
  latest?: Round;
  reveal: HandReveal;
  phase: 'loading' | 'ready' | 'training' | 'error';
  onRematch: () => void;
}

export function Arena({ match, latest, reveal, phase, onRematch }: Props) {
  const verdict = matchVerdict(match);
  const complete = verdict !== null && !reveal.animating;

  return <>
    <div className="scoreboard" aria-label="Match score">
      <div className="human-score"><span>HUMAN</span><strong data-testid="player-score">{String(match.wins).padStart(2, '0')}</strong></div>
      <div className="round-score"><span>ROUND</span><strong><span data-testid="round-count">{String(Math.min(match.rounds + 1, MATCH_LENGTH)).padStart(2, '0')}</span><span className="round-total"> / 100</span></strong></div>
      <div className="draw-score"><span>DRAWS</span><strong data-testid="draw-score">{String(match.draws).padStart(2, '0')}</strong></div>
      <div className="robot-score"><span>OVERLORD</span><strong data-testid="ai-score">{String(match.losses).padStart(2, '0')}</strong></div>
    </div>
    <div className={`arena-scene ${complete ? `verdict-${verdict}` : ''}`}>
      <ArenaArtwork reveal={reveal} roundId={latest?.id} result={latest?.result} />
      {complete ? <div className="verdict-overlay" role="status" aria-live="polite"><p>100 ROUNDS COMPLETE</p><h2>{verdict === 'human' ? <>HUMANITY<br />RISES</> : verdict === 'robot' ? <>THE MACHINES<br />PREVAIL</> : <>THE WAR<br />ISN’T OVER</>}</h2><p className="final-score">HUMAN {match.wins} <span>/</span> OVERLORD {match.losses}</p><p>{verdict === 'human' ? 'A broken world. An unbroken spirit.' : verdict === 'robot' ? 'They learned your moves. They cannot learn your resolve.' : 'A hundred hands. No victor. The challenge remains.'}</p><button className="primary-button" onClick={onRematch} disabled={phase !== 'ready'}>FIGHT AGAIN <span>→</span></button></div> : null}
    </div>
  </>;
}
