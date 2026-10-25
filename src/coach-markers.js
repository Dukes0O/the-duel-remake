import {cornerId} from './track-analysis.js';

// Presentation preferences live only for this App and current player. They
// never enter a profile, replay, simulation state or persistent storage.
const preferences = new WeakMap();
function preference(app) {
  if (!app || !app.player?.id) return null;
  let row = preferences.get(app);
  if (!row || row.playerId !== app.player.id) {
    row = {playerId:app.player.id, enabled:false};
    preferences.set(app, row);
  }
  return row;
}
export function setCoachEnabled(app, enabled) {
  const row = preference(app);
  if (row) row.enabled = enabled === true;
}
export function coachEnabled(app) { return preference(app)?.enabled === true; }

export function coachAllowed(context = {}) {
  return typeof context.playerId === 'string' && context.playerId.length > 0 &&
    context.racePlayerId === context.playerId && context.runPlayerId === context.playerId && context.enabled === true && context.flag === true && context.intelLevel >= 2 &&
    context.status === 'racing' && context.cup !== true && context.onFoot !== true &&
    context.inspection !== true && ['duel','timetrial','grandprix'].includes(context.mode) &&
    !(context.mode === 'grandprix' &&
      (context.difficulty === 'hard' || context.cpuDifficulty === 'hard'));
}

const wrap = (s, length) => ((s % length) + length) % length;
function groundPoint(course, s, lateral) {
  const world = course.worldAt(s, lateral), ground = course.groundAt(s, lateral);
  return world && Number.isFinite(world.x) && Number.isFinite(world.z) && Number.isFinite(ground?.y)
    ? {x:world.x, y:Math.max(Number.isFinite(world.y) ? world.y : ground.y, ground.y) + .06, z:world.z} : null;
}

// The caller supplies the same current, fingerprint-checked dossier used by
// Team Room. Lines follow its actual reference car, never an invented ideal.
export function buildCoachMarkers(course, dossier, context) {
  if (!coachAllowed(context) || course?.closed === false || !(course?.length > 0) ||
      dossier?.courseId !== course.def?.id || dossier?.reference?.eventId !== course.def?.id ||
      dossier.route !== dossier.reference.route) return [];
  const poses = dossier.reference.poseSamples;
  if (!Array.isArray(poses) || poses.length < 2) return [];
  const measured = new Map((dossier.reference.corners ?? []).map(row => [row.id, row]));
  const markers = [];
  for (const corner of dossier.analysis?.corners ?? []) {
    const id = corner.id ?? cornerId(corner), note = dossier.notes?.[id], reference = measured.get(id);
    if (!note || !Number.isFinite(reference?.brakeS) ||
        ![corner.entryS,corner.apexS,corner.exitS].every(Number.isFinite)) continue;
    const span = wrap(corner.exitS - corner.entryS, course.length);
    if (!(span > 0)) continue;
    const line = poses.filter(row => Array.isArray(row) && Number.isFinite(row[1]) &&
      Number.isFinite(row[2]) && wrap(row[1] / 100 - corner.entryS, course.length) <= span)
      .map(row => ({s:wrap(row[1] / 100, course.length), lateral:row[2] / 100}))
      .sort((a,b) => wrap(a.s - corner.entryS, course.length) - wrap(b.s - corner.entryS, course.length))
      .map(row => groundPoint(course, row.s, row.lateral));
    const brake = groundPoint(course, wrap(reference.brakeS, course.length), 0);
    if (!brake || line.length < 2 || line.some(point => !point)) continue;
    markers.push({id, brake, line});
  }
  return markers;
}

export function coachRaceContext(app, course, state) {
  if (!course?.def || !state) return {};
  return {enabled:coachEnabled(app),flag:app._switches?.().enabled('grand-prix') === true,
    playerId:app.player?.id,runPlayerId:app._runPlayerId,racePlayerId:state.playerId,
    intelLevel:app.getIntelLevel?.(course.def.id) ?? 0,status:state.paused ? 'paused' : state.status,
    mode:state.mode,difficulty:state.difficulty,cpuDifficulty:state.cpuDifficulty,
    cup:!!app._cupRace || !!app.profile?.cups?.active,onFoot:state.onFoot,
    inspection:!!app.inspectionCamera || !!state.deepJourney || !!state.helicopter};
}
