import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expressionForRound } from '../src/robotExpression.ts';
import type { HandStage } from '../src/useRoundReveal.ts';

test('robot reactions use the robot perspective after the hand reveal', () => {
  for (const stage of ['reveal', 'settled'] as HandStage[]) {
    assert.equal(expressionForRound(-1, stage), 'victory', 'a human loss is a robot victory');
    assert.equal(expressionForRound(1, stage), 'defeat', 'a human win is a robot defeat');
    assert.equal(expressionForRound(0, stage), 'neutral');
    assert.equal(expressionForRound(undefined, stage), 'neutral');
  }
});

test('the face cannot give away an outcome during ready or windup states', () => {
  for (const stage of ['idle', 'windup'] as HandStage[]) for (const result of [-1, 0, 1, undefined] as const) {
    assert.equal(expressionForRound(result, stage), 'neutral');
  }
});
