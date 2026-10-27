import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseMove, emptyMatch, encodeHistory, expectedRewards, matchVerdict, outcome, rollingEdge } from '../src/game.ts';
import type { Move, Round } from '../src/game.ts';

test('all nine matchups follow the rules', () => {
  const expected = [[0, -1, 1], [1, 0, -1], [-1, 1, 0]];
  for (let human = 0; human < 3; human++) for (let ai = 0; ai < 3; ai++) {
    assert.equal(outcome(human as Move, ai as Move), expected[human][ai]);
  }
});

test('counterplay maximizes expected reward rather than only countering the most likely move', () => {
  // Rock is most likely, but rock itself has higher expected reward than paper.
  const p: [number, number, number] = [.4, .21, .39];
  const rewards = expectedRewards(p);
  assert(Math.abs(rewards[0] - .18) < 1e-6);
  assert(Math.abs(rewards[1] - .01) < 1e-6);
  assert(Math.abs(rewards[2] + .19) < 1e-6);
  assert.equal(chooseMove(p, () => .5), 0);
});

test('exploration can choose any move', () => {
  for (const [value, expected] of [[.1, 0], [.5, 1], [.9, 2]]) {
    let calls = 0;
    assert.equal(chooseMove([1, 0, 0], () => calls++ === 0 ? .05 : value), expected);
  }
});

test('history is ordered, one-hot encoded, left padded, and limited to 20 rounds', () => {
  const history = [{ human: 2 as Move, ai: 0 as Move, result: -1 as const }];
  const sequence = encodeHistory(history);
  assert.equal(sequence.length, 20);
  assert(sequence.slice(0, 19).flat().every(n => n === 0));
  assert.deepEqual(sequence[19], [0, 0, 1, 1, 0, 0, 1, 0, 0]);
  assert.equal(encodeHistory(Array(100).fill(history[0])).flat().filter(n => n === 1).length, 60);
});

test('rolling edge uses the AI perspective and only the latest 50 results', () => {
  assert.equal(rollingEdge([]), 0);
  assert.equal(rollingEdge([{ result: 1 }, ...Array(50).fill({ result: -1 })] as Round[]), 1);
});

test('100-round verdict counts draws as throws and allows a tied match', () => {
  assert.equal(matchVerdict({ ...emptyMatch(), rounds: 99, wins: 99 }), null);
  assert.equal(matchVerdict({ ...emptyMatch(), rounds: 100, wins: 48, losses: 42, draws: 10 }), 'human');
  assert.equal(matchVerdict({ ...emptyMatch(), rounds: 100, wins: 42, losses: 48, draws: 10 }), 'robot');
  assert.equal(matchVerdict({ ...emptyMatch(), rounds: 100, wins: 40, losses: 40, draws: 20 }), 'draw');
});
