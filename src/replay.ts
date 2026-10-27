export type ReplayPolicy = 'recent' | 'legacy';

export function replayIndices(length: number, random: () => number, policy: ReplayPolicy = 'recent'): number[] {
  if (length < 1) return [];
  const last = length - 1;
  const available = Math.min(500, length);
  if (policy === 'legacy') {
    return [last, ...Array.from({ length: 7 }, () => last - Math.floor(random() ** 2 * available))];
  }
  // Six of eight targets focus on the current habit, including two newest examples.
  // Two long-memory examples retain useful habits across rematches.
  const indices = [last, last];
  for (let i = 0; i < 4; i++) {
    const age = Math.min(length - 1, 31, Math.floor(-Math.log(1 - random()) * 6));
    indices.push(last - age);
  }
  for (let i = 0; i < 2; i++) indices.push(last - Math.floor(random() ** 2 * available));
  return indices;
}
