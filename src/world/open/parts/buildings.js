import {BUILDINGS} from '../content/buildings.js';
import {forgeLine, WIM_CLEAN} from '../content/talk-forge.js';
import {buildingWalls, inBay, pointInBuilding, roomAt} from '../building-rule.js';
import {dirtAfter} from '../dirt-rule.js';
import {doService, servicePrice} from '../service-rule.js';
import {isHeld} from '../holds.js';
import {isTrue} from '../facts.js';
import {wordOf} from '../open-record.js';

const distance = (a, b) => a && b ? Math.hypot(a.x - b.x, a.z - b.z) : Infinity;
const bubble = (speaker, lines, choices = []) => ({type: 'talk', speaker, scene: {lines, choices}});
const cue = id => ({type: 'shedCue', cue: id});

function gatherDirt(state, world, view, dt, choices) {
  const car = view.carPosition;
  const metres = car && state.lastCar && !view.onFoot ? distance(car, state.lastCar) : 0;
  state.lastCar = car ? {x: car.x, z: car.z} : null;
  const ash = !!view.ashHit;
  if (metres || ash) {
    const ground = view.carGroundRegion;
    state.looseDust += dirtAfter(0, metres, ash ? 'ash-hit' : ground, view.onRoad ?? ground === 'road');
    if (ash || ground === 'burn') {
      state.ashCoat = dirtAfter(state.ashCoat ?? 0, metres, ash ? 'ash-hit' : ground, false);
      state.ash = state.ashCoat >= .25;
      state.dustGround = 'burn';
    } else if (!state.ash) state.dustGround = ground;
  }
  state.dustSeconds += dt;
  if (state.dustSeconds < 1 && !ash && !view.onFoot) return;
  state.dustSeconds = 0;
  if (state.looseDust && world.open.car.dirt < 1)
    choices.push({id: 'car/road-dust', effects: [{type: 'dirt', by: state.looseDust}]});
  state.looseDust = 0;
}

function serviceStatus(row, service, world, view, word) {
  if (view.partOfDay === 'dark') return 'dark';
  if (service.needs && !isTrue(service.needs, world)) return word === 'Cold' ? 'Cold' : 'idle';
  if (service.id === 'wash') return world.open.car.dirt ? null : 'clean';
  if (!inBay(row, view.carPosition)) return 'bay';
  return view.car?.armour < view.car?.maxArmour ? null : 'clean';
}

function speakTo(state, row, service, world, view, requests) {
  const who = service.by, word = wordOf(world, row.place);
  const status = serviceStatus(row, service, world, view, word);
  if (status) {
    requests.push(bubble(who, [forgeLine(who, status)]));
    return;
  }
  const price = servicePrice(service.id, word, view.car);
  const prefix = row.id + '/' + service.id + '/';
  // Include prior purchases if another job already used the same id that night.
  let count = (state.orders?.[prefix] ?? 0) + 1;
  const used = new Set(world.open.journal.filter(change => change.night === world.ledger.night).map(change => change.choiceId));
  while (used.has(prefix + count)) count++;
  state.orders = {...state.orders, [prefix]: count};
  const id = prefix + count;
  const lines = [];
  if (service.id === 'repair' && view.fieldPatched) lines.push(forgeLine(who, 'patch'));
  if (service.id === 'wash' && state.ash) lines.push(forgeLine(who, 'ash'));
  lines.push(forgeLine(who, word, {price}));
  state.offer = {id, price, who, service: service.id, house: row.id};
  requests.push(bubble(who, lines, ['yes', 'no'].map(answer => ({
    id: id + '/' + answer, words: forgeLine(who, answer).words,
  }))));
}

function answer(state, world, view, holds, choices, requests) {
  const offer = state.offer;
  const choice = view.jobEvents?.find(e => e.type === 'talkChoice' &&
    [offer.id + '/yes', offer.id + '/no'].includes(e.id));
  if (!choice) {
    if (view.jobEvents?.some(event => event.type === 'openTalkClosed')) state.offer = null;
    return;
  }
  state.offer = null;
  const row = BUILDINGS.find(row => row.id === offer.house);
  const service = row.services.find(s => s.id === offer.service);
  let reply = choice.id.endsWith('/no') ? 'decline' : serviceStatus(row, service, world, view, wordOf(world, row.place));
  if (!reply && isHeld(holds, 'services')) reply = 'idle';
  if (reply) requests.push(bubble(offer.who, [forgeLine(offer.who, reply)]));
  else {
    const sale = doService(offer, world);
    if (sale.short) requests.push(bubble(offer.who, [forgeLine(offer.who, 'short', {...offer, short: sale.short})]));
    else {
      state.payment = {...offer, armour: view.car.maxArmour - view.car.armour};
      choices.push(sale.choice);
    }
  }
}

function deliver(state, changes, choices, requests) {
  const offer = state.payment;
  state.payment = null;
  const receipt = changes.find(c => c.choiceId === offer.id && c.type === 'scrap');
  if (!receipt) return;
  if (receipt.owed) {
    const taken = receipt.before - receipt.after;
    if (taken) choices.push({id: offer.id + '/refund', effects: [{type: 'scrap', by: taken}]});
    requests.push(bubble(offer.who, [forgeLine(offer.who, 'short', {...offer, short: receipt.owed})]));
    return;
  }
  requests.push(cue('open.scrap.paid'));
  if (offer.service === 'wash') {
    requests.push({type: 'wash'});
    state.ash = false;
    state.ashCoat = 0;
    state.dustGround = null;
    state.looseDust = 0;
    requests.push(cue('open.wash'));
  } else requests.push(cue('repair.start'), {type: 'repair', armour: offer.armour, scrap: offer.price}, cue('repair.complete'));
  requests.push(bubble(offer.who, [forgeLine(offer.who, 'done')]));
}

export const buildingsPart = {
  id: 'buildings',
  begin: () => ({inside: null, held: false, dustSeconds: 0, looseDust: 0, ash: false}),
  step(previous, {world, view, holds, changes}, dt) {
    if (!view.serviceSheds) return {};
    const state = {...previous}, choices = [], requests = [];
    if (!state.wallsPlaced) {
      for (const row of BUILDINGS) requests.push({type: 'solids', id: row.id, solids: buildingWalls(row)});
      state.wallsPlaced = true;
    }
    const feet = view.onFoot ? view.fighter?.position ?? view.player?.position : null;
    const row = roomAt(feet);
    state.inside = row?.id ?? null;
    if (state.inside !== previous.inside) requests.push(cue('open.door'));
    gatherDirt(state, world, view, dt, choices);
    const pressed = view.interact && !state.held;
    state.held = !!view.interact;
    if (state.payment) deliver(state, changes, choices, requests);
    else if (state.offer) answer(state, world, view, holds, choices, requests);
    else if (pressed && row) {
      const find = row.finds?.find(item => (!item.needs || isTrue(item.needs, world)) &&
        !isTrue({fact: 'mark', id: 'found/' + item.id}, world) &&
        (!item.spot || distance(feet, pointInBuilding(row, row.room.spots[item.spot])) <= 1.5));
      if (find) {
        choices.push({id: find.id, effects: [...(find.gives ?? []), {type: 'mark', id: 'found/' + find.id}]});
        return {state, choices, requests};
      }
      const service = row.services.find(service => distance(feet,
        view.people?.find(p => p.id === service.by)?.position) <= 2.5);
      if (service && !isHeld(holds, 'services')) speakTo(state, row, service, world, view, requests);
    } else if (feet && view.people && !world.open.car.dirt && !state.looseDust) {
      const wim = view.people.find(person => person.id === 'wim');
      if (distance(wim?.position, feet) <= 2.5 && distance(wim?.position, view.carPosition) <= 12 &&
          !isTrue({fact: 'mark', id: 'wim/clean-car'}, world)) {
        choices.push({id: 'wim/clean-car', effects: [{type: 'mark', id: 'wim/clean-car'}]});
        requests.push(bubble('wim', [{speaker: 'wim', words: WIM_CLEAN}]));
      }
    }
    return {state, choices, requests};
  },
};
