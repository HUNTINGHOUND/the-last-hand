import { MOVES } from '../game';
import type { Move, Result } from '../game';
import type { HandReveal } from '../useRoundReveal';
import { expressionForRound, ROBOT_EXPRESSIONS } from '../robotExpression';
import type { RobotExpression } from '../robotExpression';

const assetRoot = `${import.meta.env.BASE_URL}assets/`;

function SpriteLayer({ variant, width, height, reveal, roundId, expression }: {
  variant: 'desktop' | 'mobile'; width: number; height: number; reveal: HandReveal; roundId?: number; expression: RobotExpression;
}) {
  return <svg className={`arena-hand-layer arena-hand-layer--${variant}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g data-face-expression={expression}>
      {ROBOT_EXPRESSIONS.map(face => <image key={face} x="0" y="0" width={width} height={height}
        className={`robot-face-frame ${face === expression ? 'robot-face-frame--active' : ''}`} data-expression={face}
        href={`${assetRoot}last-hand-first-person-${variant}-face-${face}.png`} />)}
    </g>
    {(['robot', 'human'] as const).map(actor => {
      const move: Move = actor === 'human' ? reveal.human : reveal.robot;
      return <g key={`${actor}-${roundId ?? 'idle'}`} data-actor={actor} data-move={MOVES[move].toLowerCase()}>
        {MOVES.map((pose, index) => <image key={pose} x="0" y="0" width={width} height={height}
          className={`hand-frame ${move === index ? 'hand-frame--active' : ''}`} data-gesture={pose.toLowerCase()}
          href={`${assetRoot}last-hand-first-person-${variant}-${actor}-${pose.toLowerCase()}.png`} />)}
        <image x="0" y="0" width={width} height={height} className="hand-frame hand-frame--cocked"
          href={`${assetRoot}last-hand-first-person-${variant}-${actor}-windup.png`} />
      </g>;
    })}
  </svg>;
}

export function ArenaArtwork({ reveal, roundId, result }: { reveal: HandReveal; roundId?: number; result?: Result }) {
  const expression = expressionForRound(result, reveal.stage);
  const description = reveal.stage === 'windup' ? 'Both hands wind up for the throw.' : reveal.stage === 'idle' ? 'Both playing hands are ready.' : `You show ${MOVES[reveal.human].toLowerCase()}. The overlord shows ${MOVES[reveal.robot].toLowerCase()}.`;
  const reaction = expression === 'victory' ? 'The overlord looks smug.' : expression === 'defeat' ? 'The overlord looks irritated.' : 'The overlord keeps a neutral stare.';
  return <div className="arena-artwork" role="img" aria-label={`First-person pixel art of a T-800-style endoskeleton across the table. ${description} ${reaction}`}
    data-testid="arena-artwork" data-stage={reveal.stage} data-expression={expression} data-round-id={roundId} data-human-move={MOVES[reveal.human].toLowerCase()} data-robot-move={MOVES[reveal.robot].toLowerCase()}>
    <picture className="arena-picture">
      <source media="(max-width: 600px)" srcSet={`${assetRoot}last-hand-first-person-mobile-scene.png`} />
      <img className="arena-art" src={`${assetRoot}last-hand-first-person-desktop-scene.png`} alt="" aria-hidden="true" />
    </picture>
    <SpriteLayer variant="desktop" width={240} height={100} reveal={reveal} roundId={roundId} expression={expression} />
    <SpriteLayer variant="mobile" width={120} height={90} reveal={reveal} roundId={roundId} expression={expression} />
  </div>;
}
