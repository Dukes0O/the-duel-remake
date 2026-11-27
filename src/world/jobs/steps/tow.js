// TOWN-JOBS-2: the tow step (docs/WASTELAND_TOWN.md sections 7 and 11). Drive to a dead vehicle, hold still beside it while it is
// hooked on, bring it home slowly, and hold still at the destination while it is unhooked. Pure: no DOM, no Three.js, nothing from
// app.js; repeatable from what the rig did. The World Job mode reads `state.loadKg` and puts that weight on the rig.
//
// The decision is the speed. A towed vehicle has nobody at its wheel and no brakes of its own, so above `snapSpeed` it starts
// to swing behind the rig, and after `swingSeconds` of that, or on one hard knock, the hook lets go. Nothing is lost: the vehicle
// rolls to a stop where it came off, the marker goes back to it, and it is hooked on again. There is no clock.
//
// Real numbers, and where they come from:
// - The rule for towing a broken-down vehicle on a rope or a bar is to keep to about 20 miles an hour (32 km/h), because the towed
//   vehicle steers and brakes late or not at all. The step's own `snapSpeed` is 9 m/s (32 km/h); a job may give its own.
// - Hooking on is a chain round the axle and the lift taken up: a crew does it in a few minutes, and the game's clock runs it in
//   `hookSeconds`, as loading runs faster than life (section 2: "nothing makes you wait around").
// - A tow chain is a few metres long: the towed vehicle follows `ropeMetres` behind the rig's middle.
export const TOW_RULE = Object.freeze({
  hookSeconds:3, unhookSeconds:2, stillKmh:1.5, snapSpeed:9, easySnapBonus:2, swingSeconds:1.5, easySwingSeconds:3,
  // A knock is the speed lost in one step (km/h). At this much the hook lets go at once.
  snapKnockKmh:30, easySnapKnockKmh:45, ropeMetres:7, warnShare:.85,
});

// What each event sounds like (every cue is in src/sound-bank.js): the hook going on and coming off is the load thump, the
// hook letting go is a snap (the fence's own), and the vehicle brought home is the finished-step chime.
export const TOW_CUES = Object.freeze({towHooked:'world.bellows.load', towSnapped:'world.fence.snap', towUnhooked:'world.bellows.load',
  towDelivered:'interface.bonus'});

const finite = Number.isFinite;
const spot = value => value?.position ?? value ?? {};
const gap = (a, b) => Math.hypot((a?.x ?? 0) - (spot(b).x ?? 0), (a?.z ?? 0) - (spot(b).z ?? 0));

/** The speed (m/s) above which the towed vehicle starts to swing, for this step and difficulty. */
export function towSnapSpeed(step, difficulty = 'medium') {
  if (difficulty === 'easy') return step.easySnapSpeed ?? (step.snapSpeed ?? TOW_RULE.snapSpeed) + TOW_RULE.easySnapBonus;
  return step.snapSpeed ?? TOW_RULE.snapSpeed;
}

const destinationOf = step => step.destination ?? step.path?.at(-1);

/** What the screen line asks for in each part of the tow. */
export function towLine(step, state = {}, difficulty = 'medium') {
  const phase = state.phase ?? 'out', limit = state.limitKmh ?? Math.round(towSnapSpeed(step, difficulty) * 3.6), name = step.loadName ?? 'the dead van';
  if (phase === 'out') return state.snaps > 0 ? `The hook let go. Go back to ${name} and stop beside it.` : step.what ?? `Drive to ${name} and stop beside it.`;
  if (phase === 'hooking') return 'Hold still while the hook goes on.';
  if (phase === 'unhooking') return 'Hold still while the hook comes off.';
  if (state.swinging) return `It is swinging behind you. Slow down below ${limit} km/h.`;
  return `Tow it home slowly. Keep below ${limit} km/h.`;
}

export function stepTow(step, state, view, dt = 0) {
  const here = view.player?.position ?? {};
  const kmh = Math.abs(finite(view.speedKmh) ? view.speedKmh : 0), difficulty = view.difficulty ?? 'medium', easy = difficulty === 'easy';
  const still = kmh < TOW_RULE.stillKmh && !view.onFoot;
  const destination = destinationOf(step), hookRadius = step.hookRadius ?? 6;
  const loadKg = Math.round((step.loadTonnes ?? 2) * 1000);
  const next = {phase:state.phase ?? 'out', clock:state.clock ?? 0, swing:state.swing ?? 0, snaps:state.snaps ?? 0,
    towed:state.towed ?? {x:spot(step.origin).x ?? 0, z:spot(step.origin).z ?? 0}, swinging:false, reported:state.reported === true};
  const events = [], requests = [];
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };

  if (next.phase === 'out' || next.phase === 'hooking') {
    const place = {id:step.origin?.id ?? 'tow-load', position:{...next.towed}, radius:hookRadius};
    requests.push({type:'marker', place});
    const beside = still && gap(here, next.towed) <= hookRadius + (next.phase === 'hooking' ? 2 : 0);
    if (!beside) { next.phase = 'out'; next.clock = 0; }
    else {
      next.phase = 'hooking';
      next.clock += dt;
      if (next.clock >= (step.hookSeconds ?? TOW_RULE.hookSeconds)) {
        next.phase = 'towing'; next.clock = 0; next.swing = 0;
        events.push({type:'towHooked', cue:TOW_CUES.towHooked, loadKg, position:{...next.towed}});
        say(next.snaps === 0 ? step.hookLineId : step.rehookLineId);
      }
    }
  } else if (next.phase === 'towing' || next.phase === 'unhooking') {
    requests.push({type:'marker', place:destination});
    // The towed vehicle follows on its chain: pulled toward the rig whenever it is more than a chain's length behind.
    const rope = step.ropeMetres ?? TOW_RULE.ropeMetres, apart = gap(here, next.towed);
    if (apart > rope && finite(here.x) && finite(here.z)) {
      const share = (apart - rope) / apart;
      next.towed = {x:next.towed.x + (here.x - next.towed.x) * share, z:next.towed.z + (here.z - next.towed.z) * share};
    }
    const limit = towSnapSpeed(step, difficulty), mps = kmh / 3.6;
    const knock = finite(view.hitKmh) ? view.hitKmh : 0;
    const knocked = view.severeHit === true || knock >= (easy ? TOW_RULE.easySnapKnockKmh : TOW_RULE.snapKnockKmh);
    next.swinging = mps > limit;
    next.swing = next.swinging ? next.swing + dt : Math.max(0, next.swing - dt * 2);
    if (next.swinging && !state.swinging) say(step.slowLineId);
    const let_go = next.phase === 'towing' && (knocked || next.swing >= (easy ? TOW_RULE.easySwingSeconds : TOW_RULE.swingSeconds));
    if (let_go) {
      next.phase = 'out'; next.clock = 0; next.swing = 0; next.swinging = false; next.snaps += 1;
      events.push({type:'towSnapped', cue:TOW_CUES.towSnapped, cause:knocked ? 'knock' : 'speed', position:{...next.towed},
        callout:knocked ? 'A hard knock shook the hook off. Go back and hook it on again.' : 'It swung off the hook. Go back and hook it on again.'});
      say(step.snapLineId);
    } else if (next.phase === 'towing') {
      if (still && gap(here, destination) <= (destination?.radius ?? step.radius ?? 12)) { next.phase = 'unhooking'; next.clock = 0; }
    } else if (!still) { next.phase = 'towing'; next.clock = 0; }
    else next.clock += dt;
  }
  next.limitKmh = Math.round(towSnapSpeed(step, difficulty) * 3.6);
  next.loadKg = next.phase === 'towing' || next.phase === 'unhooking' ? loadKg : 0;
  const complete = next.phase === 'unhooking' && next.clock >= (step.unhookSeconds ?? TOW_RULE.unhookSeconds);
  if (complete) next.loadKg = 0;
  // The step's closing lines hold the job while they are said, so a finished tow is seen more than once and reports once.
  if (complete && !next.reported) {
    next.reported = true;
    const sentence = next.snaps === 0 ? 'You towed it home, and the hook never let go.'
      : next.snaps === 1 ? 'You towed it home. The hook let go once on the way.' : `You towed it home. The hook let go ${next.snaps} times on the way.`;
    events.push({type:'towUnhooked', cue:TOW_CUES.towUnhooked, position:{...next.towed}});
    events.push({type:'towDelivered', cue:TOW_CUES.towDelivered, load:step.load ?? null, snaps:next.snaps, sentence,
      result:{kind:'tow', load:step.load ?? null, snaps:next.snaps, sentence}});
  }
  // The towed vehicle, for the drawing: a plain record the view reads and nothing reads back.
  requests.push({type:'things', id:'tow', things:[{id:step.load ?? 'tow-load', kind:'towed', x:next.towed.x, z:next.towed.z, radius:3,
    hooked:next.phase === 'towing' || next.phase === 'unhooking'}]});
  return {state:next, complete, events, requests};
}
