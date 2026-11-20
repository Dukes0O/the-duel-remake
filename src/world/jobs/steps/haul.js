// TOWN-HAUL-JOB: the haul step (docs/WASTELAND_TOWN.md sections 7 and 11). Load at a pile, carry the load home with the
// risk of shedding it, unload at the drop. Pure: no DOM, no Three.js, nothing from app.js; repeatable from the job's seed
// and what the car did. The World Job mode reads `state.loadKg` and puts that weight on the work vehicle, so the truck the
// player drives is as heavy as what is on its bed (src/town/work-vehicles.js does the sums).
//
// The decision is the stack. While the truck stands still at the pile the gang keeps lifting pieces on, one every few
// seconds, until the bed is full. The player drives off when they have enough. A taller stack is heavier (slower away,
// longer to stop, wider in the bends) and sits less firmly: the knock it takes to throw a piece off gets smaller with
// every tonne. A hard knock throws pieces off the top of the stack, and rough ground taken fast rattles them loose.
// Everything thrown off is lost, and the result says how much was delivered and how much was lost.
//
// The way home has one thing the player sees coming and can take or leave: a washout (`step.washouts`), a stretch of road
// over the scab plates that last spring's rain broke up. It is marked at both ends and named on the radio and the screen
// line before the truck reaches it. Crawl over it and the stack holds; drive over it at speed and pieces shake off; or go
// round it over the flats, which is smooth but longer. Inside a washout the stack rattles as on the Steps' ledges.
//
// Real numbers, and where they come from:
// - The pieces are parts of the Boneyard's airliners (aluminium skin, ribs and beams, steel landing-gear legs) and of
//   Tin Town's steel (plate, angle and rail). Masses are what one such part weighs, rounded: an airliner's main
//   landing-gear leg is about a tonne with its wheels, so a stripped leg is 650 kg; a 2 m by 1 m sheet of 10 mm steel
//   plate is 157 kg (steel is 7,850 kg a cubic metre), so a pallet of four sheets is about 630 kg.
// - A gang with a chain hoist and a frame lifts and settles one piece in about half a minute. The game's clock runs a
//   lift every 3 seconds, as the town's building runs faster than life (section 2: "nothing makes you wait around").
// - The flatbed carries 9,000 kg (src/town/content/work-vehicles.js).
import {makeRng} from '../../../rng.js';

export const HAUL_RULE = Object.freeze({
  // Seconds standing still at the pile for each piece, and at the drop for each piece taken off.
  liftSeconds:3, unloadSeconds:1.2,
  // Below this speed the truck counts as standing still (km/h).
  stillKmh:1.5,
  // A knock is the speed lost in one step. Below `knockFreeKmh` nothing moves; each tonne on the bed takes
  // `knockFreePerTonne` off that, down to `knockFreeLeast`. Above it, kilograms come off for each km/h of the excess.
  knockFreeKmh:32, knockFreePerTonne:1.6, knockFreeLeast:12, kgPerKmh:70,
  // A long fall throws off this share of the stack, whatever the speed.
  fallShare:.4,
  // Rough ground (a ground's `roughness` of .2 and up: the river bed, its soft sand, the scab plates, the Steps) rattles
  // the stack: each metre adds roughness x (km/h / 30) squared x (1 + tonnes / 9). At `rattleLimit` a piece comes loose.
  roughFrom:.2, rattleKmh:30, rattleLimit:420,
  // A washout: broken road as rough as the Steps' ledges (src/world/scablands-regions.js gives them .75), safe only at a crawl.
  // It is named this far ahead of either end.
  washoutRoughness:.75, washoutCrawlKmh:12, washoutWarnMetres:300,
  // Easy is kinder: a larger knock is needed, less comes off, and the stack rattles less.
  easy:Object.freeze({knockFreeBonus:10, shedScale:.5, rattleScale:.5}),
  hard:Object.freeze({knockFreeBonus:-4, shedScale:1.25, rattleScale:1.25}),
});

// What a pile is made of. The stack is drawn from these in a seeded order.
export const HAUL_PIECES = Object.freeze({
  salvage:Object.freeze([
    Object.freeze({id:'skin', name:'bundle of skin panels', kg:300}),
    Object.freeze({id:'rib', name:'wing rib', kg:420}),
    Object.freeze({id:'beam', name:'floor beam', kg:260}),
    Object.freeze({id:'seats', name:'stack of seat frames', kg:350}),
    Object.freeze({id:'gear', name:'landing-gear leg', kg:650}),
    Object.freeze({id:'spar', name:'piece of wing spar', kg:700}),
  ]),
  steel:Object.freeze([
    Object.freeze({id:'plate', name:'pallet of steel plate', kg:630}),
    Object.freeze({id:'angle', name:'bundle of angle iron', kg:400}),
    Object.freeze({id:'rail', name:'length of old rail', kg:550}),
    Object.freeze({id:'bar', name:'bundle of steel bar', kg:480}),
  ]),
});

const finite = Number.isFinite;
const spot = value => value?.position ?? value ?? {};
const gap = (a, b) => Math.hypot((a?.x ?? 0) - (spot(b).x ?? 0), (a?.z ?? 0) - (spot(b).z ?? 0));
const sum = pieces => pieces.reduce((total, piece) => total + piece.kg, 0);
export const groupKg = value => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function scaleFor(difficulty) {
  return difficulty === 'easy' ? HAUL_RULE.easy : difficulty === 'hard' ? HAUL_RULE.hard : {knockFreeBonus:0, shedScale:1, rattleScale:1};
}

/** The knock (km/h lost in one step) a stack of this many kilograms takes before a piece comes off. */
export function haulKnockFreeKmh(loadKg, difficulty = 'medium') {
  const base = Math.max(HAUL_RULE.knockFreeLeast, HAUL_RULE.knockFreeKmh - HAUL_RULE.knockFreePerTonne * loadKg / 1000);
  return base + scaleFor(difficulty).knockFreeBonus;
}

/** How many kilograms a knock throws off: none below the stack's limit, then kgPerKmh for each km/h above it. */
export function haulKnockKg(loadKg, hitKmh, difficulty = 'medium') {
  const excess = (finite(hitKmh) ? hitKmh : 0) - haulKnockFreeKmh(loadKg, difficulty);
  return excess > 0 ? Math.min(loadKg, excess * HAUL_RULE.kgPerKmh * scaleFor(difficulty).shedScale) : 0;
}

/** Rattle added by one step on a ground of this roughness. */
export function haulRattle({roughness = 0, kmh = 0, loadKg = 0, dt = 0, difficulty = 'medium', rattleKmh = HAUL_RULE.rattleKmh} = {}) {
  if (!(roughness >= HAUL_RULE.roughFrom) || !(kmh > 0) || !(dt > 0)) return 0;
  const metres = kmh / 3.6 * dt;
  return roughness * (kmh / rattleKmh) ** 2 * (1 + loadKg / 9000) * metres * scaleFor(difficulty).rattleScale;
}

// Where a point is against a washout's line: inside it, how far from its nearer end when outside, or null when well off it.
function washoutAt(washout, point) {
  const line = washout.line;
  let best = null, before = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], dx = b.x - a.x, dz = b.z - a.z, square = dx * dx + dz * dz, span = Math.sqrt(square);
    const raw = square > 0 ? ((point.x - a.x) * dx + (point.z - a.z) * dz) / square : 0, t = Math.max(0, Math.min(1, raw));
    const beyond = raw < 0 && i === 0 ? -raw * span : raw > 1 && i === line.length - 2 ? (raw - 1) * span : 0;
    // Beyond an end, across is measured square to the line, so that `ahead` is the true distance to the broken stretch.
    const across = beyond > 0 && span > 0 ? Math.abs((point.x - a.x) * dz - (point.z - a.z) * dx) / span
      : Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
    if (!best || across < best.across) best = {across, beyond};
    before += span;
  }
  if (!best) return null;
  const width = washout.halfWidth ?? 16;
  return {inside:best.beyond === 0 && best.across <= width, ahead:Math.hypot(best.beyond, Math.max(0, best.across - width))};
}

/** The pile's stack in lift order: pieces drawn from the good's list until the pile's kilograms are used. Seeded. */
export function haulPileOrder(step, seed = 0) {
  const kinds = HAUL_PIECES[step.good] ?? HAUL_PIECES.salvage;
  const rng = makeRng(((seed >>> 0) ^ 0x4a41554c) >>> 0 || 1);
  const pieces = [];
  let left = step.pile?.kg ?? 9000;
  for (let index = 0; left > 0 && index < 200; index++) {
    const kind = kinds[rng.int(0, kinds.length - 1)];
    if (kind.kg > left) break;
    pieces.push({id:`${kind.id}-${index + 1}`, kind:kind.id, name:kind.name, kg:kind.kg});
    left -= kind.kg;
  }
  return pieces;
}

// Take pieces off the top of the stack until at least `kg` has gone (one piece at least when kg is above 0).
function shedTop(stack, kg) {
  const kept = [...stack], gone = [];
  while (kept.length && (gone.length === 0 || sum(gone) < kg) && kg > 0) gone.push(kept.pop());
  return {kept, gone};
}

/** One sentence for the results screen: what was delivered and what was lost. */
export function haulSentence(step, deliveredKg, lostKg) {
  const good = step.goodName ?? step.good ?? 'salvage';
  const delivered = `You brought home ${groupKg(deliveredKg)} kg of ${good}.`;
  if (lostKg <= 0) return `${delivered} Nothing fell off on the way.`;
  return `${delivered} ${groupKg(lostKg)} kg fell off on the way and is lost.`;
}

/** What the screen line asks for in each part of the haul. */
export function haulLine(step, state = {}) {
  const phase = state.phase ?? 'out';
  if (phase === 'out') return step.what ?? `Drive to ${step.pile?.name ?? 'the pile'} and stop beside it.`;
  if (phase === 'loading') {
    if ((state.load?.length ?? 0) === 0) return 'Hold still while the gang lifts the first piece on.';
    if (state.full) return 'The bed is full. Drive home slowly.';
    return 'Hold still and they keep loading. Drive off when you have enough.';
  }
  if (phase === 'unloading') return 'Hold still while they take the load off.';
  if (state.washout === 'inside') return `You are on the washed-out road. Keep below ${HAUL_RULE.washoutCrawlKmh} km/h and the load will hold.`;
  if (state.washout === 'ahead') return `Washed-out road ahead. Crawl over it below ${HAUL_RULE.washoutCrawlKmh} km/h, or go round it over the flats to the south.`;
  return `Take the load to ${step.drop?.name ?? 'the drop'} and stop there. Hard knocks throw pieces off.`;
}

function knock(view) {
  return {hitKmh:finite(view.hitKmh) ? view.hitKmh : 0, fall:view.severeHit === true};
}

export function stepHaul(step, state, view, dt = 0, seed = 0) {
  const here = view.player?.position ?? {};
  const kmh = Math.abs(finite(view.speedKmh) ? view.speedKmh : 0);
  const still = kmh < HAUL_RULE.stillKmh && !view.onFoot;
  const difficulty = view.difficulty ?? 'medium';
  const maxKg = step.maxKg ?? 9000;
  const next = {
    phase:state.phase ?? 'out', pile:state.pile ?? haulPileOrder(step, seed), load:state.load ?? [],
    shed:state.shed ?? [], delivered:state.delivered ?? [], clock:state.clock ?? 0, rattle:state.rattle ?? 0,
    full:state.full === true, trips:state.trips ?? 0, reported:state.reported === true,
    washout:null, warned:state.warned ?? [], crossed:state.crossed ?? [],
  };
  const events = [], requests = [];
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };

  if (next.phase === 'out') {
    requests.push({type:'marker', place:step.pile});
    if (still && gap(here, step.pile) <= (step.pile.radius ?? 12)) {
      next.phase = 'loading'; next.clock = 0;
      events.push({type:'haulArrived'});
      say(next.trips === 0 ? step.lines?.atPile : step.lines?.backAtPile);
    }
  } else if (next.phase === 'loading') {
    requests.push({type:'marker', place:step.pile});
    const near = gap(here, step.pile) <= (step.pile.radius ?? 12) + 4;
    if (still && near && !next.full) {
      next.clock += dt;
      while (next.clock >= HAUL_RULE.liftSeconds && !next.full) {
        next.clock -= HAUL_RULE.liftSeconds;
        const piece = next.pile[0];
        if (!piece || sum(next.load) + piece.kg > maxKg) {
          next.full = true;
          events.push({type:'haulFull', loadKg:sum(next.load)});
          say(step.lines?.full);
          break;
        }
        next.pile = next.pile.slice(1);
        next.load = [...next.load, piece];
        events.push({type:'haulLift', piece:piece.name, kg:piece.kg, loadKg:sum(next.load)});
      }
    } else if (!still && next.load.length > 0 && (!near || kmh >= HAUL_RULE.stillKmh * 2)) {
      next.phase = 'carry'; next.clock = 0; next.rattle = 0;
      events.push({type:'haulSetOff', loadKg:sum(next.load), pieces:next.load.length});
      say(step.lines?.setOff);
    } else if (!near && next.load.length === 0) {
      next.phase = 'out';
    }
  } else if (next.phase === 'carry' || next.phase === 'unloading') {
    requests.push({type:'marker', place:step.drop});
    const loadKg = sum(next.load);
    const {hitKmh, fall} = knock(view);
    let gone = [], cause = null;
    if (fall && loadKg > 0) {
      ({kept:next.load, gone} = shedTop(next.load, loadKg * HAUL_RULE.fallShare));
      cause = 'fall';
    } else {
      const knocked = haulKnockKg(loadKg, hitKmh, difficulty);
      if (knocked > 0) { ({kept:next.load, gone} = shedTop(next.load, knocked)); cause = 'knock'; }
    }
    // A washout is named once a trip, as the loaded truck comes within sight of either end of it.
    let broken = null;
    for (const [index, washout] of (step.washouts ?? []).entries()) {
      const at = washoutAt(washout, here), key = `${next.trips}:${index}`;
      if (!at) continue;
      if (at.inside) {
        broken = washout; next.washout = 'inside';
        if (next.phase === 'carry' && !next.crossed.includes(key)) next.crossed = [...next.crossed, key];
        break;
      }
      // Once over it, the washout is behind the truck for the rest of the trip.
      if (at.ahead <= HAUL_RULE.washoutWarnMetres && next.phase === 'carry' && !next.crossed.includes(key)) {
        next.washout ??= 'ahead';
        if (!next.warned.includes(key)) {
          next.warned = [...next.warned, key];
          events.push({type:'haulWashoutAhead', id:washout.id});
          say(step.lines?.washout);
        }
      }
    }
    if (!gone.length && next.phase === 'carry') {
      next.rattle += broken
        ? haulRattle({roughness:broken.roughness ?? HAUL_RULE.washoutRoughness, kmh, loadKg, dt, difficulty,
          rattleKmh:broken.crawlKmh ?? HAUL_RULE.washoutCrawlKmh})
        : haulRattle({roughness:view.roughness ?? 0, kmh, loadKg, dt, difficulty});
      if (next.rattle >= HAUL_RULE.rattleLimit && next.load.length) {
        next.rattle = 0;
        ({kept:next.load, gone} = shedTop(next.load, 1));
        cause = 'rough';
      }
    }
    if (gone.length) {
      const position = {x:finite(here.x) ? here.x : 0, z:finite(here.z) ? here.z : 0, ...(finite(here.y) ? {y:here.y} : {})};
      next.shed = [...next.shed, ...gone.map(piece => ({...piece, cause, ...position}))];
      events.push({type:'haulShed', cause, pieces:gone.map(piece => piece.name), kg:sum(gone), loadKg:sum(next.load), position});
      if (next.shed.length === gone.length) say(step.lines?.firstShed);
    }
    if (next.load.length === 0 && next.phase === 'carry') {
      // Everything has come off: back to the pile for the rest, with no trip lost but the time.
      next.phase = 'out'; next.full = false; next.trips += 1; next.clock = 0;
      events.push({type:'haulEmpty'});
      say(step.lines?.empty);
    } else if (next.phase === 'carry') {
      if (still && gap(here, step.drop) <= (step.drop.radius ?? 12)) {
        next.phase = 'unloading'; next.clock = 0;
        events.push({type:'haulAtDrop'});
        say(step.lines?.atDrop);
      }
    } else if (still) {
      next.clock += dt;
      while (next.clock >= HAUL_RULE.unloadSeconds && next.load.length) {
        next.clock -= HAUL_RULE.unloadSeconds;
        const piece = next.load.at(-1);
        next.load = next.load.slice(0, -1);
        next.delivered = [...next.delivered, piece];
        events.push({type:'haulUnload', piece:piece.name, kg:piece.kg, loadKg:sum(next.load)});
      }
    } else if (gap(here, step.drop) > (step.drop.radius ?? 12)) {
      next.phase = 'carry';
    }
  }
  next.loadKg = sum(next.load);
  next.deliveredKg = sum(next.delivered);
  next.shedKg = sum(next.shed);
  const complete = next.phase === 'unloading' && next.load.length === 0 && next.delivered.length > 0;
  // The step's closing lines (step.closing) hold the job while they are said, so a finished haul is seen more than once.
  // It reports what was delivered only the first time.
  if (complete && !next.reported) {
    next.reported = true;
    events.push({type:'haulDelivered', good:step.good, deliveredKg:next.deliveredKg, lostKg:next.shedKg,
      pieces:next.delivered.length, lostPieces:next.shed.length, sentence:haulSentence(step, next.deliveredKg, next.shedKg)});
  }
  return {state:next, complete, events, requests};
}
