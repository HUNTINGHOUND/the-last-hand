import type { Move, Round } from '../src/game.ts';

export function seededRandom(seed: number): () => number {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

export type Player = (history: Pick<Round, 'human' | 'ai' | 'result'>[]) => Move;
export const wrap = (value: number) => ((value % 3 + 3) % 3) as Move;
export const randomMove = (random: () => number) => Math.floor(random() * 3) as Move;

// Each episode draws different moves, outcome rules, periods, noise and switch times.
export function makePlayer(family: string, random: () => number, noise = 0): Player {
  const start = randomMove(random);
  const direction = random() < .5 ? 1 : 2;
  const period = Array.from({ length: 2 + Math.floor(random() * 4) }, () => randomMove(random));
  const responses = Array.from({ length: 3 }, () => randomMove(random));
  const switchEvery = 8 + Math.floor(random() * 18);
  const first = family === 'switch' ? makePlayer('cycle', random) : undefined;
  const second = family === 'switch' ? makePlayer('response', random) : undefined;
  return history => {
    if (random() < noise) return randomMove(random);
    const last = history.at(-1);
    if (!last) return start;
    switch (family) {
      case 'constant': return start;
      case 'cycle': return wrap(last.human + direction);
      case 'alternating': return last.human === start ? wrap(start + direction) : start;
      case 'response': return wrap(last.ai + start);
      case 'outcome': return wrap(last.human + responses[last.result + 1]);
      case 'periodic': return period[history.length % period.length];
      case 'biased': return random() < .75 ? start : randomMove(random);
      case 'switch': return Math.floor(history.length / switchEvery) % 2 ? second!(history) : first!(history);
      default: return randomMove(random);
    }
  };
}
