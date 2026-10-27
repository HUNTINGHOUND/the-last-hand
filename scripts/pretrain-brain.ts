import * as tf from '@tensorflow/tfjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { encodeHistory, outcome } from '../src/game.ts';
import type { Round } from '../src/game.ts';
import { createNetwork, readWeights } from '../src/network.ts';
import { makePlayer, randomMove, seededRandom } from './players.ts';

await tf.setBackend('cpu');
await tf.ready();
const random = seededRandom(20261026);
const families = ['constant', 'cycle', 'alternating', 'response', 'outcome', 'periodic', 'biased', 'switch', 'random'];
const epochs = Number(process.argv[2] ?? 12);
if (!Number.isInteger(epochs) || epochs < 1) throw new Error('Epoch count must be a positive integer.');

function dataset(episodes: number) {
  const xs: number[][][] = [], ys: number[][] = [];
  for (let episode = 0; episode < episodes; episode++) {
    const family = families[episode % families.length];
    const player = makePlayer(family, random, episode % 4 === 0 ? .15 : .03);
    const history: Pick<Round, 'human' | 'ai' | 'result'>[] = [];
    for (let round = 0; round < 40; round++) {
      const human = player(history), ai = randomMove(random);
      if (round >= 3 && (round < 12 || round % 2 === 0)) {
        xs.push(encodeHistory(history));
        ys.push([0, 1, 2].map(m => Number(m === human)));
      }
      history.push({ human, ai, result: outcome(human, ai) });
    }
  }
  return { xs: tf.tensor3d(xs), ys: tf.tensor2d(ys) };
}

const training = dataset(180), validation = dataset(45);
const { model, optimizer } = createNetwork(26026);
let bestLoss = Infinity;
let bestEpoch = 0;
let bestWeights = readWeights(model);
const shuffle = seededRandom(8719);
try {
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Explicitly seeded ordering makes regeneration reproducible, including minibatches.
    const order = Array.from({ length: training.xs.shape[0] }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(shuffle() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let start = 0; start < order.length; start += 64) {
      const indices = tf.tensor1d(order.slice(start, start + 64), 'int32');
      const xs = tf.gather(training.xs, indices), ys = tf.gather(training.ys, indices);
      try { await model.trainOnBatch(xs, ys); } finally { indices.dispose(); xs.dispose(); ys.dispose(); }
    }
    const lossTensor = model.evaluate(validation.xs, validation.ys, { batchSize: 64 }) as tf.Scalar;
    const loss = lossTensor.dataSync()[0];
    lossTensor.dispose();
    if (loss < bestLoss) { bestLoss = loss; bestEpoch = epoch + 1; bestWeights = readWeights(model); }
    console.log(`Epoch ${epoch + 1}/${epochs}: held-out loss ${loss.toFixed(4)} (best ${bestLoss.toFixed(4)})`);
    // Save each completed epoch so a long training run has a usable checkpoint.
    await mkdir(new URL('../src/models/', import.meta.url), { recursive: true });
    await writeFile(new URL('../src/models/starter.json', import.meta.url), JSON.stringify({
      version: 1, seed: 20261026, epochs: epoch + 1, bestEpoch, examples: training.xs.shape[0],
      validationLoss: bestLoss, families, weights: bestWeights,
    }));
  }
} finally { tf.dispose([training.xs, training.ys, validation.xs, validation.ys]); model.dispose(); optimizer.dispose(); }
