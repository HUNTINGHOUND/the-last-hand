export const MOVES = ['Rock', 'Paper', 'Scissors'] as const;
export type Move = 0 | 1 | 2;
export type Probabilities = [number, number, number];
export type Result = -1 | 0 | 1; // Player's reward.
export const MATCH_LENGTH = 100;

export interface Match {
  number: number;
  rounds: number;
  wins: number;
  losses: number;
  draws: number;
}

export function emptyMatch(number = 1): Match {
  return { number, rounds: 0, wins: 0, losses: 0, draws: 0 };
}

export function matchVerdict(match: Match): 'human' | 'robot' | 'draw' | null {
  if (match.rounds < MATCH_LENGTH) return null;
  return match.wins > match.losses ? 'human' : match.wins < match.losses ? 'robot' : 'draw';
}

export interface Round {
  id: number;
  human: Move;
  ai: Move;
  result: Result;
  probabilities: Probabilities;
  loss: number;
}

export interface GameState {
  version: 1;
  rounds: number;
  wins: number;
  losses: number;
  draws: number;
  updates: number;
  history: Round[];
  // Optional so existing checkpoints migrate and command-line experiments can run indefinitely.
  match?: Match;
}

export interface Snapshot extends GameState {
  saveWarning?: string;
}

export function emptyState(): GameState {
  return { version: 1, rounds: 0, wins: 0, losses: 0, draws: 0, updates: 0, history: [] };
}

export function outcome(human: Move, ai: Move): Result {
  return human === ai ? 0 : (human - ai + 3) % 3 === 1 ? 1 : -1;
}

export function expectedRewards(p: Probabilities): Probabilities {
  return [p[2] - p[1], p[0] - p[2], p[1] - p[0]];
}

export function chooseMove(p: Probabilities, random: () => number = Math.random): Move {
  if (random() < 0.1) return Math.floor(random() * 3) as Move;
  const rewards = expectedRewards(p);
  const best = Math.max(...rewards);
  const ties = rewards.flatMap((reward, i) => best - reward < 1e-6 ? [i] : []);
  return ties[Math.floor(random() * ties.length)] as Move;
}

export function encodeHistory(history: Pick<Round, 'human' | 'ai' | 'result'>[]): number[][] {
  const sequence = Array.from({ length: 20 }, () => Array<number>(9).fill(0));
  const recent = history.slice(-20);
  recent.forEach((round, i) => {
    const row = sequence[20 - recent.length + i];
    row[round.human] = 1;
    row[3 + round.ai] = 1;
    row[6 + round.result + 1] = 1;
  });
  return sequence;
}

export function rollingEdge(history: Round[]): number {
  const recent = history.slice(-50);
  return recent.length ? recent.reduce((sum, round) => sum - round.result, 0) / recent.length : 0;
}
