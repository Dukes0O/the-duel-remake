// HELI-JOB-CLARITY: the job card that stays on screen while a job is in hand, and the hook prompt. Words only: pure
// functions of the session's jobStatus() and hookPrompt() (heli-session.js), drawn by heli-ui.js. Nothing here changes
// flight or job state. Kyle, 31 October 2026: "The job doesn't come up on screen, so I've forgotten where I'm supposed
// to deliver the car", and "There isn't clear instruction on how to hook up or release the hook."
import {CARS} from '../config.js';
import {HELI_DESTINATIONS_WITH_SUMMIT, placeName} from './heli-jobs.js';
import {payWords} from './heli-pay.js';

// The keys the game uses (src/input-contexts.js, the helicopter's keyboard): H hooks and lets go, N opens the map,
// P turns the autopilot on and off.
export const JOB_KEYS = Object.freeze({hook: 'H', map: 'N', autopilot: 'P'});
// How long the card says "Delivered" after the pay, in seconds.
export const DELIVERED_SECONDS = 5;

const PAD_NAMES = Object.freeze({devils: 'Devils Playground', summit: 'the summit pad', pickup: 'the pickup pad'});
const num = value => Math.round(value).toLocaleString('en-US');
const compass = degrees => String(Math.round(((degrees % 360) + 360) % 360) % 360).padStart(3, '0');

// "Fly to Eifel Crown (on the Pilot's map, press N)." A place in the Fly To list needs no help to find.
export function flyToWords(courseId, {keys = JOB_KEYS, flyToList = Object.keys(HELI_DESTINATIONS_WITH_SUMMIT)} = {}) {
  return flyToList.includes(courseId) ? `Fly to ${placeName(courseId)}.` : `Fly to ${placeName(courseId)} (on the Pilot's map, press ${keys.map}).`;
}

// What the card shows for a job in hand: {heading, what, route, pay, next, note, drop}. status: session.jobStatus().
// delivered: {pay} for a few seconds after a job is paid (the card then says only that). Null with nothing to show.
export function jobCardText(status, {keys = JOB_KEYS, flyToList, delivered = null} = {}) {
  if (delivered) return Object.freeze({heading: 'JOB DONE', what: '', route: '', pay: '', next: `Delivered: ${num(delivered.pay)} credits`, note: '', drop: false});
  if (!status) return null;
  const options = {keys, flyToList};
  const hook = keys.hook, carName = CARS[status.carId]?.name ?? 'the car';
  const route = status.from === status.to ? `At ${placeName(status.from)}` : `${placeName(status.from)} to ${placeName(status.to)}`;
  const pay = status.pay > 0 ? payWords(status.pay, {bonus: status.bonus ?? 0}) : 'No pay: your own run';
  const carry = `Carrying. ${flyToWords(status.to, options)}`;
  const land = `Carrying. Fly to the landing circle at ${placeName(status.to)}.`;
  const letGo = `Lower it onto the pad and press ${hook} to let go.`;
  const stages = what => ({
    fly: flyToWords(status.flyTo, options),
    hook: status.again ? `Hook ${what} again: hover low over it and press ${hook}.` : `Hook ${what} beside the pad: hover low over it and press ${hook}.`,
    carry, land, drop: letGo,
  });
  switch (status.kind) {
    case 'car': case 'recovery': {
      const next = status.kind === 'recovery' && status.stage === 'hook' && !status.again
        ? `Hook the ${carName} on the slope: hover low over it and press ${hook}.` : stages(`the ${carName}`)[status.stage];
      return Object.freeze({heading: status.kind === 'recovery' ? 'CAR RECOVERY' : 'CAR JOB', what: carName, route, pay, next,
        note: `${hook} hooks and ${hook} lets go.`, drop: true});
    }
    case 'crate': case 'story':
      return Object.freeze({heading: status.kind === 'story' ? 'STORY JOB' : 'CRATE JOB', what: status.kind === 'story' && status.title ? status.title : `Crate, ${num(status.massKg)} kg`,
        route, pay, next: stages('the crate')[status.stage], note: `${hook} hooks and ${hook} lets go.`, drop: true});
    case 'skiDrop': case 'skiGroup': {
      // SKI-FINISH (Kyle, 2 November 2026: couldn't find the pad, ran out of fuel): while the tank is short of what the
      // next leg needs, filling it is the next step; the pads are named by their orange light, and the pickup pad's pump
      // is named before it is needed.
      const group = status.kind === 'skiGroup', nearest = status.pads?.[0];
      const short = Number.isFinite(status.needKg) && status.fuelKg < status.needKg, atHome = status.here === status.from;
      const tank = `needs about ${num(status.needKg)} kg of fuel and you have ${num(status.fuelKg)} kg.`;
      const next = {
        fly: short && atHome ? `Fill the tank first at the home pump: the flight to the ski pads ${tank}`
          : `${flyToWords(status.flyTo, options)} The flight ends beside the ski pads.`,
        pad: nearest ? `Land on the ski pad under the orange light: ${PAD_NAMES[nearest.name] ?? nearest.name}, ${(nearest.distance / 1000).toFixed(1)} km, heading ${compass(nearest.bearing)}.`
          : 'Land on a ski pad under an orange light to step out.',
        ski: 'Pick a run on the ski panel.',
        flyHome: short && status.here === status.to ? `${status.atPump ? 'Fill up at the pump here' : 'Fill up at the pump on the pickup pad'} first: the way home ${tank}`
          : group ? 'Fly the group home and land on the home pad.' : 'Fly home and land on the home pad.',
      }[status.stage];
      const note = status.stage === 'pad' ? `Press ${keys.autopilot ?? JOB_KEYS.autopilot} and the autopilot flies to the nearest pad. Fuel: the pump is on the pickup pad, beside Devils Playground.`
        : status.stage === 'ski' ? 'Fuel: the pump is on the pickup pad, where every run ends.' : '';
      return Object.freeze({heading: group ? 'HELI-SKI GROUP' : 'HELI-SKI DROP', what: group ? 'A guide and four guests' : 'Your own run', route: `${placeName(status.from)} to ${placeName(status.to)}`,
        pay, next, note, drop: !group || atHome});
    }
    default: return null;
  }
}

// The short prompt near a load: "Press H to hook", "Lower 3 m, then press H to hook", "Press H to let go".
// prompt: session.hookPrompt().
export function hookPromptText(prompt, {keys = JOB_KEYS} = {}) {
  if (!prompt) return null;
  const hook = keys.hook;
  if (prompt.kind === 'release') return prompt.ready ? `Press ${hook} to let go` : `Lower it until it touches, then press ${hook} to let go`;
  if (prompt.ready) return `Press ${hook} to hook`;
  // H cannot hook this load at all: say why instead of promising a hook.
  const blocked = {heavy: 'Too heavy to lift', bucket: 'Bucket fitted: take it off at the home pad',
    rescueLine: 'Rescue line fitted: take it off at the home pad', lesson: 'Finish lesson 4 before carrying cars'}[prompt.blocked];
  if (prompt.blocked) return blocked ?? null;
  const fix = {slowDown: 'Slow down', lower: `Lower ${prompt.metres} m`, higher: `Higher ${prompt.metres} m`, closer: 'Move closer'}[prompt.reason];
  return fix ? `${fix}, then press ${hook} to hook` : `Press ${hook} to hook`;
}

// The card's markup: the job, the route, the pay, the next step in bold, the key note and Drop job.
export function jobCardMarkup(card) {
  if (!card) return '';
  const esc = text => String(text ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const line = (cls, text) => text ? `<p class="${cls}">${esc(text)}</p>` : '';
  return `<div class="heli-job-card" role="status" aria-label="Job in hand"><span>${esc(card.heading)}</span>${line('heli-job-what', card.what)}` +
    `${line('heli-job-route', card.route)}${line('heli-job-pay', card.pay)}${line('heli-job-next', card.next)}${line('heli-job-note', card.note)}` +
    `${card.drop ? '<button type="button" data-heli-job="drop">Drop job</button>' : ''}</div>`;
}
