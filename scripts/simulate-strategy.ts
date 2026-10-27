import { Brain, initializeBackend } from '../src/brain.ts';
import type { Move, Round } from '../src/game.ts';

function seededRandom(seed: number): () => number {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function summarize(rounds: Round[], offset = 0) {
  const n = rounds.length;
  const hits = rounds.filter(round => round.probabilities.indexOf(Math.max(...round.probabilities)) === round.human).length;
  const wins = rounds.filter(round => round.result === -1).length;
  const draws = rounds.filter(round => round.result === 0).length;
  return {
    'Strategy rounds': `${rounds[0].id - offset}–${rounds.at(-1)!.id - offset}`,
    'Prediction accuracy': `${(100 * hits / n).toFixed(1)}%`,
    'AI win rate': `${(100 * wins / n).toFixed(1)}%`,
    'AI wins/draws/losses': `${wins}/${draws}/${n - wins - draws}`,
    'AI average reward': ((2 * wins + draws - n) / n).toFixed(3),
    'Prediction loss': (rounds.reduce((sum, round) => sum + round.loss, 0) / n).toFixed(3),
  };
}

await initializeBackend();
for (const warmup of [0, 80]) {
  const brain = new Brain(undefined, seededRandom(42 + warmup), 123 + warmup);
  let previous: Move = 0;
  try {
    brain.commit();
    // The warmup teaches the opposite cycle, rather than starting from a blank model.
    for (let i = 0; i < warmup; i++) {
      const move = (i === 0 ? previous : (previous + 1) % 3) as Move;
      await brain.play(move);
      previous = move;
    }
    const observations: Round[] = [];
    for (let i = 0; i < 160; i++) {
      // Assume AI counters the previous human move, then counter that assumed move.
      // R=0, P=1, S=2: counter(counter(previous)) = (previous + 2) % 3.
      const assumedAiMove = (previous + 1) % 3;
      const move = ((assumedAiMove + 1) % 3) as Move;
      observations.push(await brain.play(move));
      previous = move;
      if ((i + 1) % 40 === 0) console.log(`${warmup ? 'After opposite-cycle warmup' : 'Fresh model'}: ${i + 1}/160 strategy rounds complete`);
    }
    console.log(`\n${warmup ? 'Switch from 80 rounds of R → P → S to the reverse cycle' : 'Fresh model against R → S → P'}`);
    console.table(Array.from({ length: 8 }, (_, i) => summarize(observations.slice(i * 20, (i + 1) * 20), warmup)));
    console.log('Final 60 rounds:', JSON.stringify(summarize(observations.slice(-60), warmup)));
  } finally { brain.dispose(); }
}
