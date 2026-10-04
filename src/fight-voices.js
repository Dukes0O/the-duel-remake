import {wastelandRulesActive} from './wasteland-access.js';

export const FIGHT_VOICE_LINES = Object.freeze({
  'crew.cinder.callout': {file: 'crew-cinder-callout.mp3', text: 'That road is mine. Keep moving.'},
  'crew.dune.callout': {file: 'crew-dune-callout.mp3', gain: 1.1, text: 'One clean shot. Keep the car steady.'},
  'crew.jax.callout': {file: 'crew-jax-callout.mp3', gain: 1.35, text: 'Close the distance. I will catch the rest.'},
  'crew.nell.callout': {file: 'crew-nell-callout.mp3', text: 'Give me a gap. I will make it wider.'},
  'crew.odessa.callout': {file: 'crew-odessa-callout.mp3', gain: 1.15, text: 'Hold still. This engine has one more run in it.'},
  'crew.rook.callout': {file: 'crew-rook-callout.mp3', text: 'Road is clear. Keep your wheels under you.'},
  'crew.tusk.callout': {file: 'crew-tusk-callout.mp3', gain: 1.5, text: 'Too much scrap in the way. I will shift it.'},
  'crew.wren.callout': {file: 'crew-wren-callout.mp3', text: 'Clear path on the left. Follow my dust.'},
  'raider.toll': {file: 'raider-toll.mp3', text: 'Turn around, driver. This road has a toll.'},
});

// Presentation history lives outside the seeded race. HUD reads never play sound.
const subtitles = new WeakMap();
export const readFightSubtitle = state => subtitles.get(state) ?? null;
const playing = state => state && state.mode === 'wasteland' &&
  wastelandRulesActive(state) && !state.paused &&
  ['racing', 'exploring'].includes(state.status);
const playerAction = (event, state) => !event.enemy &&
  (!event.actor || event.actor === 'player' || event.actor === state) &&
  (event.weaponFired || event.footRepairStarted ||
    /\.(fire|deploy|start)$/.test(event.arsenalCue || '') ||
    /\.(fire|throw|launch|deploy|start)$/.test(event.crewGearCue || ''));

export function createFightVoices({enabled, audible, play, duration}) {
  let state = null, active = null, queue = [], seen = new Set();
  const stop = () => {
    active?.voice?.stop?.();
    if (active) active.voice = null;
  };
  function clear() {
    stop();
    if (state) subtitles.delete(state);
    active = null;
    queue = [];
  }
  function follow(next) {
    if (state === next) return;
    clear();
    state = next;
    seen = new Set();
  }
  function start(id) {
    const seconds = Math.max(3, Number(duration(id)) || 4.5);
    active = {id, until: (Number(state.stageTimeSec) || 0) + seconds + .4,
      voice: audible() ? play(id) : null};
    subtitles.set(state, FIGHT_VOICE_LINES[id].text);
  }
  function update(next) {
    follow(next);
    if (!enabled() || !playing(state)) {clear(); return;}
    if (!audible()) stop();
    if (active && (Number(state.stageTimeSec) || 0) >= active.until) {
      clearActive();
    }
    if (!active && queue.length) start(queue.shift());
  }
  function clearActive() {
    stop();
    subtitles.delete(state);
    active = null;
  }
  function enqueue(id, key) {
    if (!FIGHT_VOICE_LINES[id] || seen.has(key)) return;
    seen.add(key);
    if (active && queue.length < 3) queue.push(id);
    else if (!active) start(id);
  }
  return {
    update,
    mute: stop,
    clear,
    event(event, next) {
      follow(next);
      if (event?.stageLoaded != null) {clear(); seen.clear(); return;}
      update(next);
      if (!enabled() || !playing(state) || !event) return;
      if (playerAction(event, state)) enqueue(`crew.${state.crewId}.callout`, 'crew');
      if (event.raiderWarning) enqueue('raider.toll', `raider:${event.zone ?? 'warning'}`);
    },
  };
}
