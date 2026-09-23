export const WIN_RATE_TARGETS = Object.freeze({
  easy: [0.80, 0.95],
  medium: [0.45, 0.65],
  hard: [0.20, 0.40],
});

export function winRateFailures(rows) {
  return Object.entries(WIN_RATE_TARGETS).flatMap(([difficulty, [low, high]]) => {
    const { wins, races } = rows?.[difficulty] ?? {};
    if (!Number.isInteger(wins) || !Number.isInteger(races) || races < 1 || wins < 0 || wins > races) {
      return [`${difficulty} win-rate sample is missing or invalid`];
    }
    const rate = wins / races;
    return rate < low || rate > high
      ? [`${difficulty} win rate ${wins}/${races} (${Math.round(rate * 100)}%) is outside ${low * 100}–${high * 100}%`]
      : [];
  });
}
