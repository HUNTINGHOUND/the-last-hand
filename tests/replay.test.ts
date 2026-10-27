import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replayIndices } from '../src/replay.ts';
import { seededRandom } from '../scripts/players.ts';

test('recent replay adapts to new habits without discarding long-term examples', () => {
  const random = seededRandom(882);
  let recent = 0, old = 0;
  for (let batch = 0; batch < 100; batch++) {
    const indices = replayIndices(520, random);
    assert.equal(indices.length, 8);
    assert.deepEqual(indices.slice(0, 2), [519, 519]);
    assert(indices.every(i => i >= 20 && i <= 519));
    recent += indices.filter(i => i >= 488).length;
    old += indices.filter(i => i < 488).length;
  }
  assert(recent >= 600, 'at least six targets per batch focus on the latest habit');
  assert(old > 50, 'older habits still receive replay');
  assert.deepEqual(replayIndices(0, random), []);
  assert.deepEqual(replayIndices(1, random), Array(8).fill(0));
});
