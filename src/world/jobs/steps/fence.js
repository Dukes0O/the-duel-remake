// TOWN-JOBS-2: the fence step (docs/WASTELAND_TOWN.md sections 7 and 11: "Drop fence at four stops around an outpost, so it is
// safer from then on"). Drive to each stop in turn, stop in its ring, and hold still while the gang lifts that side's fence off
// the truck. Pure: no DOM, no Three.js, nothing from app.js; repeatable from what the truck did.
//
// Every bundle dropped makes the truck lighter (the mode reads `state.loadKg`). A stop may have Road Rats waiting
// (`rats`, src/world/jobs/town-rats.js): the gang will not unload while a Rat stands near, so drive at them or wait them out.
// Nothing is lost by it and there is no clock. Driving out of the ring part way through keeps what is already on the ground.
//
// Real numbers, and where they come from:
// - The fence is the town's own wooden one, 1.4 m tall (src/town/content/outposts-world.js). Softwood is about 500 kg a cubic
//   metre: posts of 100 mm square every 2.4 m, three rails of 38 by 100 mm and pales of 20 by 100 mm come to about 24 kg for
//   each metre of fence. A side of about 25 m is a bundle of 600 kg, and four sides are 2,400 kg, well inside the supply
//   truck's 9,000 kg.
// - Two people lift a rail or a post off a truck in a few seconds; a bundle is about 40 lifts. The game's clock runs a bundle
//   in `seconds`, as loading runs faster than life (section 2: "nothing makes you wait around").
import {stepRats, dismissRats} from '../town-rats.js';

export const FENCE_RULE = Object.freeze({seconds:5, easySeconds:4, stillKmh:1.5, radius:10, bundleKg:600, kgPerMetre:24});

// What each event sounds like (src/sound-bank.js): a bundle coming off is the load thump, and the last one is the
// finished-step chime. Rats arriving and leaving are the Rats' own cues (src/world/jobs/town-rats.js).
export const FENCE_CUES = Object.freeze({fenceDropped:'world.bellows.load', fenceDone:'interface.bonus'});

const finite = Number.isFinite;
const spot = value => value?.position ?? value ?? {};
const gap = (a, b) => Math.hypot((a?.x ?? 0) - (spot(b).x ?? 0), (a?.z ?? 0) - (spot(b).z ?? 0));
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Seconds of holding still that one stop takes at this difficulty. */
export function fenceSeconds(step, difficulty = 'medium') {
  return difficulty === 'easy' ? step.easySeconds ?? Math.min(step.seconds ?? FENCE_RULE.seconds, FENCE_RULE.easySeconds) : step.seconds ?? FENCE_RULE.seconds;
}

const bundleKg = (step, stop) => stop?.kg ?? step.bundleKg ?? FENCE_RULE.bundleKg;
/** The kilograms of fence still on the truck with `index` stops done. */
export function fenceLoadKg(step, index = 0) {
  return (step.stops ?? []).slice(index).reduce((sum, stop) => sum + bundleKg(step, stop), 0);
}

/** What the screen line asks for in each part of the fence run. */
export function fenceLine(step, state = {}) {
  const stops = step.stops ?? [], index = state.index ?? 0, left = stops.length - index;
  if (left <= 0) return 'The fence is all down.';
  const count = `${(NUMBER[left] ?? String(left)).replace(/^./, letter => letter.toUpperCase())} stop${left === 1 ? '' : 's'} to go.`;
  if (state.stopped === 'rats') return 'Road Rats are in the way. Drive at them, or wait until they give up.';
  if (state.dropping) return `Hold still while the fence comes off. ${count}`;
  return `Drive to the next stop and hold still in the ring. ${count}`;
}

export function stepFence(step, state, view, dt = 0) {
  const stops = step.stops ?? [], here = view.player?.position ?? {}, difficulty = view.difficulty ?? 'medium';
  const kmh = Math.abs(finite(view.speedKmh) ? view.speedKmh : 0), still = kmh < FENCE_RULE.stillKmh && !view.onFoot;
  const next = {index:state.index ?? 0, clock:state.clock ?? 0, dropping:false, stopped:null, said:state.said ?? [],
    reported:state.reported === true, rats:state.rats ?? {}};
  const events = [], requests = [];
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };
  const stop = stops[next.index];
  if (stop) {
    const radius = stop.radius ?? step.radius ?? FENCE_RULE.radius;
    requests.push({type:'marker', place:{...stop, radius}});
    const inRing = gap(here, stop) <= radius;
    // A stop's Rats come out when the truck first gets near it, and stay out until they are beaten or give up.
    const rats = stop.rats ?? (step.rats && (step.rats.atStops ?? []).includes(next.index) ? step.rats : null);
    let ratsStop = false;
    if (rats && gap(here, stop) <= (rats.alertMetres ?? 80)) {
      const key = `${rats.id ?? step.id ?? 'fence'}-${next.index}`;
      const gang = stepRats(rats, next.rats[key], view, dt, {key, place:rats.place ?? stop});
      next.rats = {...next.rats, [key]:gang.state}; ratsStop = gang.stopping;
      events.push(...gang.events); requests.push(...gang.requests);
    }
    if (inRing && still && ratsStop) next.stopped = 'rats';
    if (inRing && still && !ratsStop) {
      next.dropping = true;
      next.clock += dt;
      if (next.clock >= fenceSeconds(step, difficulty)) {
        const kg = bundleKg(step, stop);
        events.push({type:'fenceDropped', cue:FENCE_CUES.fenceDropped, id:stop.id ?? null, index:next.index, kg, left:stops.length - next.index - 1,
          position:{x:spot(stop).x, z:spot(stop).z}});
        say(stop.lineId ?? step.dropLineId);
        next.index += 1; next.clock = 0; next.dropping = false;
        const share = next.index / stops.length;
        for (const cue of step.sayAt ?? []) if (finite(cue.progress) && share >= cue.progress && !next.said.includes(cue.lineId)) {
          next.said = [...next.said, cue.lineId];
          say(cue.lineId);
        }
      }
    }
  }
  // The Rats of a stop that is done go away with it.
  for (const [key, gang] of Object.entries(next.rats)) {
    const stopIndex = Number(key.slice(key.lastIndexOf('-') + 1));
    if (!(stopIndex < next.index)) continue;
    const sent = dismissRats(gang, key);
    next.rats = {...next.rats, [key]:sent.state}; requests.push(...sent.requests);
  }
  next.loadKg = fenceLoadKg(step, next.index);
  const complete = next.index >= stops.length;
  if (complete && !next.reported) {
    next.reported = true;
    const sentence = `The fence is down at all ${NUMBER[stops.length] ?? stops.length} stops.`;
    events.push({type:'fenceDone', cue:FENCE_CUES.fenceDone, stops:stops.length, sentence, result:{kind:'fence', stops:stops.length, sentence}});
  }
  // The bundles on the ground, for the drawing: a plain record the view reads and nothing reads back.
  requests.push({type:'things', id:'fence', things:stops.slice(0, next.index).map((done, index) => ({id:done.id ?? `fence-${index + 1}`, kind:'fence-bundle',
    x:spot(done).x, z:spot(done).z, radius:3}))});
  requests.push({type:'gauge', id:step.id ?? 'fence', label:'stops done', value:Math.min(next.index, stops.length), total:stops.length,
    share:stops.length ? Math.min(1, next.index / stops.length) : 1});
  return {state:next, complete, events, requests};
}
