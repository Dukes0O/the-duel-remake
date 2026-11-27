// TOWN-JOBS-2: the clear step (docs/WASTELAND_TOWN.md sections 7 and 11: "Push and crush wrecks off the road"). Wrecks lie on a
// stretch of road; push each one off the road with the vehicle's nose, or hit it fast enough to flatten it. Pure: no DOM, no
// Three.js, nothing from app.js; repeatable from the job's seed and what the vehicle did.
//
// A wreck moves when the vehicle's nose is against it: it is shoved ahead, away from the vehicle, so it goes where the
// vehicle is pointed. It is clear of the road once the whole of it is past the road's edge (or, with `pushOutTo`, once it is
// in that heap's ring). A wreck met at `crushKmh` or more is flattened where it lies, and a flat wreck is no longer in
// anybody's way. What is being pushed is weight on the vehicle (the mode reads `state.loadKg`): steel dragged over dirt
// resists with about six tenths of its weight. There is no clock and nothing can be lost.
//
// Real numbers, and where they come from:
// - A car body stripped for parts is about 350 kg, a whole scrap car about 1,200 kg and a van body about 1,600 kg.
// - Steel sliding on dry earth has a friction of about 0.6.
// - The Scablands' roads are 28 m wide (src/world/scablands-road.js: a half width of 14 m).
import {makeRng} from '../../../rng.js';

export const CLEAR_RULE = Object.freeze({halfWidth:14, noseMetres:2.2, crushKmh:40, easyCrushKmh:30, friction:.6, spreadMetres:60, wrecks:6});

export const CLEAR_WRECKS = Object.freeze([
  Object.freeze({kind:'shell', name:'stripped car body', kg:350, radius:2.2}),
  Object.freeze({kind:'car', name:'scrap car', kg:1200, radius:2.4}),
  Object.freeze({kind:'van', name:'van body', kg:1600, radius:2.8}),
]);

// What each event sounds like (src/sound-bank.js): the nose meeting a wreck is a crash's thud, a wreck going over the road's
// edge is the load thump, a wreck flattened is metal crushing, and the road clear is the finished-step chime.
export const CLEAR_CUES = Object.freeze({clearPush:'vehicle.crash-impact', clearOff:'world.bellows.load', clearCrushed:'vehicle.crush', clearDone:'interface.bonus'});

const finite = Number.isFinite;
const spot = value => value?.position ?? value ?? {};
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

// How far a point is from the road's middle line, and how far along it.
function onLine(line, point) {
  let best = {across:Infinity, along:0}, walked = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = spot(line[i]), b = spot(line[i + 1]), dx = b.x - a.x, dz = b.z - a.z, square = dx * dx + dz * dz, span = Math.sqrt(square);
    const t = square > 0 ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / square)) : 0;
    const across = Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
    if (across < best.across) best = {across, along:walked + span * t};
    walked += span;
  }
  return best;
}
function pointAlong(line, metres) {
  let walked = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = spot(line[i]), b = spot(line[i + 1]), span = Math.hypot(b.x - a.x, b.z - a.z);
    if (walked + span >= metres || i === line.length - 2) {
      const t = span > 0 ? Math.max(0, Math.min(1, (metres - walked) / span)) : 0;
      return {x:a.x + (b.x - a.x) * t, z:a.z + (b.z - a.z) * t, side:{x:span > 0 ? (b.z - a.z) / span : 1, z:span > 0 ? -(b.x - a.x) / span : 0}};
    }
    walked += span;
  }
  return {...spot(line[0]), side:{x:1, z:0}};
}

/** How many wrecks the step has at this difficulty. */
export function clearCount(step, difficulty = 'medium') {
  return Math.max(1, Math.floor(difficulty === 'easy' ? step.easyWrecks ?? step.wrecks ?? CLEAR_RULE.wrecks : step.wrecks ?? CLEAR_RULE.wrecks));
}

/** The wrecks as they lie at the start: seeded, spread along the road's stretch and across its width. */
export function clearWrecks(step, seed = 0, difficulty = 'medium') {
  const line = step.line ?? [step.place, step.place], half = step.halfWidth ?? CLEAR_RULE.halfWidth;
  const rng = makeRng(((seed >>> 0) ^ 0x434c4552) >>> 0 || 1), count = clearCount(step, difficulty);
  const middle = onLine(line, spot(step.place)).along, spread = step.spreadMetres ?? CLEAR_RULE.spreadMetres;
  return Array.from({length:count}, (_, index) => {
    const kind = CLEAR_WRECKS[rng.int(0, CLEAR_WRECKS.length - 1)];
    // Evenly along the stretch with a little scatter, so no two start on top of each other.
    const along = middle - spread / 2 + spread * (index + .5) / count + (rng.float() - .5) * spread / count * .5;
    const at = pointAlong(line, along), across = (rng.float() - .5) * half * 1.2;
    return {id:`wreck-${index + 1}`, kind:kind.kind, name:kind.name, kg:kind.kg, radius:kind.radius, x:at.x + at.side.x * across, z:at.z + at.side.z * across,
      cleared:null};
  });
}

/** What the screen line asks for. */
export function clearLine(step, state = {}) {
  const left = (state.wrecks ?? []).filter(wreck => !wreck.cleared).length;
  if (!state.wrecks) return step.what ?? 'Drive to the wrecks on the road.';
  if (left <= 0) return 'The road is clear.';
  const count = `${(NUMBER[left] ?? String(left)).replace(/^./, letter => letter.toUpperCase())} wreck${left === 1 ? '' : 's'} to go.`;
  return `Push each wreck off the road, or hit it hard to flatten it. ${count}`;
}

export function stepClear(step, state, view, dt = 0, seed = 0) {
  const difficulty = view.difficulty ?? 'medium', here = view.player?.position ?? {};
  const kmh = Math.abs(finite(view.speedKmh) ? view.speedKmh : 0);
  const line = step.line ?? [step.place, step.place], half = step.halfWidth ?? CLEAR_RULE.halfWidth;
  const heap = step.pushOutTo ? {...spot(step.pushOutTo), radius:step.pushOutTo.radius ?? 20} : null;
  const crushKmh = difficulty === 'easy' ? step.easyCrushKmh ?? CLEAR_RULE.easyCrushKmh : step.crushKmh ?? CLEAR_RULE.crushKmh;
  const wrecks = (state.wrecks ?? clearWrecks(step, seed, difficulty)).map(wreck => ({...wreck}));
  const next = {wrecks, touching:[], said:state.said ?? [], reported:state.reported === true};
  const events = [], requests = [];
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };
  const before = wrecks.filter(wreck => wreck.cleared).length;
  let pushedKg = 0;
  if (!view.onFoot && finite(here.x) && finite(here.z)) for (const wreck of wrecks) {
    if (wreck.cleared) continue;
    const dx = wreck.x - here.x, dz = wreck.z - here.z, apart = Math.hypot(dx, dz), reach = wreck.radius + (step.noseMetres ?? CLEAR_RULE.noseMetres);
    if (apart > reach) continue;
    next.touching.push(wreck.id);
    if (!(state.touching ?? []).includes(wreck.id)) {
      if (step.crush !== false && kmh >= crushKmh) {
        wreck.cleared = 'crushed';
        events.push({type:'clearCrushed', cue:CLEAR_CUES.clearCrushed, id:wreck.id, name:wreck.name, position:{x:wreck.x, z:wreck.z},
          callout:`You flattened a ${wreck.name}.`});
        continue;
      }
      events.push({type:'clearPush', cue:CLEAR_CUES.clearPush, id:wreck.id, position:{x:wreck.x, z:wreck.z}});
    }
    // Shoved ahead of the nose: it stays a nose and its own half-length from the vehicle's middle, on the line from one to the other.
    const ux = apart > 0 ? dx / apart : 1, uz = apart > 0 ? dz / apart : 0;
    wreck.x = here.x + ux * reach; wreck.z = here.z + uz * reach;
    const off = heap ? Math.hypot(wreck.x - heap.x, wreck.z - heap.z) <= heap.radius : onLine(line, wreck).across >= half + wreck.radius;
    if (off) {
      wreck.cleared = 'off';
      events.push({type:'clearOff', cue:CLEAR_CUES.clearOff, id:wreck.id, name:wreck.name, position:{x:wreck.x, z:wreck.z},
        callout:`A ${wreck.name} is off the road.`});
    } else pushedKg += wreck.kg;
  }
  const clearedNow = wrecks.filter(wreck => wreck.cleared).length, share = wrecks.length ? clearedNow / wrecks.length : 1;
  if (clearedNow > before) for (const cue of step.sayAt ?? []) if (finite(cue.progress) && share >= cue.progress && !next.said.includes(cue.lineId)) {
    next.said = [...next.said, cue.lineId];
    say(cue.lineId);
  }
  next.loadKg = Math.round(pushedKg * (step.friction ?? CLEAR_RULE.friction));
  const complete = clearedNow >= wrecks.length;
  if (complete && !next.reported) {
    next.reported = true;
    const crushed = wrecks.filter(wreck => wreck.cleared === 'crushed').length, pushed = wrecks.length - crushed;
    const word = count => `${NUMBER[count] ?? count} wreck${count === 1 ? '' : 's'}`;
    const sentence = crushed === 0 ? `You pushed ${word(pushed)} off the road.` : pushed === 0 ? `You flattened ${word(crushed)}.`
      : `You pushed ${word(pushed)} off the road and flattened ${NUMBER[crushed] ?? crushed}.`;
    events.push({type:'clearDone', cue:CLEAR_CUES.clearDone, wrecks:wrecks.length, crushed, sentence,
      result:{kind:'clear', wrecks:wrecks.length, crushed, sentence}});
  }
  // The marker is the nearest wreck still on the road. The wrecks are also handed to the drawing, which reads and never writes.
  const left = wrecks.filter(wreck => !wreck.cleared);
  if (left.length) {
    const nearest = left.reduce((best, wreck) => Math.hypot(wreck.x - (here.x ?? 0), wreck.z - (here.z ?? 0)) < Math.hypot(best.x - (here.x ?? 0), best.z - (here.z ?? 0)) ? wreck : best);
    requests.push({type:'marker', place:{id:nearest.id, position:{x:nearest.x, z:nearest.z}, radius:nearest.radius + 1}});
  }
  requests.push({type:'things', id:'clear', things:wrecks.map(wreck => ({id:wreck.id, kind:`wreck-${wreck.kind}`, x:wreck.x, z:wreck.z, radius:wreck.radius,
    flat:wreck.cleared === 'crushed', off:wreck.cleared === 'off'}))});
  requests.push({type:'gauge', id:step.id ?? 'clear', label:'wrecks cleared', value:clearedNow, total:wrecks.length, share});
  return {state:next, complete, events, requests};
}
