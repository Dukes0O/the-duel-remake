// Pure frame-policy validation; no measurement or browser scenario.
export function validateFrameLeg(row) {
  for (const [name, timing, count] of [
    ['cpu', row.pacing.cpu, 360], ['delivered', row.pacing.delivered, 359],
    ['update', row.update, 360], ['combined', row.combined, 360]]) {
    if (timing?.samples !== count || !Number.isFinite(timing.p95) || timing.p95 <= 0)
      throw Error('Incomplete full-view ' + name + ' samples');
  }
  if (row.gpuSupported && (row.pacing.gpu?.samples < 288 || row.pacing.gpu?.samples > 360 ||
      !Number.isFinite(row.pacing.gpu?.p95) || row.pacing.gpu.p95 <= 0))
    throw Error('Incomplete full-view GPU samples');
  if (!row.gpuSupported && row.pacing.gpu) throw Error('Unsupported GPU cannot claim timing');
  if (row.scales.length !== 1 || row.ratios.length !== 1) throw Error('Changing full-view resolution');
}

export function compareFrameCosts(row) {
  validateFrameLeg(row);
  const delivered = {ms: row.pacing.delivered.p95, limit: 18.5,
    passed: row.pacing.delivered.p95 <= 18.5};
  const ms = row.witness?.constructionMs;
  if (!Number.isFinite(ms) || ms < 0) throw Error('Actual kit construction timing missing');
  const construction = {ms, limit: 1000, passed: ms < 1000};
  return {delivered, construction, passed: delivered.passed && construction.passed};
}

