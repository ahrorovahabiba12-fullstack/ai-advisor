/**
 * Weighted random sample without replacement. Used to bias quiz question
 * selection toward items with a higher weight, without ever making a
 * low-weight item impossible to draw (every weight is floored above 0).
 */
export function weightedSampleWithoutReplacement<T>(items: T[], weights: number[], count: number): T[] {
  const pool = items.map((item, i) => ({ item, weight: Math.max(weights[i] ?? 1, 0.01) }));
  const picked: T[] = [];
  const take = Math.min(count, pool.length);

  for (let k = 0; k < take; k++) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(pool[idx].item);
    pool.splice(idx, 1);
  }

  return picked;
}
