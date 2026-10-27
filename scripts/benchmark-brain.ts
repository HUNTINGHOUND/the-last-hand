import { Brain, initializeBackend } from '../src/brain.ts';
import type { BrainOptions } from '../src/brain.ts';
import type { Round } from '../src/game.ts';
import { makePlayer, randomMove, seededRandom, wrap } from './players.ts';
import type { Player } from './players.ts';

const seeds = Number(process.argv[2] ?? 5);
if (!Number.isInteger(seeds) || seeds < 1) throw new Error('Seed count must be a positive integer.');
const families = ['constant', 'forward cycle', 'reverse cycle', 'alternating', 'response', 'outcome', 'periodic', 'noisy cycle', 'switching', 'uniform'];
const variants: [string, BrainOptions][] = [
  ['Original', { pretrained: false, replay: 'legacy' }],
  ['Upgraded', { pretrained: true, replay: 'recent' }],
];

function opponent(family: string, seed: number): Player {
  const random = seededRandom(seed);
  const start = randomMove(random);
  if (family === 'forward cycle' || family === 'reverse cycle') {
    const step = family === 'forward cycle' ? 1 : 2;
    return h => h.length ? wrap(h.at(-1)!.human + step) : start;
  }
  if (family === 'noisy cycle') return makePlayer('cycle', random, .2);
  if (family === 'uniform') return () => randomMove(random);
  if (family === 'switching') return h => h.length < 35
    ? (h.length ? wrap(h.at(-1)!.human + 1) : start)
    : h.length < 65 ? start : wrap(h.at(-1)!.human + 2);
  return makePlayer(family, random);
}

function summarize(rounds: Round[]) {
  return {
    reward: rounds.reduce((sum, r) => sum - r.result, 0) / rounds.length,
    accuracy: rounds.filter(r => r.probabilities.indexOf(Math.max(...r.probabilities)) === r.human).length / rounds.length,
    wins: rounds.filter(r => r.result === -1).length,
    draws: rounds.filter(r => r.result === 0).length,
    losses: rounds.filter(r => r.result === 1).length,
  };
}

await initializeBackend();
const rows: Record<string, string | number>[] = [];
const totals = new Map<string, Round[]>();
const early = new Map<string, Round[]>();
const switches = new Map<string, Round[]>();
const uniform = new Map<string, Round[]>();
for (const family of families) {
  const row: Record<string, string | number> = { Player: family };
  for (const [name, options] of variants) {
    const observations: Round[] = [];
    for (let seed = 1; seed <= seeds; seed++) {
      const player = opponent(family, 8000 + seed * 97 + families.indexOf(family) * 313);
      const brain = new Brain(undefined, seededRandom(18000 + seed), 9000 + seed, options);
      try {
        brain.startMatch();
        for (let round = 0; round < 100; round++) {
          const result = await brain.play(player(brain.state.history));
          observations.push(result);
          if (family !== 'uniform') {
            if (!totals.has(name)) totals.set(name, []);
            totals.get(name)!.push(result);
            if (round < 20) { if (!early.has(name)) early.set(name, []); early.get(name)!.push(result); }
          } else { if (!uniform.has(name)) uniform.set(name, []); uniform.get(name)!.push(result); }
          if (family === 'switching' && ((round >= 35 && round < 45) || (round >= 65 && round < 75))) {
            if (!switches.has(name)) switches.set(name, []); switches.get(name)!.push(result);
          }
        }
      } finally { brain.dispose(); }
    }
    const result = summarize(observations);
    row[`${name} reward`] = result.reward.toFixed(3);
    row[`${name} prediction`] = `${(result.accuracy * 100).toFixed(1)}%`;
    row[`${name} W/D/L`] = `${result.wins}/${result.draws}/${result.losses}`;
    const matches = Array.from({ length: seeds }, (_, i) => summarize(observations.slice(i * 100, (i + 1) * 100)).reward);
    row[`${name} matches W/D/L`] = `${matches.filter(r => r > 0).length}/${matches.filter(r => r === 0).length}/${matches.filter(r => r < 0).length}`;
  }
  rows.push(row);
  console.log(`${family} complete (${seeds} independent 100-round matches per version)`);
}
console.table(rows);
console.table(variants.map(([name]) => ({
  Model: name,
  'Patterned reward': summarize(totals.get(name)!).reward.toFixed(3),
  'First-20 reward': summarize(early.get(name)!).reward.toFixed(3),
  'Switch first-10 reward': summarize(switches.get(name)!).reward.toFixed(3),
  'Uniform reward': summarize(uniform.get(name)!).reward.toFixed(3),
})));
if (summarize(totals.get('Upgraded')!).reward <= summarize(totals.get('Original')!).reward) {
  throw new Error('Upgrade did not improve aggregate patterned-opponent reward.');
}
