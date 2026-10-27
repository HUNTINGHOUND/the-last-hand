import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as tf from '@tensorflow/tfjs';
import { Brain, initializeBackend } from '../src/brain.ts';
import { outcome } from '../src/game.ts';
import type { Move, Round } from '../src/game.ts';

function seededRandom(seed: number) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('bundled pretraining recognizes simple habits before any online updates', async () => {
  await initializeBackend();
  const brain = new Brain();
  try {
    for (const step of [0, 1, 2]) {
      const history: Pick<Round, 'human' | 'ai' | 'result'>[] = [];
      const random = seededRandom(7763 + step);
      let hits = 0;
      for (let i = 0; i < 24; i++) {
        const human = (i * step % 3) as Move, ai = Math.floor(random() * 3) as Move;
        const prediction = brain.predict(history);
        if (i >= 4 && prediction.indexOf(Math.max(...prediction)) === human) hits++;
        history.push({ human, ai, result: outcome(human, ai) });
      }
      assert(hits / 20 >= .8, `starter should recognize step-${step} play from context alone`);
    }
    assert.equal(brain.state.rounds, 0, 'synthetic experience must not appear in the real match');
    assert.equal(brain.state.updates, 0);
  } finally { brain.dispose(); }
});

test('legacy checkpoints keep their learned weights instead of being overwritten by the starter', async () => {
  await initializeBackend();
  const legacy = new Brain(undefined, seededRandom(22), 2026, { pretrained: false, replay: 'legacy' });
  try {
    legacy.commit();
    await legacy.play(2);
    const saved = legacy.checkpoint();
    const restored = new Brain(saved);
    try {
      assert.deepEqual(restored.checkpoint(), saved);
      assert.deepEqual(restored.predict(), legacy.predict());
    } finally { restored.dispose(); }
  } finally { legacy.dispose(); }
});

test('real GRU learns constant and cycling players, persists predictions, and releases tensors', { timeout: 180000 }, async () => {
  await initializeBackend();
  for (const pattern of ['constant', 'cycle'] as const) {
    const baseline = tf.memory().numTensors;
    const brain = new Brain(undefined, seededRandom(42), 123);
    try {
      await assert.rejects(brain.play(0), /commit/);
      brain.commit();
      for (let round = 0; round < 100; round++) {
        await brain.play((pattern === 'constant' ? 0 : round % 3) as Move);
      }
      const recent = brain.state.history.slice(-30);
      const accuracy = recent.filter(r => r.probabilities.indexOf(Math.max(...r.probabilities)) === r.human).length / recent.length;
      const reward = recent.reduce((sum, r) => sum - r.result, 0) / recent.length;
      console.log(`${pattern}: last-30 prediction accuracy=${accuracy}, AI reward=${reward}`);
      assert(accuracy > .8, `${pattern} pattern should be learned`);
      assert(reward > .4, `${pattern} player should be exploited`);
      assert.equal(brain.state.wins + brain.state.losses + brain.state.draws, 100);
      const checkpoint = brain.checkpoint();
      const restored = new Brain(checkpoint, seededRandom(9), 456);
      try {
        assert.deepEqual(restored.state, brain.state);
        assert.deepEqual(restored.predict(), brain.predict());
      } finally { restored.dispose(); }
      const tensors = tf.memory().numTensors;
      for (let round = 0; round < 10; round++) await brain.play(0);
      assert.equal(tf.memory().numTensors, tensors, 'online updates should not leak tensors');
      assert(brain.state.history.every(r => Number.isFinite(r.loss)));
    } finally { brain.dispose(); }
    assert.equal(tf.memory().numTensors, baseline);
  }
});

test('commit is idempotent and a round reports the prediction made before observing the player', async () => {
  await initializeBackend();
  const brain = new Brain(undefined, seededRandom(99), 90);
  try {
    const prediction = brain.predict();
    brain.commit(); brain.commit();
    const round = await brain.play(2);
    assert.deepEqual(round.probabilities, prediction);
    assert.equal(round.loss, -Math.log(prediction[2]));
  } finally { brain.dispose(); }
});

test('continual play bounds history while keeping aggregate scores', async () => {
  await initializeBackend();
  const brain = new Brain(undefined, seededRandom(24), 77);
  try {
    // Start from the boundary of a long session without spending 520 updates getting there.
    brain.state = {
      version: 1, rounds: 520, wins: 0, losses: 520, draws: 0, updates: 520,
      history: Array.from({ length: 520 }, (_, i) => ({
        id: i + 1, human: 0 as const, ai: 1 as const, result: -1 as const,
        probabilities: [1, 0, 0] as [number, number, number], loss: 0,
      })),
    };
    brain.commit();
    await brain.play(0);
    assert.equal(brain.state.history.length, 520);
    assert.equal(brain.state.history[0].id, 2);
    assert.equal(brain.state.history.at(-1)?.id, 521);
    assert.equal(brain.state.wins + brain.state.losses + brain.state.draws, 521);
    assert.equal(brain.state.updates, 521);
  } finally { brain.dispose(); }
});

test('adapts after a habit switch and has no spurious edge against a seeded uniform player', { timeout: 180000 }, async () => {
  await initializeBackend();
  const changing = new Brain(undefined, seededRandom(52), 411);
  try {
    changing.commit();
    for (let i = 0; i < 140; i++) await changing.play(i < 80 ? 0 : 1);
    const recent = changing.state.history.slice(-20);
    const accuracy = recent.filter(r => r.probabilities.indexOf(Math.max(...r.probabilities)) === r.human).length / recent.length;
    console.log(`habit switch: last-20 prediction accuracy=${accuracy}`);
    assert(accuracy > .8);
  } finally { changing.dispose(); }

  const randomPlayer = seededRandom(8675309);
  const opponent = new Brain(undefined, seededRandom(64), 1234);
  try {
    opponent.commit();
    for (let i = 0; i < 150; i++) await opponent.play(Math.floor(randomPlayer() * 3) as Move);
    const history = opponent.state.history;
    const reward = history.reduce((sum, r) => sum - r.result, 0) / history.length;
    console.log(`uniform player: average AI reward=${reward}`);
    // Sanity check for this fixed seed, not a statistical proof of randomness.
    assert(Math.abs(reward) < .25);
  } finally { opponent.dispose(); }
});

test('match ends at 100, survives checkpoint restoration, and rematches preserve learning', async () => {
  await initializeBackend();
  const brain = new Brain(undefined, () => .5, 909, { pretrained: false });
  try {
    brain.startMatch();
    assert.throws(() => brain.startMatch(), /Finish/);
    // Advance to the final throw through a checkpoint-like state; the zero context
    // produces a uniform initial prediction, so this fixed RNG commits paper.
    brain.state.match = { number: 1, rounds: 99, wins: 40, losses: 40, draws: 19 };
    brain.state.rounds = 99;
    brain.state.wins = 40; brain.state.losses = 40; brain.state.draws = 19;
    await brain.play(1);
    assert.deepEqual(brain.state.match, { number: 1, rounds: 100, wins: 40, losses: 40, draws: 20 });
    const frozen = brain.checkpoint();
    await assert.rejects(brain.play(0), /complete/);
    assert.deepEqual(brain.checkpoint(), frozen, 'extra throws cannot alter a finished match');
    const restored = new Brain(frozen, seededRandom(12), 12);
    try {
      restored.commit();
      await assert.rejects(restored.play(0), /complete/);
      const prediction = restored.predict();
      restored.startMatch();
      assert.deepEqual(restored.predict(), prediction, 'rematches retain weights and history');
      assert.equal(restored.state.updates, 1);
      assert.equal(restored.state.rounds, 100);
      assert.deepEqual(restored.state.match, { number: 2, rounds: 0, wins: 0, losses: 0, draws: 0 });
      await restored.play(2);
      assert.equal(restored.state.match?.rounds, 1);
      assert.equal(restored.state.rounds, 101);
    } finally { restored.dispose(); }
  } finally { brain.dispose(); }
});
