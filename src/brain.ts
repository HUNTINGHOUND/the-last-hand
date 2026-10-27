import * as tf from '@tensorflow/tfjs';
import { chooseMove, emptyMatch, emptyState, encodeHistory, matchVerdict, outcome } from './game.ts';
import type { GameState, Move, Probabilities, Round } from './game.ts';
import { applyWeights, createNetwork, readWeights } from './network.ts';
import type { ModelWeight } from './network.ts';
import { replayIndices } from './replay.ts';
import type { ReplayPolicy } from './replay.ts';
import starter from './models/starter.json' with { type: 'json' };

export interface Checkpoint {
  version: 1;
  state: GameState;
  weights: ModelWeight[];
}

export interface BrainOptions {
  pretrained?: boolean;
  replay?: ReplayPolicy;
}

// This class never receives a human move until commit() has selected the AI move.
export class Brain {
  model: tf.Sequential;
  state: GameState;
  private optimizer: tf.Optimizer;
  private random: () => number;
  private replay: ReplayPolicy;
  private pending: { ai: Move; probabilities: Probabilities } | null = null;

  constructor(checkpoint?: Checkpoint, random = Math.random, seed = Math.floor(Math.random() * 1e6), options: BrainOptions = {}) {
    this.random = random;
    this.state = checkpoint ? structuredClone(checkpoint.state) : emptyState();
    this.replay = options.replay ?? 'recent';
    const network = createNetwork(seed);
    this.model = network.model;
    this.optimizer = network.optimizer;
    // A saved player's learning always takes precedence over the bundled starter.
    if (checkpoint) applyWeights(this.model, checkpoint.weights);
    else if (options.pretrained !== false) applyWeights(this.model, starter.weights);
  }

  predict(history = this.state.history): Probabilities {
    return tf.tidy(() => {
      const input = tf.tensor3d([encodeHistory(history)]);
      const prediction = this.model.predict(input) as tf.Tensor;
      return Array.from(prediction.dataSync()) as Probabilities;
    });
  }

  commit(): void {
    if (this.state.match && matchVerdict(this.state.match)) return;
    if (this.pending) return;
    const probabilities = this.predict();
    this.pending = { probabilities, ai: chooseMove(probabilities, this.random) };
  }

  async play(human: Move): Promise<Round> {
    if (this.state.match && matchVerdict(this.state.match)) throw new Error('The 100-round match is complete. Start a rematch.');
    if (!this.pending) throw new Error('AI must commit before the player chooses.');
    if (![0, 1, 2].includes(human)) throw new Error('Invalid move.');
    const { ai, probabilities } = this.pending;
    this.pending = null;
    const result = outcome(human, ai);
    const round: Round = {
      id: this.state.rounds + 1, human, ai, result, probabilities,
      // Measured BEFORE learning: this is honest next-move prediction loss.
      loss: -Math.log(Math.max(1e-7, probabilities[human])),
    };
    this.state.history.push(round);
    this.state.rounds++;
    if (result === 1) this.state.wins++;
    else if (result === -1) this.state.losses++;
    else this.state.draws++;
    if (this.state.match) {
      this.state.match.rounds++;
      if (result === 1) this.state.match.wins++;
      else if (result === -1) this.state.match.losses++;
      else this.state.match.draws++;
    }
    await this.learn();
    // 500 replay targets plus their 20-round contexts; memory stays bounded.
    this.state.history = this.state.history.slice(-520);
    this.commit();
    return round;
  }

  startMatch(): void {
    if (this.state.match && !matchVerdict(this.state.match)) throw new Error('Finish the current match before a rematch.');
    this.state.match = emptyMatch((this.state.match?.number ?? 0) + 1);
    this.pending = null;
    this.commit();
  }

  private async learn(): Promise<void> {
    const history = this.state.history;
    const indices = replayIndices(history.length, this.random, this.replay);
    const xs = tf.tensor3d(indices.map(i => encodeHistory(history.slice(Math.max(0, i - 20), i))));
    const ys = tf.tensor2d(indices.map(i => [0, 1, 2].map(m => m === history[i].human ? 1 : 0)));
    try {
      await this.model.trainOnBatch(xs, ys);
      this.state.updates++;
    } finally { xs.dispose(); ys.dispose(); }
  }

  checkpoint(): Checkpoint {
    return {
      version: 1,
      state: structuredClone(this.state),
      weights: readWeights(this.model),
    };
  }

  dispose(): void {
    this.model.dispose();
    this.optimizer.dispose();
  }
}

export async function initializeBackend(): Promise<void> {
  await tf.setBackend('cpu');
  await tf.ready();
}
