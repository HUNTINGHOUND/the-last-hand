import type { Result } from './game';
import type { HandStage } from './useRoundReveal';

export const ROBOT_EXPRESSIONS = ['neutral', 'victory', 'defeat'] as const;
export type RobotExpression = typeof ROBOT_EXPRESSIONS[number];

export function expressionForRound(result: Result | undefined, stage: HandStage): RobotExpression {
  if (stage === 'idle' || stage === 'windup' || result === undefined || result === 0) return 'neutral';
  // Results are stored from the human's perspective.
  return result === -1 ? 'victory' : 'defeat';
}
