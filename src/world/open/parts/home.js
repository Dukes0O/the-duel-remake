// HOME-GROUND-1 and HOME-GROUND-2: the player's own ground beside Tin Town (docs/HOME_GROUND.md, sections 4 to 7 and 15),
// behind the switch `home-ground`. With the switch off (`view.homeGround` is not true) this part returns nothing: it reads
// nothing of the record and asks for nothing to be drawn or saved.
//
// What it reads from the job's view: homeGround, openRoam, onFoot, fighter, carPosition, interact, people, playerName,
// homeVehicle (the outing's work vehicle id), homeCarHeading and speedKmh for its load and saved truck pose,
// jobEvents, homeKeys {build, turn, piece, view, burst, sprint, fire, forward, back, left, right, turnLeft, turnRight}
// (the keys held this tick), homeName ({name} typed in the box, or {cancel: true}) and homeClock: the laptop's clock, in
// seconds since 1970, read once when the outing opened (src/app.js). Nothing reads a clock during play: the hens lay over
// the outing's own seconds (context.seconds), which count from that one reading.
// What it leaves in its state for the drawing, the HUD, the walker and the hands (they only read it):
//   above, cursor           the view from straight above, and the outline's place there
//   outline                 {piece, mode: 'build' | 'lift' | 'refused', reason, progress, marked, shake} or null; shown
//                           only once he has pressed B (building)
//   prompt                  the sentence the HUD shows, or ''
//   burst                   {charge 0..1, active, spent, shown}; the walker runs at the third speed while active
//   gateOpen, naming, namingHen, namingKey
//   onGround                he stands on or beside his ground: the launcher is lowered and the car-aim words hidden
//   armed                   he took the launcher back with the fire key, until he builds again
//   tool, strike            'hammer' or 'wrench' in his hands while he builds, and how far through a strike (0..1)
//   flock                   where each hen is and what she is doing
//   board                   {lines, until} while the board at the gate is shown
//   opened                  what the outing found when it opened: {away, long, laid, hadHens}
//   loadKg, flatbedOuting    weight for the existing haul sync, and whether to draw a load on the driven bed
//   on                      true once the part has run with its switch on; the drawing draws nothing before
// Its choices write the record with the effect {type: 'home', record}; nothing else of the world is changed.
import {TALK_RANGE, distanceToPerson} from './people.js';
import {AWAY_LONGEST, BOARD_NEAR, BOARD_SECONDS, BUILD_IDLE_SECONDS, FOOT_BURST, HAMMER_STRIKE_SECONDS, HEN_LOOK, HOME_BOX,
  HOME_CELLS, HOME_CUES, HOME_CURSOR_SPEED, HOME_OFFER, HOME_OFFER_ID, HOME_PIECES, HOME_REACH, HOME_SIZE, HOME_STEP,
  HOME_WORDS, MOSS_HENS_ID, MOSS_TALK, defaultHomeName, HOME_BUILDS, HOME_STAGES, HOME_LOAD_STACK, HOME_CREW_TALK,
  HOME_TOWER_STAGES, HOME_RAID, HOME_TANK_STAGES, HOME_TANK, HOME_WELL} from '../content/home-ground.js';
import {awayFor, boardLines, boardSpot, boxForEgg, boxInLand, boxRefusal, boxRoom, boxSlotInFront, boxesFull, build,
  buildBox, cleanHomeName, crateSpot, cratesLeft, facedThing, gateOf, gatesLeft, gatherBox, giveHens, groundCentre,
  groundPoint, hensWaiting, homeSolids, lift, liftBox, markAt, nameHen, newHome, newsBoardSpot, outlineFor, outsideBy,
  panelsLeft, pieceInLand, readableHome, ripen, slotAt, slotInFront, toGrid, toggleMark, upgradeHome,
  buildBounds, buildInLand, buildingDoor, buildSlot, buildRefusal, markBuild, liftBuild, buildHasLoad, raiseBuild, gatherCoop, shedWords, roostAt,
  homeLoadKg, transferHomeLoad, matchesBuild, crewOffer, handToCrew, ripenHome, standPanel,
  lootOnBed, cartersBusy, cartersOffer, sendCarters, finishCarters,
  canBorrowDrill, wellInLand, wellRefusal, markWell, homeDrillHole, drillHomeWell, fitHomePump, fillHomeTanks, tankWords} from '../home-rule.js';
import {openHomeSitting, homeRaidDue, startHomeRaid, stepHomeRaid, raidInterval, towerAtLadder, stepHomeTower} from '../home-raid-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {makeRng} from '../../../rng.js';
import {createDrillRigState, stepDrillRig, drillYardControls, drillMaterialAt} from '../../../machines/drill.js';
import {machineMoveContact} from '../../../machines/yard-solids.js';
import {stepMover} from '../../scablands-movers.js';

// He builds while he stands within this many metres of his ground; the gate opens for him within GATE_OPENS.
const BUILD_NEAR = 4, GATE_OPENS = 7, PROMPT_NEAR = 14, BOARD_REACH = 2.5, CRATE_REACH = 3;
// From above, a mark may be made where only the missing piece stops the building.
const MARK_ANYWAY = ['noPanels', 'noGate'];
const KEY_NAMES = ['build', 'turn', 'piece', 'view', 'burst', 'sprint', 'fire', 'interact'];
const say = (key, text) => ({type: 'say', lineId: 'open/home-ground/' + key, text});
const words = (key, fill = {}) => {
  const values = {...fill, storeEggs: fill.store === 1 ? 'egg' : 'eggs'};
  return HOME_WORDS[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
};
const cue = name => ({type: 'homeCue', cue: name});
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// A hen walks to her box this long before her egg is due, and walks at this pace.
const HEN_HEADS_TO_BOX = 25, HEN_WALK = .55, HEN_KEEP_IN = 1.2;

function begin() {
  return {held: {}, kind: 'panel', turns: 0, hammer: null, above: false, cursor: null, outline: null, prompt: '',
    burst: {charge: 1, active: false, spent: false, shown: false}, gateOpen: false, solidsKey: '', naming: false,
    namingHen: null, namingKey: '', namingChain: false, offerOpen: false, given: false, opened: null, ripenedAt: 0,
    building: false, idle: 0, tool: null, strike: null, armed: false, onGround: false, flock: [], flockSeed: 1,
    board: null, boardShown: false, crateTalk: false, crewTalk: false, crewLesson: null, crewWalk: 0, crewKey: '', crewPeople: [],
    loadHeld: null, raid: null, lastDay: null, tower: null, drillRig: null, drilling: false, drillSoundAt: 0};
}

// The third speed. It empties in FOOT_BURST.seconds of use; once spent it refills fully before it can be used again.
function stepBurst(burst, held, moving, dt, events) {
  let {charge, active, spent} = burst;
  const want = held && moving && !spent && charge > 0;
  if (want) {
    if (!active) events.push(cue(HOME_CUES.burst));
    charge = Math.max(0, charge - dt / FOOT_BURST.seconds);
    active = charge > 0;
    if (!active) { spent = true; events.push(cue(HOME_CUES.spent)); }
  } else {
    active = false;
    charge = Math.min(1, charge + dt / FOOT_BURST.refillSeconds);
    if (charge >= 1) spent = false;
  }
  return {charge, active, spent, shown: active || charge < 1};
}

function choice(id, record) {
  return {id: 'home-ground/' + id, effects: [{type: 'home', record}]};
}

// ---- The hens about his ground: where each is and what she does. Seeded, so the same inputs walk them the same way. --
function draw(seed) {
  const rng = makeRng(seed);
  return {value: rng.float(), seed: Math.floor(rng.float() * 4294967295) + 1};
}
function startFlock(hens, from) {
  return hens.map((_, index) => ({x: from.x + (index ? .6 : -.6), z: from.z, yaw: 0, mode: 'peck', left: 1.5 + index, tx: from.x, tz: from.z}));
}
const insideGround = value => Math.max(HEN_KEEP_IN, Math.min(HOME_SIZE - HEN_KEEP_IN, value));
// Walk round the coop's walls to its open front. This path belongs to the rules, never to the renderer.
function coopPath(record, hen, target, leaving = false) {
  const at = buildInLand(record.builds.find(row => row.kind === 'coop' && row.stage === 4));
  const c = Math.cos(at.heading), s = Math.sin(at.heading), dx = hen.x - at.x, dz = hen.z - at.z;
  const x = dx * c - dz * s, z = dx * s + dz * c;
  const point = (lx, lz) => ({x: at.x + lx * c + lz * s, z: at.z - lx * s + lz * c});
  if (leaving) return [point(0, 1.6), point(0, 2.6)];
  if (Math.abs(x) < 1.9 && Math.abs(z) < 1.9) return [target];
  const path = [];
  if (z < 2.6) {
    const side = x < 0 ? -2.6 : 2.6;
    path.push(point(side, z), point(side, 2.6));
  }
  path.push(point(0, 2.6), point(0, 1.6), target);
  return path;
}
// `since` is the seconds since the record's dues were last brought up to date: a hen's egg is due in `due - since`.
function stepFlock(flock, seedIn, record, dt, events, since, partOfDay) {
  let seed = seedIn;
  const room = boxRoom(record) > 0;
  const box = room ? boxForEgg(record.boxes) : -1;
  const out = flock.map((hen, index) => {
    const due = (record.hens[index]?.due ?? Infinity) - since;
    let {x, z, yaw, mode, left, tx, tz} = hen;
    const roost = roostAt(record, index, partOfDay);
    let path = hen.homePath ?? null;
    if (roost && (!path || hen.leaving)) path = coopPath(record, hen, roost);
    if (!roost && (mode === 'roost' || (path && !hen.leaving))) path = coopPath(record, hen, null, true);
    if (path?.length) {
      const [target, ...rest] = path;
      tx = target.x; tz = target.z;
      const far = Math.hypot(tx - x, tz - z), stride = Math.min(far, HEN_WALK * dt);
      if (far > .01) { yaw = Math.atan2(tx - x, tz - z); x += (tx - x) / far * stride; z += (tz - z) / far * stride; }
      if (far - stride <= .05) path = rest;
      mode = !path.length ? roost ? 'roost' : 'peck' : 'walk';
      if (mode === 'roost' && hen.mode !== 'roost') events.push(cue(HOME_CUES.roost));
      return {x, z, yaw, mode, left: 2, tx, tz, homePath: path.length ? path : null, leaving: !roost};
    }
    // Her egg is near and a box has room: she goes to it and sits.
    if (box >= 0 && due <= HEN_HEADS_TO_BOX) {
      const at = boxInLand(record.boxes[box]);
      tx = at.x; tz = at.z;
      mode = Math.hypot(tx - x, tz - z) <= .25 ? 'sit' : 'walk';
    } else if (mode === 'sit') { mode = 'peck'; left = 2; }
    else if (mode !== 'walk') {
      left -= dt;
      if (left <= 0) {
        let pick = draw(seed); seed = pick.seed;
        if (pick.value < .5) {
          const corner = groundPoint(0, 0);
          let a = draw(seed); seed = a.seed; let b = draw(seed); seed = b.seed;
          tx = corner.x + insideGround(x - corner.x + (a.value - .5) * 12);
          tz = corner.z + insideGround(z - corner.z + (b.value - .5) * 12);
          mode = 'walk';
        } else {
          const next = pick.value < .8 ? 'peck' : 'scratch';
          let span = draw(seed); seed = span.seed;
          if (next === 'peck' && span.value < .25) events.push(cue(HOME_CUES.cluck));
          mode = next; left = next === 'peck' ? 2 + span.value * 3 : 1.5 + span.value * 1.5;
        }
      }
    }
    if (mode === 'walk') {
      const dx = tx - x, dz = tz - z, far = Math.hypot(dx, dz);
      if (far > .01) yaw = Math.atan2(dx, dz);
      const stride = Math.min(far, HEN_WALK * dt);
      if (far > .01) { x += dx / far * stride; z += dz / far * stride; }
      if (far - stride <= .02 && !(box >= 0 && due <= HEN_HEADS_TO_BOX)) { mode = 'peck'; left = 1.5; }
    }
    return {x, z, yaw, mode, left, tx, tz};
  });
  return {flock: out, seed};
}

export const homePart = {
  id: 'home',
  begin,
  step(state, context, dt) {
    const {view, world} = context;
    if (view.homeGround !== true || !view.openRoam) return;
    const keys = view.homeKeys ?? {};
    const held = Object.fromEntries(KEY_NAMES.map(name => [name, !!(name === 'interact' ? view.interact : keys[name])]));
    const pressed = name => held[name] && !state.held[name];
    const events = [], requests = [], choices = [];
    const fighter = view.onFoot ? view.fighter : null;
    const where = fighter?.position ?? view.carPosition ?? null;
    const now = context.seconds ?? 0;
    let next = {...state, held, on: true};
    const home = readableHome(world.open.home) ? world.open.home : null;

    // On foot, anywhere in the open land: the sprint is the game's own; its cue is named here. The burst is this card's.
    const moving = !!fighter && !!(keys.forward || keys.back || keys.left || keys.right);
    if (fighter && keys.sprint && moving && !state.sprinting) events.push(cue(HOME_CUES.sprint));
    next.sprinting = !!fighter && !!keys.sprint && moving;
    next.burst = fighter && !state.above ? stepBurst(state.burst, keys.burst, !!keys.forward, dt, events)
      : stepBurst(state.burst, false, false, dt, events);

    // ---- Before he has the ground -------------------------------------------------------------------------------
    if (!home) {
      for (const event of view.jobEvents ?? []) {
        if (event.scene !== HOME_OFFER_ID) continue;
        if (event.type === 'talkChoice' && event.id === 'take' && !state.given) {
          next.given = true;
          const name = defaultHomeName(view.playerName);
          choices.push(choice('given', newHome(name)));
          requests.push(say('given', HOME_WORDS.given));
          const centre = groundCentre();
          requests.push({type: 'marker', place: {x: centre.x, z: centre.z, y: scablandsSurfaceHeightAt(centre.x, centre.z), radius: 6}});
          next.marked = true;
        }
        if (['openTalkClosed', 'openTalkSkipped'].includes(event.type)) next.offerOpen = false;
      }
      const auntie = (view.people ?? []).find(person => person.id === 'auntie-solder');
      if (fighter && !next.given && !state.offerOpen && pressed('interact') && auntie &&
          distanceToPerson(auntie, fighter.position) <= TALK_RANGE) {
        next.offerOpen = true;
        requests.push({type: 'talk', id: HOME_OFFER_ID, scene: HOME_OFFER, person: 'auntie-solder', speaker: 'auntie-solder',
          asked: [], threadPriority: true});
      }
      next.prompt = where && !next.given && outsideBy(where.x, where.z) < PROMPT_NEAR ? HOME_WORDS.askAuntie : '';
      next.outline = null;
      return {state: next, events, requests, choices};
    }

    // ---- His ground ---------------------------------------------------------------------------------------------
    let record = home;
    const clock = Number.isFinite(view.homeClock) ? view.homeClock : null;
    // Once an outing, the first time this part runs on his ground: the time since his last visit, from the clock read
    // when the outing opened, ripens the hens' laying, and the record is brought up to step 2's.
    if (!state.opened) {
      const kept = upgradeHome(record);
      const moment = clock === null ? null : clock + now;
      const counted = awayFor(kept.lastSeen, moment);
      const ripe = ripenHome(kept, counted);
      const returned = finishCarters(fillHomeTanks(ripe.home, moment), moment === null ? kept.lastSeen : Math.max(moment, kept.lastSeen ?? 0));
      if (returned.receipt) events.push(cue(HOME_CUES.cartersBack));
      const opened = openHomeSitting({...returned.home,
        lastSeen: moment === null ? ripe.home.lastSeen : Math.max(moment, ripe.home.lastSeen ?? 0)}, context.seed);
      next.clockBase = opened.lastSeen;
      next.openedAt = now;
      next.opened = {away: counted, long: Number.isFinite(kept.lastSeen) && moment !== null && moment - kept.lastSeen > AWAY_LONGEST,
        finished: ripe.finished, laid: ripe.laid.length, hadHens: kept.hens.length > 0, carters: returned.receipt};
      next.ripenedAt = now;
      if (JSON.stringify(opened) !== JSON.stringify(record)) { record = opened; choices.push(choice('opened', record)); }
    }
    // The hens lay over the outing's own seconds. The record is brought up to the moment before any change he makes to
    // the hens or boxes, and whenever an egg is due; `lastSeen` is then the clock's reading plus those seconds.
    const catchUp = () => {
      const job = record.crew.job;
      const before = job && record.builds.find(row => matchesBuild(row, job));
      const ripe = ripenHome(record, now - next.ripenedAt);
      if (before && ripe.home.builds.find(row => matchesBuild(row, job)).stage > before.stage) events.push(cue(HOME_CUES.crewHammer));
      if (ripe.finished) { next.opened = {...next.opened, finished: ripe.finished}; events.push(cue(HOME_CUES.crewDone)); }
      next.ripenedAt = now;
      record = {...ripe.home, lastSeen: next.clockBase === null ? ripe.home.lastSeen : next.clockBase + now - next.openedAt};
      const filled = record.builds.some(row => row.kind === 'tank' && row.litres === HOME_TANK.litres &&
        home.builds?.some(old => matchesBuild(old, row) && old.litres < HOME_TANK.litres));
      if (filled) events.push(cue(HOME_CUES.tankFill));
      const returned = finishCarters(record, record.lastSeen);
      record = returned.home;
      if (returned.receipt) {
        next.opened = {...next.opened, carters: returned.receipt};
        events.push(cue(HOME_CUES.cartersBack));
        requests.push(say('carters-back', words('cartersBack', returned.receipt)));
      }
      return ripe.laid;
    };
    const gap = now - next.ripenedAt;
    if (record.hens.some(hen => hen.due <= gap) && boxRoom(record) > 0) {
      const laid = catchUp();
      for (const egg of laid) {
        events.push(cue(HOME_CUES.lay));
        requests.push(say('laid', words('laid', {hen: record.hens[egg.hen].name})));
      }
      if (laid.length && boxesFull(record)) {
        events.push(cue(HOME_CUES.boxFull));
        requests.push(say('box-full', HOME_WORDS.boxFull));
      }
      choices.push(choice('laid', record));
    }

    if ((record.crew.job || cartersBusy(record) || record.builds.some(row => row.kind === 'tank' && row.stage === 4)) && now > next.ripenedAt) {
      catchUp();
      choices.push(choice('crew-clock', record));
    }

    // Decide only on release: the same press must never both move tin and leave the truck.
    const drivingFlatbed = !view.onFoot && view.homeVehicle === 'flatbed';
    const loadTap = drivingFlatbed && !held.interact && state.held.interact &&
      state.loadHeld !== null && state.loadHeld + 1e-9 < .4;
    next.loadHeld = drivingFlatbed && held.interact ? (state.loadHeld ?? 0) + dt : null;
    let loadPrompt = '';
    if (view.homeVehicle === 'flatbed' && view.carPosition && Number.isFinite(view.homeCarHeading)) {
      const pose = {...view.carPosition, yaw: view.homeCarHeading};
      if (pose.x !== record.flatbed.x || pose.z !== record.flatbed.z || pose.yaw !== record.flatbed.yaw) {
        record = {...record, flatbed: {x: pose.x, z: pose.z, yaw: pose.yaw}};
        choices.push(choice('flatbed', record));
      }
    }
    if ((record.boxes.length || record.loot.length) && !view.onFoot) {
      const moved = transferHomeLoad(record, {vehicle: view.homeVehicle, position: view.carPosition, speedKmh: view.speedKmh});
      if (moved !== record) {
        const kind = Object.keys(HOME_BUILDS).find(key => moved.loads[key] !== record.loads[key]);
        const loot = !kind;
        const loading = loot ? moved.loot.length === record.loot.length : moved.loads[kind] === 'bed';
        const piece = loot && loading ? record.loot.find((row, index) => row !== moved.loot[index]).kind : kind;
        loadPrompt = words(loot ? loading ? 'lootOn' : 'lootOff' : loading ? 'loadOn' : 'loadOff', {piece});
        if (loadTap) {
          if (loot && !loading) requests.push(say('loot-stored', words('lootStored', {count: moved.scrap - record.scrap})));
          record = moved;
          choices.push(choice('load', record));
          events.push(cue(loot ? loading ? HOME_CUES.lootOn : HOME_CUES.lootOff : loading ? HOME_CUES.loadOn : HOME_CUES.loadOff));
          loadPrompt = '';
        }
      } else if (drivingFlatbed && cartersBusy(record)) loadPrompt = HOME_WORDS.cartersBusy;
      else if (drivingFlatbed && lootOnBed(record).length === 3) loadPrompt = HOME_WORDS.lootFull;
      else if (view.homeVehicle !== 'flatbed' && view.carPosition && record.loot.some(row => row.position !== 'bed' &&
        distance(view.carPosition, row.position) <= 4)) loadPrompt = HOME_WORDS.needsFlatbed;
      else if (view.homeVehicle !== 'flatbed' && view.carPosition && Object.keys(HOME_BUILDS).some(kind => {
        if (record.builds.some(row => row.kind === kind && row.stage > 0 && row.stage < 4)) return false;
        const location = record.loads[kind];
        const at = location === 'stack' ? HOME_LOAD_STACK : typeof location === 'object' ? groundPoint(location.i, location.j) : null;
        return at && distance(view.carPosition, at) <= 4;
      })) loadPrompt = HOME_WORDS.needsFlatbed;
    }
    next.loadKg = homeLoadKg(record);
    next.flatbedOuting = view.homeVehicle === 'flatbed';

    let drillPrompt = '';
    if (view.homeVehicle === 'drill' && view.carPosition) {
      const result = stepHomeRig(state, next, record, view, context.seed, now, dt, events);
      record = result.record; drillPrompt = result.prompt;
    } else { next.drillRig = null; next.drilling = false; }

    const gate = gateOf(record);
    const gateMiddle = gate && pieceInLand(gate);
    next.gateOpen = !!gateMiddle && !!where && Math.hypot(where.x - gateMiddle.x, where.z - gateMiddle.z) < GATE_OPENS;
    const ladder = fighter && !fighter.knockedDown ? towerAtLadder(record, fighter.position) : null;
    next.ladderAvailable = !!ladder;
    next.tower = fighter && !fighter.knockedDown ? stepHomeTower(state.tower, ladder, pressed('interact'), dt) : null;
    if (next.tower && next.tower.direction !== state.tower?.direction && next.tower.direction !== 0) events.push(cue(HOME_CUES.towerClimb));
    const near = !!fighter && !next.tower && outsideBy(fighter.position.x, fighter.position.z) < BUILD_NEAR;
    record = {...record, raids: {...record.raids, played: record.raids.played + Math.max(0, dt)}};
    const dusk = state.lastDay !== null && state.lastDay !== 'dusk' && view.partOfDay === 'dusk';
    next.lastDay = view.partOfDay ?? state.lastDay;
    const due = dusk && !next.raid && homeRaidDue(record);
    if (due && where && outsideBy(where.x, where.z) <= HOME_RAID.near && !context.leave) {
      next.raid = startHomeRaid(record, context.seed, due === 'test', view.difficulty);
      // A quit cannot restore an overdue deadline and demand the same raid on reopening.
      if (due === 'real') record = {...record, raids: {...record.raids,
        nextDue: record.raids.played + raidInterval(context.seed, record.raids.won + record.raids.lost)}};
      const crewHere = record.builds.some(row => row.stage === 4);
      requests.push(say('raid-call', crewHere ? HOME_WORDS.raidWren : HOME_WORDS.raidCall));
      events.push(cue(HOME_CUES.raidCall), cue(HOME_CUES.raidBike));
    }
    if (next.raid) {
      const stepped = stepHomeRaid(record, next.raid, {...view, gateOpen: next.gateOpen, leaving: !!context.leave}, dt, context.seed);
      record = stepped.home; next.raid = stepped.raid;
      events.push(...stepped.events);
      if (stepped.news) {
        next.opened = {...next.opened, raid: stepped.news};
        requests.push(say('raid-result', stepped.news));
        next.raid = null;
      }
    }
    // The marker that led him here goes once he stands on his ground.
    if (state.marked && where && outsideBy(where.x, where.z) === 0) {
      requests.push({type: 'marker', place: null});
      next.marked = false;
    }

    // ---- Moss and the hens ------------------------------------------------------------------------------------------
    for (const event of view.jobEvents ?? []) {
      if (event.scene !== MOSS_HENS_ID) continue;
      if (event.type === 'talkChoice' && event.id === 'take' && hensWaiting(record)) {
        catchUp();
        record = giveHens(record);
        choices.push(choice('hens', record));
        events.push(cue(HOME_CUES.crateOpen), cue(HOME_CUES.cluck));
        const inside = gateMiddle ? {x: gateMiddle.x + (groundCentre().x - gateMiddle.x) * .15, z: gateMiddle.z + (groundCentre().z - gateMiddle.z) * .15}
          : groundCentre();
        next.flock = startFlock(record.hens, inside);
        Object.assign(next, {naming: true, namingHen: 0, namingKey: 'hen-0', namingChain: true});
      }
      if (['openTalkClosed', 'openTalkSkipped'].includes(event.type)) next.crateTalk = false;
    }
    if (record.hens.length && next.flock.length !== record.hens.length) next.flock = startFlock(record.hens, groundCentre());
    if (next.flock.length) {
      const walked = stepFlock(next.flock, next.flockSeed, record, dt, events, now - next.ripenedAt, view.partOfDay);
      next.flock = walked.flock; next.flockSeed = walked.seed;
    }

    // ---- Names: the ground's, typed in the box, or a hen's. ---------------------------------------------------------
    if (state.naming && view.homeName) {
      const typed = view.homeName.name;
      if (state.namingHen !== null && state.namingHen !== undefined) {
        const named = typeof typed === 'string' ? nameHen(record, state.namingHen, typed) : record;
        if (named !== record) { catchUp(); record = nameHen(record, state.namingHen, typed); choices.push(choice('hen-name', record)); }
        const more = state.namingChain && state.namingHen + 1 < record.hens.length;
        Object.assign(next, more ? {naming: true, namingHen: state.namingHen + 1, namingKey: 'hen-' + (state.namingHen + 1)}
          : {naming: false, namingHen: null, namingKey: '', namingChain: false});
      } else {
        const name = cleanHomeName(typed);
        if (name && name !== record.name) { record = {...record, name}; choices.push(choice('name', record)); }
        Object.assign(next, {naming: false, namingKey: ''});
      }
    }

    // ---- What stands near him: the two boards, the crate, a box, a hen. ---------------------------------------------
    const board = boardSpot(gate), news = newsBoardSpot(gate);
    const atBoard = !!fighter && !!board && distance(fighter.position, board) <= BOARD_REACH;
    const crate = hensWaiting(record) ? crateSpot(gate) : null;
    const atCrate = !!fighter && !!crate && distance(fighter.position, crate) <= CRATE_REACH;
    const faced = fighter && near ? facedThing(record, fighter.position, fighter.yaw) : null;
    const facedBox = faced?.kind === 'box' ? faced : null;
    const atNews = !!fighter && !!news && !atBoard && !atCrate && !facedBox && distance(fighter.position, news) <= BOARD_NEAR;
    const buildingAt = fighter && near ? nearBuild(record, fighter.position, fighter.yaw) : null;
    const hen = fighter && near ? (next.flock.map((row, index) => ({index, far: distance(row, fighter.position),
      angle: Math.abs(Math.atan2(Math.sin(Math.atan2(row.x - fighter.position.x, row.z - fighter.position.z) - fighter.yaw),
        Math.cos(Math.atan2(row.x - fighter.position.x, row.z - fighter.position.z) - fighter.yaw)))}))
      .filter(row => row.far <= HEN_LOOK && row.angle <= .5).sort((a, b) => a.far - b.far)[0] ?? null) : null;

    const offer = crewOffer(record);
    const collect = cartersOffer(record);
    const newsPrompt = collect ? HOME_WORDS.cartersOffer : offer ? words('crewHand', {piece: offer.kind}) :
      cartersBusy(record) ? HOME_WORDS.cartersBusy : record.crew.job ? words('crewBusy', {piece: record.crew.job.kind}) : HOME_WORDS.boardHint;
    let note = '';
    if (fighter && !next.naming && !next.tower && !state.tower && !ladder && pressed('interact')) {
      if (atNews) {
        if (collect) {
          catchUp(); record = sendCarters(record, record.lastSeen);
          choices.push(choice('carters-go', record)); events.push(cue(HOME_CUES.cartersGo));
        } else if (offer) {
          catchUp(); record = handToCrew(record, offer, record.lastSeen);
          choices.push(choice('crew-hand', record)); events.push(cue(HOME_CUES.crewArrive));
        }
        next.board = {lines: boardLines(next.opened, record), until: now + BOARD_SECONDS};
        events.push(cue(HOME_CUES.boardRead));
      } else if (atBoard) Object.assign(next, {naming: true, namingHen: null, namingKey: 'ground'});
      else if (atCrate && !state.crateTalk) {
        next.crateTalk = true;
        requests.push({type: 'talk', id: MOSS_HENS_ID, scene: MOSS_TALK, person: 'moss', speaker: 'moss', asked: [],
          threadPriority: true, position: {x: crate.x, y: scablandsSurfaceHeightAt(crate.x, crate.z), z: crate.z}, anchorPosition: true});
      } else if (buildingAt?.stage === 4 && buildingAt.kind !== 'tower' &&
          (['coop', 'tank'].includes(buildingAt.kind) || distance(fighter.position, buildingDoor(buildingAt)) <= BOARD_REACH)) {
        catchUp();
        if (buildingAt.kind === 'coop') {
          const before = record.eggs;
          record = gatherCoop(record);
          choices.push(choice('coop-gather', record));
          if (record.eggs > before) events.push(cue(HOME_CUES.gather));
          const gathered = record.eggs - before;
          note = words(gathered === 1 ? 'gatheredOne' : 'gathered', {count: gathered, store: record.eggs});
        } else if (buildingAt.kind === 'tank') {
          note = tankWords(record, record.builds.find(row => matchesBuild(row, buildingAt)));
          choices.push(choice('tank-read', record));
        } else { note = shedWords(record); events.push(cue(HOME_CUES.shedDoor)); choices.push(choice('shed-read', record)); }
        requests.push(say('building', note));
      } else if (facedBox && facedBox.box.eggs > 0) {
        catchUp();
        const gathered = record.boxes[facedBox.index].eggs;
        record = gatherBox(record, facedBox.index);
        choices.push(choice('gather', record));
        events.push(cue(HOME_CUES.gather));
        note = gathered === 1 ? words('gatheredOne', {store: record.eggs}) : words('gathered', {count: gathered, store: record.eggs});
        requests.push(say('gathered', note));
      } else if (hen && near) Object.assign(next, {naming: true, namingHen: hen.index, namingKey: 'hen-' + hen.index, namingChain: false});
    }
    // ---- Building -----------------------------------------------------------------------------------------------
    // The launcher is lowered on his ground; the fire key takes it back, and B puts the hammer back in his hands.
    // On or near his ground (as far out as its sentences show) the launcher is lowered and the car-aim words hidden.
    next.onGround = !!fighter && outsideBy(fighter.position.x, fighter.position.z) < PROMPT_NEAR;
    if (!next.onGround) next.armed = false;
    else if (pressed('fire')) Object.assign(next, {armed: true, building: false});
    if (!near) next.building = false;
    // B shows the outline and starts the hammering; R and G, which change what he holds, show it too.
    if (near && (pressed('build') || pressed('turn') || pressed('piece')) && !next.naming) Object.assign(next, {building: true, armed: false, board: null});
    const touched = held.build || pressed('turn') || pressed('piece') || pressed('view');
    next.idle = touched ? 0 : (state.idle ?? 0) + dt;
    if (!near || next.idle >= BUILD_IDLE_SECONDS) next.building = false;

    if (!near || next.naming) {
      if (state.above) events.push(cue(HOME_CUES.viewDown));
      Object.assign(next, {above: false, hammer: null, outline: null, building: next.naming && near ? next.building : false});
      next.prompt = next.naming ? '' : atNews ? newsPrompt : atBoard ? HOME_WORDS.renameHint :
        atCrate ? HOME_WORDS.crateWaiting : drillPrompt || loadPrompt;
    } else {
      if (pressed('piece')) next.kind = nextKind(state.kind, record);
      if (pressed('turn')) next.turns = (state.turns + 1) % 4;
      if (pressed('view')) {
        next.above = !state.above;
        events.push(cue(next.above ? HOME_CUES.viewUp : HOME_CUES.viewDown));
        next.hammer = null;
        if (next.above) {
          const ahead = {x: fighter.position.x + Math.sin(fighter.yaw) * HOME_REACH, z: fighter.position.z + Math.cos(fighter.yaw) * HOME_REACH};
          const {a, b} = toGrid(ahead.x, ahead.z);
          next.cursor = {a: Math.max(0, Math.min(HOME_CELLS, a)), b: Math.max(0, Math.min(HOME_CELLS, b))};
        }
      }
      // A piece he no longer carries cannot be in his hands.
      if (next.kind === 'gate' && !gatesLeft(record)) next.kind = 'panel';
      if (next.kind === 'box' && cratesLeft(record) <= 0) next.kind = 'panel';
      const kind = next.kind;
      const atWell = !next.above && record.well && distance(fighter.position, wellInLand(record.well)) <= 2.5;
      if (kind === 'well' || (atWell && !pressed('piece') && !HOME_BUILDS[kind])) {
        const changed = stepWell({state, next, record, fighter, keys, pressed, dt, events, seed: context.seed, catchUp,
          getRecord: () => record});
        if (changed !== record) { record = changed; choices.push(choice('well', record)); }
      } else if (HOME_BUILDS[kind] || (buildingAt && !next.above && !pressed('piece'))) {
        stepBuilding({state, next, record, fighter, keys, pressed, dt, events, choices, catchUp,
          getRecord: () => record, setRecord: value => { record = value; }, buildingAt, note});
      } else if (next.above) {
        // From above, W is north and D is east, as on the map. The outline is marked, not built. Nest boxes are set
        // down on the ground, so from above the outline is a panel's.
        const markKind = kind === 'box' ? 'panel' : kind;
        const step = HOME_CURSOR_SPEED / HOME_STEP * dt;
        const east = (keys.turnRight || keys.right ? 1 : 0) - (keys.turnLeft || keys.left ? 1 : 0);
        const south = (keys.back ? 1 : 0) - (keys.forward ? 1 : 0);
        const cursor = {a: Math.max(0, Math.min(HOME_CELLS, next.cursor.a + east * step)),
          b: Math.max(0, Math.min(HOME_CELLS, next.cursor.b + south * step))};
        next.cursor = cursor;
        const piece = slotAt(markKind, cursor.a, cursor.b, next.turns % 2 ? 'z' : 'x');
        const outline = outlineFor(record, piece);
        const marked = !!markAt(record, piece);
        // A mark may go wherever the piece could be built once he has it in hand; it can always be cleared.
        const reason = outline.mode === 'lift' ? 'aboveBuilt' : MARK_ANYWAY.includes(outline.reason) ? null : outline.reason;
        let shake = false;
        if (pressed('build')) {
          if (reason && !marked) { events.push(cue(HOME_CUES.refused)); shake = true; }
          else {
            record = toggleMark(record, piece);
            choices.push(choice('mark', record));
            events.push(cue(marked ? HOME_CUES.unmark : HOME_CUES.mark));
          }
        }
        const nowMarked = !!markAt(record, piece);
        next.outline = {...outline, mode: reason && !nowMarked ? 'refused' : 'build', reason, marked: nowMarked, progress: 0, shake};
        next.prompt = nowMarked ? HOME_WORDS.aboveClear : reason ? HOME_WORDS[reason] : HOME_WORDS.aboveHelp;
      } else {
        // On the ground. A piece or nest box he faces within reach is offered to be picked up, whether or not he is
        // building. Otherwise, once he has pressed B, the outline stands in front of him, or on a mark of his there.
        let outline = null, piece = null;
        if (faced?.kind === 'piece') {
          piece = faced.piece;
          outline = {mode: 'lift', piece, target: faced.piece, marked: false};
        } else if (facedBox) {
          piece = {kind: 'box', i: facedBox.box.i, j: facedBox.box.j};
          outline = {mode: 'lift', piece, target: piece, boxIndex: facedBox.index, marked: false};
        } else if (next.building && kind === 'box') {
          piece = boxSlotInFront(fighter.position, fighter.yaw);
          const reason = boxRefusal(record, piece);
          outline = reason ? {mode: 'refused', reason, piece, marked: false} : {mode: 'build', piece, marked: false};
        } else if (next.building) {
          piece = slotInFront(kind, fighter.position, fighter.yaw, next.turns);
          const ahead = {x: fighter.position.x + Math.sin(fighter.yaw) * HOME_REACH, z: fighter.position.z + Math.cos(fighter.yaw) * HOME_REACH};
          const mark = record.marks.filter(row => row.kind === kind).map(row => ({row, at: pieceInLand(row)}))
            .map(({row, at}) => ({row, distance: Math.hypot(at.x - ahead.x, at.z - ahead.z)}))
            .filter(({distance: far}) => far <= HOME_REACH).sort((a, b) => a.distance - b.distance)[0];
          if (mark) piece = mark.row;
          outline = outlineFor(record, piece);
        }
        const slotKey = JSON.stringify(piece);
        let hammer = state.hammer?.slotKey === slotKey && keys.build ? state.hammer : null;
        let shake = false;
        if (outline?.mode === 'lift' && pressed('build')) {
          if (outline.target.kind === 'box') {
            catchUp();
            const gathered = record.boxes[outline.boxIndex].eggs;
            record = liftBox(record, outline.boxIndex);
            next.kind = 'box';
            if (gathered) {
              events.push(cue(HOME_CUES.gather));
              requests.push(say('gathered', gathered === 1 ? words('gatheredOne', {store: record.eggs}) : words('gathered', {count: gathered, store: record.eggs})));
            }
          } else if (outline.target.down) {
            record = standPanel(record, outline.target);
            events.push(cue(HOME_CUES.fenceUp));
          } else {
            record = lift(record, outline.target);
            if (outline.target.kind === 'gate') next.kind = 'gate';
          }
          choices.push(choice('lift', record));
          if (!outline.target.down) events.push(cue(HOME_CUES.lift));
          hammer = null;
          next.building = true;
        } else if (outline?.mode === 'refused' && pressed('build')) {
          events.push(cue(HOME_CUES.refused));
          shake = true;
        } else if (outline?.mode === 'build' && keys.build) {
          const seconds = (hammer?.seconds ?? 0) + dt;
          const strikes = Math.floor(seconds / HAMMER_STRIKE_SECONDS);
          if (!hammer || strikes > hammer.strikes) events.push(cue(HOME_CUES.hammer));
          hammer = {slotKey, seconds, strikes};
          const needs = kind === 'box' ? HOME_BOX.hammer : HOME_PIECES[kind].hammer;
          if (seconds >= needs) {
            if (kind === 'box') {
              catchUp();
              record = buildBox(record, piece);
              events.push(cue(HOME_CUES.boxUp));
              if (cratesLeft(record) <= 0) next.kind = 'panel';
            } else {
              record = build(record, piece);
              events.push(cue(HOME_PIECES[kind].upCue));
            }
            choices.push(choice('build', record));
            hammer = null;
            if (kind === 'gate') {
              next.kind = 'panel';
              if (record.name === defaultHomeName(view.playerName)) Object.assign(next, {naming: true, namingHen: null, namingKey: 'ground'});
            }
          }
        }
        next.hammer = hammer;
        const needs = kind === 'box' ? HOME_BOX.hammer : HOME_PIECES[kind].hammer;
        const progress = hammer ? Math.min(1, hammer.seconds / needs) : 0;
        // The lift outline is drawn only while he builds; the sentence offers it at any time.
        next.outline = outline && (next.building || outline.mode !== 'lift') ? {...outline, progress, shake} : null;
        const nameOf = target => target.kind === 'box' ? HOME_BOX.name : HOME_PIECES[target.kind].name;
        const carried = kind === 'panel' ? ' ' + words(panelsLeft(record) === 1 ? 'panelLeft' : 'panelsLeft', {count: panelsLeft(record)}) :
          kind === 'box' ? ' ' + words(cratesLeft(record) === 1 ? 'crateLeft' : 'cratesLeft', {count: cratesLeft(record)}) : ' ' + HOME_WORDS.viewHint;
        next.prompt = note ? note :
          atNews ? newsPrompt : atBoard ? HOME_WORDS.renameHint : atCrate ? HOME_WORDS.crateWaiting :
          facedBox ? (facedBox.box.eggs > 1 ? words('gather', {count: record.boxes[facedBox.index]?.eggs ?? 0}) :
            facedBox.box.eggs === 1 ? HOME_WORDS.gatherOne : HOME_WORDS.emptyBox) :
          outline?.mode === 'lift' ? outline.target.down ? HOME_WORDS.fenceUp : words('lift', {piece: nameOf(outline.target)}) :
          outline?.mode === 'refused' ? HOME_WORDS[outline.reason] :
          hammer ? HOME_WORDS.hammering :
          outline ? (kind === 'box' ? HOME_WORDS.holdBox : words(outline.marked ? 'holdMark' : 'hold', {piece: nameOf(piece)})) + carried :
          hen ? words('henSeen', {hen: record.hens[hen.index].name}) :
          record.hens.length && !record.boxes.length ? HOME_WORDS.firstBox : HOME_WORDS.startBuild;
      }
    }
    // The news board keeps its full six-metre reach even when he stands beside a building.
    if (atNews && !next.naming && !next.above) next.prompt = newsPrompt;
    for (const event of view.jobEvents ?? []) {
      if (event.scene === HOME_CREW_TALK.id && ['openTalkClosed', 'openTalkSkipped'].includes(event.type)) {
        next.crewTalk = false;
        next.crewLesson = null;
      }
    }
    if (home.crew?.job && !record.crew.job && !next.opened.finished) {
      next.opened = {...next.opened, finished: record.builds.find(row => matchesBuild(row, home.crew.job))};
      events.push(cue(HOME_CUES.crewDone));
    }
    const taught = record.builds.find(row => row.stage === 4 &&
      home.builds?.some(old => matchesBuild(old, row) && old.stage < 4) &&
      !home.builds.some(old => old.kind === row.kind && old.stage === 4));
    if (taught && fighter) {
      next.crewTalk = true;
      // He can finish from anywhere along the front. Wren stands beside him, within talk range,
      // rather than at a distant door that would close the talk as soon as it opens.
      const at = buildInLand(taught), dx = at.x - fighter.position.x, dz = at.z - fighter.position.z;
      const far = Math.hypot(dx, dz) || 1;
      const position = {x: fighter.position.x + dx / far * 1.2, z: fighter.position.z + dz / far * 1.2};
      next.crewLesson = {row: taught, position, yaw: Math.atan2(-dx, -dz)};
      requests.push({type: 'talk', id: HOME_CREW_TALK.id, scene: HOME_CREW_TALK, person: 'wren', speaker: 'wren',
        asked: [], threadPriority: true, anchorPosition: true,
        position: {...position, y: scablandsSurfaceHeightAt(position.x, position.z)}});
    }
    const crewKey = JSON.stringify(record.crew.job);
    next.crewWalk = crewKey === state.crewKey ? state.crewWalk + dt : next.opened.away > 0 && record.crew.done > 0 ? 1000 : 0;
    next.crewKey = crewKey;
    next.crewPeople = crewPlaces(record, next.crewWalk, next.crewLesson);
    next.gateOpen ||= !!gateMiddle && next.crewPeople.some(person => distance(person, gateMiddle) < GATE_OPENS);
    // He holds a hammer while he builds, a wrench for the gate's hinges; the strike is how far through a blow he is.
    const building = near && next.building && !next.above && !next.naming;
    next.tool = building ? (next.kind === 'gate' ? 'wrench' : 'hammer') : null;
    // Where he stands and faces, for his mark in the view from above.
    next.standing = fighter ? {x: fighter.position.x, z: fighter.position.z, yaw: fighter.yaw} : null;
    next.strike = building && next.hammer ? (next.hammer.seconds % HAMMER_STRIKE_SECONDS) / HAMMER_STRIKE_SECONDS : null;
    if (next.tower) {
      Object.assign(next, {tool: null, strike: null, building: false, armed: true, above: false, outline: null,
        prompt: next.tower.progress === 1 ? HOME_WORDS.towerDown : HOME_WORDS.towerClimbing});
    } else if (ladder && !next.naming && !next.building) next.prompt = HOME_WORDS.towerUp;

    // Read the board only beside it, down on foot. Refresh its news after gathering, laying or building this tick.
    const canReadBoard = fighter && news && !next.above && distance(fighter.position, news) <= BOARD_NEAR;
    if (canReadBoard && !next.boardShown && !next.building && !next.naming) {
      next.boardShown = true;
      next.board = {lines: [], until: now + BOARD_SECONDS};
      events.push(cue(HOME_CUES.boardRead));
    }
    if (next.board) next.board = canReadBoard && now <= next.board.until
      ? {...next.board, lines: boardLines(next.opened, record)} : null;

    // The fence, the gate and the nest boxes are solid; the gate's leaves only while it is shut.
    const solidsKey = JSON.stringify([record.pieces, record.boxes.map(box => [box.i, box.j]),
      record.builds.map(row => [row.kind, row.i, row.j, row.turn, row.stage]), record.well?.pump, next.gateOpen]);
    if (solidsKey !== state.solidsKey) {
      next.solidsKey = solidsKey;
      requests.push({type: 'solids', id: 'home-ground', solids: homeSolids(record, {gateOpen: next.gateOpen, heightAt: scablandsSurfaceHeightAt})});
    }
    // Keep all play seconds, even if this is the last tick before leaving. No wall time enters this counter.
    choices.push(choice('play-clock', record));
    return {state: next, events, requests, choices};
  },
};

// G changes what is in his hands: a panel, the gate while he carries it, an old crate while he has one.
function nextKind(kind, record) {
  const order = ['panel', 'gate', 'box', 'coop', 'shed', 'tower', 'well', 'tank'];
  const has = row => row === 'panel' || (row === 'gate' && gatesLeft(record) > 0) || (row === 'box' && cratesLeft(record) > 0) ||
    (['well', 'tank'].includes(row) ? canBorrowDrill(record) : !!HOME_BUILDS[row] && record.hens.length > 0 && record.boxes.length > 0);
  for (let n = 1; n <= order.length; n++) {
    const row = order[(order.indexOf(kind) + n) % order.length];
    if (has(row)) return row;
  }
  return 'panel';
}

function nearBuild(record, position, yaw) {
  const direction = {x: Math.sin(yaw), z: Math.cos(yaw)};
  return record.builds.map(row => {
    const b = buildBounds(row), lo = groundPoint(b.i0, b.j0), hi = groundPoint(b.i1, b.j1);
    if (row.stage === 4) return {row, far: Math.hypot(Math.max(lo.x - position.x, 0, position.x - hi.x),
      Math.max(lo.z - position.z, 0, position.z - hi.z)) <= 2 ? 0 : Infinity};
    let enter = 0, leave = 3.2;
    for (const axis of ['x', 'z']) {
      if (Math.abs(direction[axis]) < 1e-8) {
        if (position[axis] < lo[axis] || position[axis] > hi[axis]) return {row, far: Infinity};
      } else {
        const a = (lo[axis] - position[axis]) / direction[axis], c = (hi[axis] - position[axis]) / direction[axis];
        enter = Math.max(enter, Math.min(a, c)); leave = Math.min(leave, Math.max(a, c));
      }
    }
    return {row, far: enter <= leave ? enter : Infinity};
  }).filter(item => Number.isFinite(item.far)).sort((a, b) => a.far - b.far)[0]?.row ?? null;
}

// Their walk belongs to the outing, not the drawing. They enter by the gate and keep the machine lane clear.
function crewPlaces(record, walked, teaching) {
  const job = record.crew.job;
  const row = teaching?.row ?? (job ? record.builds.find(item => matchesBuild(item, job)) : null);
  if (!row) return [];
  const gate = gateOf(record), at = gate ? pieceInLand(gate) : groundCentre(), centre = groundCentre();
  // Cross perpendicular to the fence, along the middle of its lane, even for an off-centre gate.
  const dx = gate?.axis === 'z' ? Math.sign(centre.x - at.x) : 0;
  const dz = gate?.axis === 'x' ? Math.sign(centre.z - at.z) : 0;
  const door = buildingDoor(row);
  // For a gate on the far two sides, stay outside the square until its own approach.
  const corner = groundPoint(0, 0), farCorner = groundPoint(HOME_CELLS, HOME_CELLS);
  const around = dz < 0 ? [{x: farCorner.x + 4, z: farCorner.z + 4}] :
    dx > 0 ? [{x: corner.x - 4, z: corner.z - 4}] : [];
  const path = [HOME_LOAD_STACK, ...around, {x: at.x - dx * 4, z: at.z - dz * 4},
    {x: at.x + dx * 4, z: at.z + dz * 4}, door];
  return ['rook', 'wren'].map((id, index) => {
    if (teaching) return {id, x: teaching.position.x + (index ? 0 : Math.cos(teaching.yaw) * 1.2),
      z: teaching.position.z - (index ? 0 : Math.sin(teaching.yaw) * 1.2), yaw: teaching.yaw, working: false, walked: 0};
    let left = Math.max(0, walked * 2 - index * 1.5), position = path[0], yaw = 0;
    for (const target of path.slice(1)) {
      const x = target.x - position.x, z = target.z - position.z, far = Math.hypot(x, z);
      yaw = Math.atan2(x, z);
      if (left < far) { position = {x: position.x + x / far * left, z: position.z + z / far * left}; break; }
      left -= far; position = target;
    }
    const working = position === door;
    return {id, x: position.x + (working ? (index ? .8 : -.8) : 0), z: position.z,
      yaw: working ? row.turn * Math.PI / 2 + Math.PI : yaw, working, walked: walked * 2};
  });
}

function stepBuilding({state, next, record, fighter, keys, pressed, dt, events, choices, catchUp, getRecord, setRecord, buildingAt, note}) {
  const kind = !next.above && buildingAt ? buildingAt.kind : next.kind;
  let row = buildingAt?.kind === kind && !next.above ? buildingAt : null;
  let slot;
  if (next.above) {
    const step = HOME_CURSOR_SPEED / HOME_STEP * dt;
    next.cursor = {a: Math.max(0, Math.min(HOME_CELLS, next.cursor.a + ((keys.right || keys.turnRight ? 1 : 0) - (keys.left || keys.turnLeft ? 1 : 0)) * step)),
      b: Math.max(0, Math.min(HOME_CELLS, next.cursor.b + ((keys.back ? 1 : 0) - (keys.forward ? 1 : 0)) * step))};
    slot = {kind, i: Math.floor(next.cursor.a), j: Math.floor(next.cursor.b), turn: next.turns, stage: 0,
      ...(kind === 'tank' ? {litres: 0, filled: null} : {})};
    row = record.builds.find(item => item.kind === kind && item.i === slot.i && item.j === slot.j);
  } else slot = buildSlot(kind, fighter.position, fighter.yaw, next.turns);
  const reason = row ? null : buildRefusal(record, slot);
  let hammer = state.hammer?.slotKey === JSON.stringify(row) ? state.hammer : null;
  let changed = false;
  if (pressed('build')) {
    if (reason) events.push(cue(HOME_CUES.refused));
    else if (!row) { record = markBuild(record, slot); row = record.builds.find(item => matchesBuild(item, slot)); changed = true; events.push(cue(HOME_CUES.mark)); }
    else if (row.stage === 0 && (next.above || !buildHasLoad(record, row))) {
      record = liftBuild(record, row); row = null; changed = true; events.push(cue(HOME_CUES.unmark));
    }
  }
  if (!changed && row && row.stage < 4 && buildHasLoad(record, row) && !next.above) {
    if (keys.build) {
      const seconds = (hammer?.seconds ?? 0) + dt, strikes = Math.floor(seconds / HAMMER_STRIKE_SECONDS);
      if (!hammer || strikes > hammer.strikes) events.push(cue(HOME_CUES.hammer));
      hammer = {slotKey: JSON.stringify(row), seconds, strikes};
      if (seconds >= HOME_BUILDS[kind].hammer) {
        catchUp(); record = raiseBuild(getRecord(), row); changed = true;
        row = record.builds.find(item => matchesBuild(item, row)); hammer = null; events.push(cue(HOME_BUILDS[kind].cue));
      }
    } else {
      if (row.stage === 0 && hammer && hammer.seconds < .3) {
        record = liftBuild(record, row); row = null; changed = true; events.push(cue(HOME_CUES.unmark));
      }
      hammer = null;
    }
  } else hammer = null;
  if (changed) { setRecord(record); choices.push(choice('building', record)); }
  next.hammer = hammer;
  next.outline = next.building || next.above ? {piece: row ?? slot, mode: reason ? 'refused' : 'build', reason,
    progress: hammer ? hammer.seconds / HOME_BUILDS[kind].hammer : 0, marked: !!row, shake: !!reason && pressed('build')} : null;
  next.prompt = note || (reason ? HOME_WORDS[reason] : row?.stage === 4 ?
    (kind === 'tower' ? HOME_WORDS.towerUp : kind === 'tank' ? HOME_WORDS.tankRead : kind === 'coop' ? HOME_WORDS.gatherCoop : distance(fighter.position, buildingDoor(row)) <= BOARD_REACH ? HOME_WORDS.shedDoor : words('buildDone', {piece: kind})) :
    row ? next.above ? HOME_WORDS.buildLift : buildHasLoad(record, row) ? words('buildStage', {piece: kind, stage: (kind === 'tower' ? HOME_TOWER_STAGES : kind === 'tank' ? HOME_TANK_STAGES : HOME_STAGES)[row.stage]}) :
      words('buildLoad', {piece: kind}) + ' ' + HOME_WORDS.buildLift : words('buildMark', {piece: kind}));
}

function stepWell({state, next, record, fighter, keys, pressed, dt, events, seed, catchUp, getRecord}) {
  let cell;
  if (next.above) {
    const step = HOME_CURSOR_SPEED / HOME_STEP * dt;
    next.cursor = {a: Math.max(0, Math.min(HOME_CELLS - 1, next.cursor.a + ((keys.right || keys.turnRight ? 1 : 0) - (keys.left || keys.turnLeft ? 1 : 0)) * step)),
      b: Math.max(0, Math.min(HOME_CELLS - 1, next.cursor.b + ((keys.back ? 1 : 0) - (keys.forward ? 1 : 0)) * step))};
    cell = {i: Math.floor(next.cursor.a), j: Math.floor(next.cursor.b)};
  } else cell = boxSlotInFront(fighter.position, fighter.yaw);
  const atWell = record.well && (next.above ? cell.i === record.well.i && cell.j === record.well.j :
    distance(fighter.position, wellInLand(record.well)) <= 2.5);
  const well = atWell ? record.well : null, reason = well ? null : wellRefusal(record, cell);
  let hammer = keys.build && state.hammer?.slotKey === 'pump' && well && !next.above ? state.hammer : null;
  if (pressed('build') && !well) {
    if (reason) events.push(cue(HOME_CUES.refused));
    else { record = markWell(record, cell, seed); events.push(cue(HOME_CUES.mark)); }
  } else if (well?.depth === 0 && pressed('build')) {
    record = {...record, well: null}; events.push(cue(HOME_CUES.unmark));
  } else if (well && well.depth >= well.water && !well.pump && !next.above && keys.build) {
    const seconds = (hammer?.seconds ?? 0) + dt, strikes = Math.floor(seconds / HAMMER_STRIKE_SECONDS);
    if (!hammer || strikes > hammer.strikes) events.push(cue(HOME_CUES.hammer));
    hammer = {slotKey: 'pump', seconds, strikes};
    if (seconds >= HOME_WELL.pumpSeconds) {
      catchUp(); record = fitHomePump(getRecord()); hammer = null;
      events.push(cue(HOME_CUES.pumpFit));
    }
  } else hammer = null;
  next.hammer = hammer;
  const piece = {kind: 'well', ...(atWell ? record.well ?? cell : cell)};
  next.outline = next.building || next.above ? {piece, mode: reason ? 'refused' : 'build', reason,
    progress: hammer ? hammer.seconds / HOME_WELL.pumpSeconds : 0, marked: !!record.well, shake: !!reason && pressed('build')} : null;
  next.prompt = reason ? HOME_WORDS[reason] : !well ? HOME_WORDS.wellMark : record.well?.pump ? HOME_WORDS.pumpReady :
    well.depth >= well.water ? words('pumpFit', {depth: Math.round(well.water)}) :
    well.depth > 0 ? words('wellDepth', {depth: Math.floor(well.depth)}) : HOME_WORDS.wellBring + ' ' + HOME_WORDS.wellLift;
  return record;
}

function stepHomeRig(state, next, record, view, seed, now, dt, events) {
  const keys = view.homeDrillKeys ?? {}, driving = !view.onFoot;
  let rig = state.drillRig ?? createDrillRigState(seed, {...view.carPosition, heading: view.homeCarHeading ?? 0});
  const before = {...rig.machine, ...view.carPosition, heading: view.homeCarHeading ?? rig.machine.heading};
  const atMark = record.well && distance(before, wellInLand(record.well)) <= HOME_WELL.reach;
  const stopped = Math.abs(before.speedMps) < .01;
  if (!driving || !atMark || record.well?.pump) next.drilling = false;
  if (driving && keys.KeyB) {
    if (next.drilling) next.drilling = false;
    else if (atMark && stopped && !record.well.pump) { next.drilling = true; events.push(cue(HOME_CUES.drillLower)); }
    else events.push(cue(HOME_CUES.refused));
  }
  const controls = drillYardControls(driving ? keys : {}, next.drilling ? 'work' : 'drive');
  // Movement and cutting share the yard rig, but only the marked home hole can receive work.
  rig = stepDrillRig({...rig, machine: before}, {...controls, mastDown: false, feed: 0}, dt).state;
  const after = rig.machine;
  const solids = view.peopleGrid?.near(before.x, before.z, after.x, after.z, 8) ?? [];
  const steep = stepMover(before, after, {solids: false}).blocked;
  if (!driving || steep || machineMoveContact('drill', before, after, solids))
    rig = {...rig, machine: {...before, speedMps: 0}};
  const cut = drillHomeWell(record, seed, {...controls, mastDown: next.drilling && stopped}, dt, state.drillRig?.hole);
  next.drillRig = {...rig, hole: cut.hole};
  for (const event of cut.events) {
    if (event.type === 'water-struck') events.push(cue(HOME_CUES.drillWater));
    else if (event.type === 'drill-jammed') events.push(cue(HOME_CUES.drillJam));
    else if (event.type === 'drill-cuttings' && now >= (state.drillSoundAt ?? 0)) {
      events.push(cue(event.material === 'rock' ? HOME_CUES.drillRock : HOME_CUES.drillGrind));
      next.drillSoundAt = now + .3;
    }
  }
  const hole = cut.hole;
  const prompt = !driving ? '' : !atMark || !stopped && !next.drilling ? HOME_WORDS.drillPark :
    !next.drilling ? HOME_WORDS.drillLower : hole?.struckWater ? words('drillWater', {depth: Math.round(record.well.water)}) :
    hole?.jammed ? HOME_WORDS.drillJam : words('drillFeed', {material: drillMaterialAt(hole.site, hole.depth), depth: Math.floor(hole.depth)});
  return {record: cut.home, prompt};
}
