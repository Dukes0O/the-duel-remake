// Observe Kestrel's real flight state. Never move her or replace the flight solver with a height target.
import {availableThrust, heliMass, GRAVITY} from '../../../heli/heli-flight.js';

export function stepHeliceiling(step, state, view, dt) {
  if (state.reported) return {state:{...state}, complete:true, events:[], requests:[]};
  const heli = view.heli, next = {...state}, events = [], requests = [];
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };
  if (!heli || heli.crashed || !heli.engine || heli.onGround || (view.loadKg ?? 0) > 0)
    return {state:{...next, held:0}, complete:false, events, requests};
  const capacity = availableThrust(heli, heli.y - heli.groundY) * Math.cos(heli.pitch) * Math.cos(heli.roll);
  const support = capacity / (heliMass(heli) * GRAVITY);
  if (!next.halfway && heli.collective >= .9 && support < 1.1) {
    next.halfway = true; say(step.halfwayLineId);
  }
  // Holding full climb, nearly level, without enough lift to climb. Hovering with the lever down cannot win.
  const asking = (view.controls?.lift ?? 0) >= .9;
  const atCeiling = asking && heli.collective >= .98 && support <= 1.01 &&
    Math.abs(heli.vy) < .25 && Math.abs(heli.pitch) < .1 && Math.abs(heli.roll) < .1;
  next.held = atCeiling ? (next.held ?? 0) + dt : 0;
  const complete = next.held >= 3;
  if (complete && !next.reported) {
    next.reported = true; say(step.topLineId); say(step.wonLineId);
    events.push({type:'heliCeiling', altitude:heli.y + heli.altitudeOffset, cue:'heli.radio.click'});
  }
  return {state:next, complete, events, requests};
}
