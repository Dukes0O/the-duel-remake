// `weather: 'dust-night'` on a job step (SHIPS-DECKS, docs/story/ships-in-the-sand.md section 6): the step runs at night in thick
// dust, with short sight and the lighthouse beam sweeping. View only. Nothing here is written to race state and no rule reads it:
// the renderer asks `dustNightOf(state)` each frame, and the answer comes from the job's own data. Pure: no DOM, no Three.js.
import {LIGHTHOUSE_LAMP} from './deck-plates.js';

export const DUST_NIGHT = Object.freeze({
  id: 'dust-night',
  // Sight in the dust: the fog closes from 6 m and hides everything past 70 m.
  fogNear: 6,
  fogFar: 70,
  fogColor: 0x3b2c1f,
  // Night: the picture is darker than the moonlit night of other jobs, and a dome of dust hides the sky.
  exposure: .62,
  domeRadius: 1400,
  // The lamp turns once every 12 seconds, as a real lighthouse light turns in its own steady time.
  beamTurnSeconds: 12,
  beamLength: 900,
  lamp: LIGHTHOUSE_LAMP,
  // Dust blowing past, drawn around the camera.
  dustBox: 46,
  dustCount: 900,
  windX: 5.5,
  windZ: 2,
});

// The weather of the step being played, from its data: 'dust-night', or null.
export function stepWeather(state) {
  const arena = state?.arena;
  if (arena?.mode !== 'world-job') return null;
  const job = arena.worldJob?.job, step = job?.steps?.[job.stepIndex];
  return job && !job.done ? step?.weather ?? null : null;
}

export function dustNightOf(state) {
  return stepWeather(state) === DUST_NIGHT.id ? DUST_NIGHT : null;
}

// Where the beam points, in radians from +z toward +x, at `seconds` of the view's own clock (never the race clock).
export function beamHeading(seconds, weather = DUST_NIGHT) {
  const turn = (Number.isFinite(seconds) ? seconds : 0) / weather.beamTurnSeconds;
  return (turn - Math.floor(turn)) * Math.PI * 2;
}
