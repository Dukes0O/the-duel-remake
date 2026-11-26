// This part posts choices and requests through the open-land host. Events carry the inputs and outputs for the
// shared talk, inventory, audio and encounter adapters. Interact is the on-foot repair input until the wrench joins it.
import {siteSolidRows} from '../../scablands-solids.js';
import {STORY_FIGURES} from '../../jobs/story-people.js';
import {campPeople} from '../content/people-sites.js';
import {FEUD_GROUPS, nameOf} from '../register.js';
import {isTrue} from '../facts.js';
import {isHeld} from '../holds.js';
import {isFound, stageOf} from '../open-record.js';
import {BUS_RING} from '../content/market-day-places.js';
import {CAMP_SITES} from '../content/sites.js';
import {brokenMark} from '../content/needs.js';
import {meetingMark, siteGreeting, siteScene} from '../content/talk-sites.js';
import {goodwillEffects} from '../goodwill-rule.js';
import {bearing, canFindSite, distance, hasSiteServices, namedPick, residentPose, sitePosition, siteSpot, visitNeed} from '../site-rule.js';

const VISIT_RADIUS = 42, REPAIR_RADIUS = 2.25, FAVOUR_RADIUS = 1500;
const ASH_DUST = .6;
const OFFER = 'open/need-offered/';
const repairMarker = (site, world, spot) => ({type: 'marker', place: {...siteSpot(site.id, world.open.landSeed, spot), radius: 1}});
const SPEECH_SECONDS = 2.25;
const CUES = {found: 'open.site.found', mended: 'open.need.mended', rumour: 'open.rumour', voice: 'open.radio.voice'};
const marked = (world, id) => isTrue({fact: 'mark', id}, world);
const mark = id => ({type: 'mark', id});
const namedNight = night => {
  const word = ['first', 'second', 'third', 'fourth', 'fifth'][night - 1];
  return word ? 'the ' + word + ' night' : 'night ' + night;
};
const choiceSeen = (world, id) => [world.ledger.history, world.open.journal]
  .some(list => list.some(change => change.choiceId === id && change.night === world.ledger.night));

function caption(id, text) {
  return {type: 'say', lineId: id, text};
}

function filledScene(world, site, sceneId, extra = {}) {
  const here = sitePosition(site.id, world.open.landSeed);
  const fill = (whole, id, field) => {
    if (field === 'name') return extra[id]?.name ?? whole;
    const there = extra[id]?.position ?? sitePosition(id, world.open.landSeed);
    return there ? bearing(here, there) : whole;
  };
  const scene = siteScene(sceneId);
  return {...scene, lines: scene.lines.map(line => ({...line,
    words: line.words.replace(/\{([a-z-]+)\.(bearing|name)\}/g, fill)}))};
}

function speechLines(world, site, sceneId, extra) {
  return filledScene(world, site, sceneId, extra).lines.map((line, index) => caption(sceneId + '/' + index, line.words));
}

function listenAtRadio(site, world, state, position, view, holds, events, queue) {
  if (!site.radioWithin || state.radio || view.onFoot || isFound(world, site.id) ||
      distance(view.carPosition ?? view.player?.position, position) > site.radioWithin ||
      isHeld(holds, 'signs')) return;
  const scene = namedPick(world.seed, site.id + '/voice/night-' + world.ledger.night,
    [site.id + '/voice-1', site.id + '/voice-2']);
  state.radio = true;
  queue.push(...speechLines(world, site, scene));
  events.push({type: 'siteRadio', site: site.id, cue: CUES.voice, scene});
}

function discover(site, world, onFoot, point, position, choices, events, requests) {
  if (isFound(world, site.id) || !canFindSite(site, point, position, onFoot)) return false;
  const ash = site.ashWary && world.open.car.dirt >= ASH_DUST;
  const name = site.name.replace(/^The /, 'the ');
  const night = namedNight(world.ledger.night);
  choices.push({id: 'open/site-found/' + site.id, effects: [
    {type: 'find', site: site.id},
    {type: 'met', person: site.people, text: 'You found ' + name + ' on ' + night + '.'},
    ...(ash ? [{type: 'word', person: site.people, set: 'Wary'}, mark('open/ash/' + site.id)] : []),
  ]});
  // Give the discovery the screen even if a radio line is already queued.
  requests.push(caption('open/site-found/' + site.id, site.name + ' is on your map.'));
  events.push({type: 'siteFound', site: site.id, position, cue: CUES.found});
  return true;
}

function townPrice(need, world) {
  return need.source.person && isTrue({fact: 'word', of: need.source.person, atLeast: 'Friendly'}, world)
    ? 0 : need.source.price;
}

function hasSupply(world, need) {
  return marked(world, 'open/supply/' + need.id);
}

function news(scene, event, world) {
  const {ledger} = world;
  if (scene === 'finch/rumour') return {scene, effects: [{type: 'rumour', site: 'radio-hill'}], cue: CUES.rumour};
  if (scene !== 'hetty/friendly' && scene !== 'hetty/sworn') return null;
  const heard = id => marked(world, 'radio-hill/news/' + id);
  if (!isFound(world, 'glasshouse') && !marked(world, 'rumour/glasshouse'))
    return {scene: 'hetty/glasshouse', effects: [{type: 'rumour', site: 'glasshouse'}], cue: CUES.rumour};
  const enemy = FEUD_GROUPS.find(of => isTrue({fact: 'feud', of, atLeast: 'Raiding'}, world) && !heard('feud/' + of));
  if (enemy) {
    const name = nameOf(enemy).replace(/^The /i, '');
    const source = ledger.history.findLastIndex(change => change.type === 'feud' && change.key === 'feud');
    const text = siteScene('hetty/feud').lines[0].words.replace('{enemy.name}', name);
    return {scene: 'hetty/feud', extra: {enemy: {name}}, effects: [
      mark('radio-hill/news/feud/' + enemy),
      ...(enemy === 'ash-men' && source >= 0 ? [{type: 'tell', source, text, because: 'Hetty heard about the feud on the radio.'}] :
        [{type: 'met', person: 'hetty', text}]),
    ]};
  }
  if (event?.id && event.position && !event.seen && !heard('sign/' + event.id))
    return {scene: 'hetty/sign', extra: {sign: event}, effects: [mark('radio-hill/news/sign/' + event.id)], cue: CUES.rumour};
  return !heard('quiet') ? {scene: 'hetty/quiet', effects: [mark('radio-hill/news/quiet')]} : null;
}

function meet(site, world, state, person, sign, choices, events, requests, queue) {
  const id = meetingMark(site.id);
  const first = !marked(world, id);
  if (first && person && person !== site.leader) return;
  const greeting = siteGreeting(person ?? site.leader, world);
  if (!greeting) return;
  if (person) requests.push({type: 'talk', scene: filledScene(world, site, greeting), speaker: person});
  else queue.push(...speechLines(world, site, greeting));
  events.push({type: 'siteTalk', site: site.id, scene: greeting, person: person ?? site.leader});
  if (first) {
    state.introduced = true;
    if (person || !siteScene(greeting).choices.length) choices.push({id, effects: [mark(id)]});
    return;
  }
  const newsId = 'open/news/' + site.id;
  if (choiceSeen(world, newsId)) return;
  const item = news(greeting, sign, world);
  if (!item) return;
  if (item.scene !== greeting) queue.push(...speechLines(world, site, item.scene, item.extra));
  choices.push({id: newsId, effects: item.effects});
  if (item.cue) events.push({type: 'siteRumour', site: site.id, cue: item.cue, scene: item.scene});
}

function repairNeed(site, world, state, need, view, point, dt, choices, events, requests, queue) {
  const repair = state.repair ?? {id: need.id, done: []};
  const incomplete = need.targets.filter(target => !repair.done.includes(target));
  const target = incomplete.find(spot => distance(point, siteSpot(site.id, world.open.landSeed, spot)) <= REPAIR_RADIUS);
  if (!target || !view.onFoot || !view.interact || view.siteInput?.wrench === false) {
    state.repair = repair.done.length ? {id: need.id, done: repair.done} : null;
    return;
  }
  const seconds = (repair.target === target ? repair.seconds : 0) + dt;
  if (seconds + 1e-9 < need.wrenchSeconds) {
    state.repair = {...repair, target, seconds};
    return;
  }
  if (incomplete.length > 1) {
    state.repair = {id: need.id, done: [...repair.done, target]};
    requests.push(repairMarker(site, world, incomplete.find(spot => spot !== target)));
    return;
  }
  if (!isTrue({fact: 'scrap', atLeast: need.scrap}, world)) {
    // Keep the work ready for when the player comes back with the part, and charge only once.
    if (repair.seconds !== need.wrenchSeconds)
      queue.push(caption('open/need/no-scrap', 'You need ' + need.scrap + ' scrap to finish this repair.'));
    state.repair = {...repair, target, seconds: need.wrenchSeconds};
    return;
  }
  const goodwill = goodwillEffects(world, site.people, 'mend');
  const welcome = goodwill.some(effect => effect.type === 'word') ? ' ' + site.name + ' called you Friendly.' : '';
  choices.push({id: 'open/mend/' + need.id, effects: [
    {type: 'scrap', by: -need.scrap}, ...goodwill, ...need.gives,
    {type: 'met', person: need.thanksBy, text: need.remembered + welcome},
  ]});
  queue.push(...speechLines(world, site, need.id + '/done'));
  events.push({type: 'siteMended', site: site.id, need: need.id, cue: CUES.mended});
  requests.push({type: 'marker', place: null});
  state.repair = null;
  state.need = null;
}

function supplyNeed(site, world, state, need, view, choices, events, queue) {
  const promise = world.ledger.obligations.find(item => item.type === 'promise' && item.id === need.id);
  const talked = view.jobEvents?.find(event => event.type === 'talkChoice' &&
    [need.id + '/accept', need.id + '/refuse'].includes(event.id));
  if (promise && world.ledger.night > promise.due) {
    choices.push({id: 'open/broke/' + need.id, effects: [
      {type: 'settle', id: need.id}, mark(brokenMark(need.id)), ...goodwillEffects(world, site.people, 'broken'),
    ]});
    queue.push(...speechLines(world, site, need.id + '/broken'));
    state.need = null;
  } else if (promise && hasSupply(world, need) && !view.onFoot) {
    choices.push({id: 'open/delivered/' + need.id, effects: [
      {type: 'settle', id: need.id}, ...need.gives, ...goodwillEffects(world, site.people, 'kept'),
    ]});
    queue.push(...speechLines(world, site, need.id + '/done'));
    events.push({type: 'siteSupplyDelivered', site: site.id, need: need.id});
    state.need = null;
  } else if (!promise && talked?.id.endsWith('/accept')) {
    choices.push({id: 'open/promise/' + need.id, effects: [
      {type: 'promise', id: need.id, person: site.people, dueNights: need.dueNights, text: need.promise},
    ]});
    queue.push(caption(need.id + '/accepted', need.acceptReply));
  } else if (!promise && talked) {
    queue.push(caption(need.id + '/refused', need.refuseReply));
    state.need = null;
  }
}

function pickupSupplies(world, view, choices, events) {
  let scrap = world.scrap;
  const pickedUp = new Set();
  for (const event of view.jobEvents ?? []) {
    if (event.type !== 'siteSupplyPickup' || pickedUp.has(event.need)) continue;
    const site = CAMP_SITES.find(site => site.needs.includes(event.need));
    const need = site && visitNeed(site, world);
    if (need?.id !== event.need || need.kind !== 'supply' || hasSupply(world, need) ||
        !isTrue({fact: 'promise', id: need.id}, world) || event.place !== need.source.place ||
        (need.source.person && event.person !== need.source.person) ||
        (need.source.onFoot && !view.onFoot)) continue;
    const price = townPrice(need, world);
    if (scrap < price) continue;
    scrap -= price;
    pickedUp.add(need.id);
    choices.push({id: 'open/pickup/' + need.id, effects: [{type: 'scrap', by: -price}, mark('open/supply/' + need.id)]});
    events.push({type: 'siteSupplyCarried', site: site.id, need: need.id});
  }
}

function otherDeeds(world, view, choices) {
  const seen = new Set();
  const kinds = {siteHelped: 'helped', sitePeopleAttacked: 'attacked', siteLeftInTrouble: 'left'};
  for (const event of view.jobEvents ?? []) {
    if (!Object.hasOwn(kinds, event.type) || !event.id || seen.has(event.id)) continue;
    const site = CAMP_SITES.find(site => site.id === event.site);
    if (!site || !isFound(world, site.id)) continue;
    const id = 'open/deed/' + event.id;
    seen.add(event.id);
    if (!choiceSeen(world, id)) choices.push({id, effects: goodwillEffects(world, site.people, kinds[event.type])});
  }
}

function spendFavour(world, view, choices, events, queue) {
  // One favour per request, from the nearest camp that can help.
  const event = view.jobEvents?.find(event => event.id &&
    (event.type === 'siteTowRequested' || event.type === 'siteEncounter'));
  if (!event) return;
  const id = 'open/favour/' + event.id;
  if (choiceSeen(world, id)) return;
  const here = event.position ?? view.carPosition;
  const tow = event.type === 'siteTowRequested';
  const candidates = CAMP_SITES.filter(site => (!event.site || event.site === site.id) &&
    isFound(world, site.id) && hasSiteServices(stageOf(world, site.id)) &&
    isTrue({fact: 'favour', of: site.people, atLeast: 1}, world)).map(site => ({
    site, range: distance(here, sitePosition(site.id, world.open.landSeed)),
  })).sort((a, b) => a.range - b.range);
  const nearest = candidates[0];
  if (!nearest || !Number.isFinite(nearest.range) || (!tow && nearest.range > FAVOUR_RADIUS)) return;
  const {site} = nearest;
  choices.push({id, effects: [{type: 'favour', person: site.people, by: -1}]});
  const type = tow ? 'siteTow' : site.warns ? 'siteWarning' : 'siteSupport';
  events.push({type, site: site.id, id: event.id,
    position: here, campPosition: sitePosition(site.id, world.open.landSeed),
    ...(type === 'siteWarning' ? {advanceSeconds: 10, enemyPosition: event.enemyPosition ?? null} : {})});
  queue.push(...speechLines(world, site, site.id + (tow ? '/tow' : '/assist'),
    {encounter: {position: event.enemyPosition ?? here}}));
}

export const sitesPart = {
  id: 'sites',
  step(previous, {world, holds, view, seconds}, dt) {
    const state = {...previous, night: world.ledger.night,
      partOfDay: view.siteInput?.partOfDay ?? view.partOfDay ?? 'day',
      routineTime: (previous.routineTime ?? 0) + (isHeld(holds, 'routines') ? 0 : dt)};
    const queue = [...(state.queue ?? [])], choices = [], events = [], requests = [];
    const point = view.onFoot ? view.fighter?.position ?? view.player?.position : view.carPosition ?? view.player?.position;
    if (!point) return {state};
    const busy = isHeld(holds, 'services');
    if (!busy) {
      otherDeeds(world, view, choices);
      pickupSupplies(world, view, choices, events);
      spendFavour(world, view, choices, events, queue);
    }

    let near = null;
    const camps = CAMP_SITES.filter(site => !site.storyOnly || view.checkpointsEnabled);
    const layout = camps.map(site => stageOf(world, site.id));
    const lastLayout = previous.landSeed === world.open.landSeed ? previous.layout : null;
    for (const [index, site] of camps.entries()) {
      const position = sitePosition(site.id, world.open.landSeed);
      if (lastLayout?.[index] !== layout[index])
        requests.push({type: 'solids', id: site.id, solids: site.id === 'bus-ring' && hasSiteServices(layout[index]) ?
          BUS_RING.structures.map(row => ({...row, id: site.id + '/' + row.id, x: position.x + row.x, z: position.z + row.z})) :
          siteSolidRows(site.id, position, layout[index])});
      const found = isFound(world, site.id);
      if (!found && discover(site, world, view.onFoot, point, position, choices, events, requests))
        state.nextLineAt = seconds + SPEECH_SECONDS;
      else listenAtRadio(site, world, state, position, view, holds, events, queue);
      if (found && distance(position, point) <= VISIT_RADIUS && hasSiteServices(layout[index])) near = site;
    }
    state.layout = layout;
    state.marketSites = !!view.checkpointsEnabled;
    state.landSeed = world.open.landSeed;
    if (state.site !== near?.id || previous.night !== world.ledger.night) {
      if (state.repair || state.need) requests.push({type: 'marker', place: null});
      state.site = near?.id;
      state.arrivedAt = state.routineTime;
      state.introduced = false;
      state.repair = null;
      state.need = null;
    }
    if (!busy && near) {
      const talk = view.onFoot && view.interact && !previous.interact;
      const person = view.siteInput?.person ?? (talk ? campPeople(near.id).find(row =>
        distance(point, residentPose(row, world, state, STORY_FIGURES[row.figure].pace).position) <= 2.5)?.id : null);
      const need = visitNeed(near, world);
      const met = marked(world, meetingMark(near.id));
      if (person && need?.kind === 'supply' && person === need.by && met &&
          !isTrue({fact: 'promise', id: need.id}, world)) {
        requests.push({type: 'talk', scene: filledScene(world, near, need.id + '/ask'), speaker: person});
      } else if ((!met && !state.introduced) || person) {
        meet(near, world, state, person, view.siteInput?.sign, choices, events, requests, queue);
      }
      const reply = view.jobEvents?.find(event => event.type === 'talkChoice' && event.id?.startsWith(near.id + '/meet/'));
      if (reply && near.id === 'glasshouse') {
        const option = siteScene('glasshouse/first').choices.find(option => option.id === reply.id);
        if (option) queue.push(caption(option.id + '/reply', option.reply.words));
      }


      if (need) {
        const offerMark = OFFER + need.id + '/' + world.ledger.night;
        const offered = marked(world, offerMark);
        if (!offered && !isTrue({fact: 'promise', id: need.id}, world)) {
          choices.push({id: OFFER + near.id, effects: [mark(offerMark)]});
          queue.push(...speechLines(world, near, need.id + '/ask'));
          events.push({type: 'siteNeed', site: near.id, need: need.id, scene: need.id + '/ask'});
        }
        if (need.kind === 'mend' && state.need !== need.id) requests.push(repairMarker(near, world, need.targets[0]));
        state.need = need.id;
        if (need.kind === 'mend') {
          if (state.repair?.id !== need.id) state.repair = null;
          repairNeed(near, world, state, need, view, point, dt, choices, events, requests, queue);
        } else supplyNeed(near, world, state, need, view, choices, events, queue);
      }
    } else state.repair = null;
    if (!near || busy) state.need = null;
    state.interact = view.interact === true;
    if (!requests.some(item => ['say', 'talk'].includes(item.type)) && queue.length && seconds >= (state.nextLineAt ?? 0)) {
      requests.push(queue.shift());
      state.nextLineAt = seconds + SPEECH_SECONDS;
    }
    state.queue = queue;
    return {state, choices, events, requests};
  },
};
