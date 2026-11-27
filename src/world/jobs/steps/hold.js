// TOWN-JOBS-2: the hold step (docs/WASTELAND_TOWN.md sections 7 and 11; docs/story/the-polite-letter.md section 7 says how the
// gauge works). Drive to a place, stop inside its ring, and stay there while a gauge fills. Pure: no DOM, no Three.js, nothing
// from app.js; repeatable from what the vehicle did.
//
// The gauge (`gauge: {label, total, seconds}`) counts up to `total` over `seconds` of holding. It pauses whenever the vehicle is
// not stopped in the ring, and nothing is lost by leaving or being pushed out: come back, stop, and it carries on. There is no
// clock. With `keepOutside` the ring is the other way round: the gauge fills while the vehicle stays outside the inner ring and
// inside the place's `outerRadius`. A step with `tank` pumps its water as the gauge fills, so the truck gets lighter as it
// empties (the mode reads `state.tankL`). A step with `rats` (src/world/jobs/town-rats.js) pauses while Rats stand near.
//
// Real numbers, and where they come from:
// - The water tanker's pump gives 600 litres a minute (src/town/content/work-vehicles.js), so its 5,600 litre tank takes nine
//   minutes to empty. The game's clock runs that in the gauge's `seconds`, as loading runs faster than life (section 2:
//   "nothing makes you wait around").
import {stepRats} from '../town-rats.js';

export const HOLD_RULE = Object.freeze({stopSpeed:.5, radius:12, seconds:45, easyRadiusBonus:4});

// What each event sounds like (src/sound-bank.js): the gauge starting is the tank's fill, being moved off the spot is the
// interrupted-repair sound, and the gauge full is the finished-step chime.
export const HOLD_CUES = Object.freeze({holdStarted:'town.fill', holdPaused:'repair.interrupted', holdResumed:'town.fill', holdDone:'interface.bonus'});

const finite = Number.isFinite;
const spot = value => value?.position ?? value ?? {};
const gap = (a, b) => Math.hypot((a?.x ?? 0) - (spot(b).x ?? 0), (a?.z ?? 0) - (spot(b).z ?? 0));
const group = value => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** The ring's radius at this difficulty: wider on Easy. */
export function holdRadius(step, difficulty = 'medium') {
  const radius = step.radius ?? step.place?.radius ?? HOLD_RULE.radius;
  return difficulty === 'easy' ? step.easyRadius ?? radius + HOLD_RULE.easyRadiusBonus : radius;
}

/** The gauge as the screen shows it: {label, value, total, share}. */
export function holdGauge(step, state = {}) {
  const total = step.gauge?.total ?? 100, share = Math.max(0, Math.min(1, state.share ?? 0));
  return {label:step.gauge?.label ?? 'done', value:Math.round(total * share), total, share};
}

/** What the screen line asks for in each part of the hold. */
export function holdLine(step, state = {}) {
  const gauge = holdGauge(step, state), name = step.place?.name ?? 'the ring';
  if (!state.arrived) return step.what ?? `Drive to ${name} and stop inside the ring.`;
  if (state.stopped === 'rats') return 'Road Rats are in the way. Drive at them, or wait until they give up.';
  if (!state.holding) return step.keepOutside ? 'Stay outside the inner ring.' : `Get back in the ring and stop. ${group(gauge.value)} of ${group(gauge.total)} ${gauge.label}.`;
  return `Hold still. ${group(gauge.value)} of ${group(gauge.total)} ${gauge.label}.`;
}

export function stepHold(step, state, view, dt = 0) {
  const here = view.player?.position ?? {}, difficulty = view.difficulty ?? 'medium';
  const mps = Math.abs(finite(view.speedKmh) ? view.speedKmh : 0) / 3.6;
  const radius = holdRadius(step, difficulty), away = gap(here, step.place);
  const inPlace = step.keepOutside ? away > radius && away <= (step.outerRadius ?? radius * 4) : away <= radius;
  const stopped = step.keepOutside ? true : mps <= (step.stopSpeed ?? HOLD_RULE.stopSpeed) && !view.onFoot;
  const seconds = Math.max(.001, (difficulty === 'easy' ? step.gauge?.easySeconds : null) ?? step.gauge?.seconds ?? HOLD_RULE.seconds);
  const next = {share:state.share ?? 0, arrived:state.arrived === true, holding:false, stopped:null, said:state.said ?? [],
    outs:state.outs ?? 0, wasOut:state.wasOut === true, reported:state.reported === true, rats:state.rats ?? {}};
  const events = [], requests = [{type:'marker', place:{...step.place, radius}}];
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };
  const done = next.share >= 1;

  let ratsStop = false;
  if (step.rats && next.arrived) {
    const gang = stepRats(step.rats, next.rats, view, dt, {key:step.rats.id ?? step.id ?? 'hold', place:step.rats.place ?? step.place, finished:done});
    next.rats = gang.state; ratsStop = gang.stopping;
    events.push(...gang.events); requests.push(...gang.requests);
  }
  if (!done) {
    if (inPlace && stopped && !next.arrived) {
      next.arrived = true;
      events.push({type:'holdStarted', cue:HOLD_CUES.holdStarted});
      say(step.arriveLineId); say(step.holdLineId);
    }
    const holding = next.arrived && inPlace && stopped && !ratsStop;
    if (next.arrived && !holding) next.stopped = ratsStop ? 'rats' : inPlace ? 'moving' : 'out';
    if (state.holding && !holding && !inPlace) {
      next.outs += 1;
      events.push({type:'holdPaused', cue:HOLD_CUES.holdPaused, callout:step.keepOutside ? 'Too close. Back off.' : 'You are out of the ring. Nothing is lost. Get back in and stop.'});
      say(next.outs === 1 ? step.firstShoveLineId ?? step.outLineId : step.outLineId);
    }
    if (next.arrived && !inPlace) next.wasOut = true;
    if (holding && next.wasOut) {
      next.wasOut = false;
      events.push({type:'holdResumed', cue:HOLD_CUES.holdResumed});
      say(step.backLineId);
    }
    next.holding = holding;
    if (holding) {
      const before = next.share;
      next.share = Math.min(1, before + dt / seconds);
      for (const cue of step.sayAt ?? []) if (finite(cue.progress) && before < cue.progress && next.share >= cue.progress && !next.said.includes(cue.lineId)) {
        next.said = [...next.said, cue.lineId];
        say(cue.lineId);
      }
    }
  }
  // A tank pumps out as the gauge fills: what is left is the truck's weight too (1 kg a litre).
  if (step.tank) next.tankL = Math.round((step.tank.startL ?? 0) * (1 - next.share));
  const complete = next.share >= 1;
  if (complete && !next.reported) {
    next.reported = true;
    const gauge = holdGauge(step, next);
    const sentence = `${group(gauge.total)} ${gauge.label}.`;
    events.push({type:'holdDone', cue:HOLD_CUES.holdDone, total:gauge.total, outs:next.outs, sentence,
      result:{kind:'hold', total:gauge.total, label:gauge.label, outs:next.outs, sentence}});
  }
  requests.push({type:'gauge', id:step.id ?? 'hold', ...holdGauge(step, next)});
  return {state:next, complete, events, requests};
}
