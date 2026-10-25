// H2 Fire during a helicopter visit (docs/HELI_FIRE.md sections 3, 4, 7 and
// 9): the mission engine's call, the fire's clock, water landing on it, out
// and lost, and what the board and instruments read. Game rules only, no
// graphics; heli-session.js drives it and owns the bucket on its cable.
// Every save change goes through heli-save.js; the fire and mission records
// stay the save's own shape, so a reload carries on where it stopped.
import {armed, armMissions, noteRefuel, runEngine, callDue, callTime, openCall, answerCall, endMission, inQuietSpell,
  createCallClock, tickCallClock, MISSION_RULES, seasonOf, callOf, rescueOf, isRescueKind, noteCallFlight, takeCall,
  beginRescue} from './heli-missions.js';
import {FIRE, BURNT_LOOKS, fireGrid, courseBurnCheck, startCells, startFire, dayWind, applyWater, fireOut, shareOut,
  hottestEdge, cellIJ, runFireEngine, fireNewDay, cruiseSeconds} from './heli-fire.js';
import {heliOf, missionsOf, fireOf, setMissions, setFire, putOutFire, loseFire, hearBurnNews, BURN_NEWS, addScar,
  MISSION_KINDS} from './heli-save.js';
import {HELI_DESTINATIONS} from './heli-jobs.js';
import {courseClosed, burnStage} from '../course-closures.js';

// The regrowth stage each piece of Sarah's news belongs to (section 8.4).
const NEWS_FOR_STAGE = Object.freeze({black: 'reopen', shoots: 'shoots', fireweed: 'fireweed'});

// Engine time is saved in whole chunks, so the save's tenths never stall it.
const FLUSH_SECONDS = 10;

// The courses a fire can start on now (section 3.4): can burn, owned, open,
// not regrowing, not already burning.
export function burnableCourses(profile, worlds, {enabled, owns = () => true} = {}) {
  const on = {enabled}, fire = fireOf(profile);
  // Only a course with its burnt look made is loaded and checked.
  return Object.keys(HELI_DESTINATIONS).filter(id => BURNT_LOOKS.includes(id)).filter(id => {
    const world = worlds(id);
    if (!world || !courseBurnCheck(world.course, world.ground, world.grid).ok) return false;
    return owns(id) && !courseClosed(profile, id, undefined, on) && !burnStage(profile, id, undefined, on) && fire?.courseId !== id;
  }).sort();
}

// A new play day with a fire burning: its three day steps, with that day's
// wind, and the course lost if it grows too big. Used at a helicopter visit
// and when a player's profile becomes active (app.js). In winter the first
// snow puts it out instead (section 3.6): no pay, no loss, its burnt cells
// left as a scar, and the mission ends with its quiet spell.
export function fireOnNewDay(profile, {enabled, world}) {
  const fire = fireOf(profile);
  if (enabled !== true || !fire) return {profile, steps: 0, lost: false, snowed: false};
  if (seasonOf(heliOf(profile).playDay.count).name === 'winter') return snowOut(profile, fire, {enabled});
  if (!world) return {profile, steps: 0, lost: false, snowed: false};
  const wind = dayWind(missionsOf(profile).seed, heliOf(profile).playDay.count);
  const run = fireNewDay(fire, world.grid, wind);
  let next = setFire(profile, run.fire, {enabled}).profile;
  if (run.lost) next = finishLost(next, fire.id, {enabled});
  return {profile: next, steps: run.steps, lost: run.lost, snowed: false};
}

function snowOut(profile, fire, {enabled}) {
  const day = heliOf(profile).playDay.count;
  const cells = [...fire.burnt, ...fire.burning.map(([cell]) => cell)];
  let next = addScar(profile, fire.courseId, day, cells, {enabled}).profile;
  next = setFire(next, null, {enabled}).profile;
  next = setMissions(next, endMission(missionsOf(next), {playDay: day}), {enabled}).profile;
  return {profile: next, steps: 0, lost: false, snowed: true, courseId: fire.courseId};
}

// Roger's season lines, at the first lift-off of a visit in a season's first
// two play days. Winter's speaks of avalanches, so it waits for that kind.
const SEASON_LINES = Object.freeze({summer: 'heli.radio.season.summer', winter: 'heli.radio.season.winter'});
const seasonLine = (season, rescue = false) => season.day <= 2 && (season.name !== 'winter' || rescue || MISSION_KINDS.includes('avalanche'))
  ? SEASON_LINES[season.name] ?? null : null;

// Roger's and Sarah's words for a rescue call and for taking it (HELI_RESCUE section 8).
const CALL_LINES = Object.freeze({hiker: 'heli.radio.hiker.call', avalanche: 'heli.radio.avalanche.call',
  hoist: 'heli.radio.hoist.call', supply: 'heli.radio.supply.call'});
const ANSWER_LINES = Object.freeze({hiker: 'heli.radio.hiker.answer', avalanche: 'heli.radio.rescue.answer',
  hoist: 'heli.radio.rescue.answer', supply: 'heli.radio.supply.answer'});

function finishLost(profile, fireId, {enabled}) {
  const lost = loseFire(profile, fireId, {enabled});
  if (!lost.ok) return profile;
  const day = heliOf(lost.profile).playDay.count;
  return setMissions(lost.profile, endMission(missionsOf(lost.profile), {playDay: day}), {enabled}).profile;
}

const WIND_LINES = Object.freeze({calm: 'heli.radio.wind.calm', breeze: 'heli.radio.wind.breeze', windy: 'heli.radio.wind.strong'});

// options: getSave() -> profile, commit(result) -> result, emit(event),
// world(courseId) -> {course, ground, site, grid}, playerName, today,
// owns(courseId). H4 Rescue (docs/HELI_RESCUE.md section 3): with `rescue`
// true the same engine also rings the rescue kinds, from the courses
// rescueCourses() gives; with it false nothing here reads or offers a rescue
// kind, and a stored rescue call never blocks a fire call (callOf).
export function createFireRun({getSave, commit, emit, world, playerName = 'Player', today = null, owns = () => true,
  rescue = false, rescueCourses = null}) {
  const flag = {enabled: true};
  const rescueFlag = {rescue: rescue === true && typeof rescueCourses === 'function'};
  let clock = null, answerLeft = 0, engineBank = 0, halfSaid = null, lastFireDay = null, fullSaid = false, firstFill = true;
  let seasonSaid = false;
  { const burning = fireOf(getSave()); if (burning && shareOut(burning) >= 50) halfSaid = burning.id; }
  // Brian's bucket lines are for a new firefighter: only until the first fire is out.
  const newFirefighter = () => missionsOf(getSave()).firesOut === 0;
  const day = () => heliOf(getSave()).playDay.count;
  const missions = () => missionsOf(getSave());
  const fire = () => fireOf(getSave());
  const radio = line => emit({type: 'radio', line});
  const cue = id => emit({type: 'cue', id});
  // Saved only when the record really changed.
  const saveMissions = (next, before = missions()) => next === before ? {ok: true, profile: getSave()} : commit(setMissions(getSave(), next, flag));
  // Every read of the call goes through the engine's callOf (the switch decides what is seen).
  const callNow = () => callOf(missions(), rescueFlag);
  const conditions = () => ({fire: burnableCourses(getSave(), world, {enabled: true, owns}), ...(rescueFlag.rescue ? rescueCourses() : {})});
  const windToday = () => dayWind(missions().seed, day());

  // The engine arms once lesson 4 (carry and set down) is done.
  function arm() {
    if (armed(missions()) || !heliOf(getSave()).lessons.carry) return;
    saveMissions(armMissions(missions(), {date: today ?? '2026-01-01', playerName}));
  }

  function fireLost(id, courseId) {
    commit({ok: true, profile: finishLost(getSave(), id, flag)});
    clock = null; answerLeft = 0;
    radio('heli.radio.fire.lost');
    emit({type: 'fireLost', courseId});
  }

  // Engine seconds: the quiet spell and the fire's clock, saved every 10 s.
  function flush() {
    if (engineBank <= 0) return;
    const seconds = engineBank;
    engineBank = 0;
    const quiet = missions();
    saveMissions(runEngine(quiet, seconds), quiet);
    const burning = fire();
    if (!burning) return;
    const run = runFireEngine(burning, world(burning.courseId).grid, seconds, windToday());
    commit(setFire(getSave(), run.fire, flag));
    if (run.steps) emit({type: 'fireSpread', steps: run.steps, cells: run.fire.burning.length});
    if (run.lost) fireLost(burning.id, burning.courseId);
  }

  function ring() {
    const opened = openCall(missions(), {playDay: day(), conditions: conditions(), fireOpen: !!fire(), ...rescueFlag});
    if (!opened.call) return;
    if (isRescueKind(opened.call.kind)) {
      // A rescue call: no fire to start; the call waits for R (or goes to another crew).
      saveMissions(opened.missions);
      answerLeft = MISSION_RULES.answerSeconds;
      cue('heli.fire.alert');
      radio(CALL_LINES[opened.call.kind]);
      emit({type: 'rescueCall', kind: opened.call.kind, courseId: opened.call.courseId, answerSeconds: answerLeft});
      return;
    }
    const place = world(opened.call.courseId);
    const started = startFire({id: opened.call.id, courseId: opened.call.courseId, grid: place.grid, seed: opened.seed,
      startDay: day(), candidates: startCells(place.course, place.ground, place.grid, heliOf(getSave()).scars ?? [])});
    if (!started) return;
    saveMissions(opened.missions);
    commit(setFire(getSave(), started, flag));
    answerLeft = MISSION_RULES.answerSeconds;
    halfSaid = null;
    cue('heli.fire.alert');
    radio('heli.radio.fire.call');
    emit({type: 'fireCall', courseId: started.courseId, answerSeconds: answerLeft});
  }

  // The first visit of a regrowth stage: Sarah says so, once. A course
  // whose news came days late hears only its latest stage. One line a visit.
  function burnNews() {
    for (const courseId of Object.keys(heliOf(getSave()).burnt ?? {}).sort()) {
      const news = NEWS_FOR_STAGE[burnStage(getSave(), courseId, day(), flag)];
      const heard = heliOf(getSave()).burnt[courseId].heard;
      if (!news || BURN_NEWS.indexOf(news) <= BURN_NEWS.indexOf(heard)) continue;
      commit(hearBurnNews(getSave(), courseId, news, flag));
      radio(`heli.radio.burn.${news}`);
      emit({type: 'burnNews', courseId, news});
      return;
    }
  }

  // A waiting rescue call another crew has taken (section 3.3): Roger says so.
  function handOn() {
    if (!rescueFlag.rescue) return;
    const result = takeCall(missions(), {playDay: day(), ...rescueFlag});
    if (!result.taken) return;
    saveMissions(result.missions);
    clock = null; answerLeft = 0;
    radio(result.line);
    emit({type: 'rescueTaken', kind: result.taken});
  }

  // "Later": not answered in time (or said so). A fire waits and grows; a rescue goes to another crew.
  // Roger says it once for each rescue call, however often Later is pressed (RESCUE-VIEW).
  let laterFor = null;
  function later(call) {
    if (isRescueKind(call.kind)) {
      if (laterFor === call.id) return false;
      laterFor = call.id;
      radio('heli.radio.rescue.later'); emit({type: 'rescueLater', kind: call.kind});
    } else { radio('heli.radio.fire.later'); emit({type: 'fireLater'}); }
    return true;
  }

  const api = {
    // A visit starts: arm, and on a new play day run the fire's day steps.
    start({newDay = false} = {}) {
      arm();
      handOn();
      const burning = fire();
      if (newDay && burning) {
        const result = fireOnNewDay(getSave(), {enabled: true, world: world(burning.courseId)});
        commit({ok: true, profile: result.profile});
        if (result.lost) { radio('heli.radio.fire.lost'); emit({type: 'fireLost', courseId: burning.courseId}); }
        if (result.snowed) emit({type: 'fireSnowedOut', courseId: burning.courseId});
      }
      burnNews();
    },
    lessonPassed() { arm(); },
    // Each lift-off: a due call gets its clock; the first lift-off of a play
    // day with a fire burning hears the wind (or, unanswered, a reminder).
    liftoff({lesson = false} = {}) {
      const line = lesson || seasonSaid ? null : seasonLine(seasonOf(day()), rescueFlag.rescue);
      if (line) { seasonSaid = true; radio(line); }
      if (!lesson && rescueFlag.rescue) {
        // One more flight since a rescue call came; two, and another crew has it.
        const waiting = callNow();
        if (waiting && !waiting.answered && isRescueKind(waiting.kind)) saveMissions(noteCallFlight(missions(), rescueFlag));
        handOn();
      }
      const m = missions();
      const could = armed(m) && !callNow() && !rescueOf(m, rescueFlag) && !fire() && m.count >= m.need && !inQuietSpell(m, day());
      if (!lesson && could && callDue(m, {playDay: day(), conditions: conditions(), fireOpen: false, ...rescueFlag})) clock = createCallClock(callTime(m));
      const call = callNow();
      if (fire() && call && lastFireDay !== day()) {
        lastFireDay = day();
        radio(call.answered ? WIND_LINES[windToday().kind] : 'heli.radio.fire.reminder');
      }
    },
    landed() { clock = null; flush(); },
    // One flying step. aboveGround: the helicopter's height over the ground.
    step({dt, engine, aboveGround, lesson = false, opening = false, fading = false}) {
      if (engine) {
        engineBank += dt;
        if (engineBank >= FLUSH_SECONDS) flush();
      }
      if (clock && tickCallClock(clock, {dt, aboveGround, lesson, opening, fading})) { clock = null; ring(); }
      const waiting = answerLeft > 0 ? callNow() : null;
      if (waiting && !waiting.answered) {
        answerLeft -= dt;
        if (answerLeft <= 0) later(waiting);
      }
    },
    cruise(fuelKg) { engineBank += cruiseSeconds(fuelKg); flush(); },
    refuel() { const before = missions(); saveMissions(noteRefuel(before, {fireOpen: !!fire(), playDay: day(), ...rescueFlag}), before); },
    // R: answer the call, now or later, in the air or on the ground.
    pressRadio() {
      const call = callNow();
      if (!call || call.answered) return false;
      if (isRescueKind(call.kind)) {
        // A rescue: the call is answered and the rescue begins with its clock at 0.
        saveMissions(answerCall(missions(), rescueFlag));
        saveMissions(beginRescue(missions(), rescueFlag));
        answerLeft = 0;
        radio(ANSWER_LINES[call.kind]);
        emit({type: 'rescueAnswered', kind: call.kind, courseId: call.courseId});
        return true;
      }
      saveMissions(answerCall(missions()));
      answerLeft = 0;
      radio('heli.radio.fire.answer');
      radio(WIND_LINES[windToday().kind]);
      lastFireDay = day();
      emit({type: 'fireAnswered', courseId: call.courseId});
      return true;
    },
    // "Later" on a waiting rescue call, said at once instead of after the 20 s.
    declineCall() {
      const call = callNow();
      if (!call || call.answered || !isRescueKind(call.kind)) return false;
      answerLeft = 0;
      return later(call);
    },
    // Water from the bucket on this course.
    water(courseId, patches) {
      const burning = fire();
      if (!burning || burning.courseId !== courseId || !patches.length) return;
      const result = applyWater(burning, world(courseId).grid, patches);
      if (result.litresOnFire > 0) emit({type: 'fireHiss', litres: result.litresOnFire});
      commit(setFire(getSave(), result.fire, flag));
      if (result.cellsOut) emit({type: 'cellsOut', count: result.cellsOut});
      if (fireOut(result.fire)) {
        const out = commit(putOutFire(getSave(), burning.id, flag));
        if (!out.ok) return;
        commit(setMissions(getSave(), endMission(missionsOf(getSave()), {playDay: day()}), flag));
        clock = null; answerLeft = 0;
        radio('heli.radio.fire.out');
        radio('heli.radio.fire.thanks');
        if (out.firstBadge) cue('heli.badge');
        emit({type: 'fireOut', courseId, paid: out.paid, firstBadge: out.firstBadge, firesOut: out.firesOut});
      } else if (halfSaid !== burning.id && shareOut(result.fire) >= 50) {
        halfSaid = burning.id;
        radio('heli.radio.fire.half');
      }
    },
    // Bucket news from heli-session (first fill, too fast, dented).
    bucketEvent(event) {
      if (event.type === 'bucketFull' && !fullSaid) { fullSaid = true; if (newFirefighter()) radio('heli.radio.bucket.full'); }
      else if (event.type === 'bucketFast') radio('heli.radio.bucket.fast');
      else if (event.type === 'bucketDamaged') { cue('heli.bucket.dent'); radio('heli.radio.bucket.dented'); }
    },
    bucketFitted() {
      if (firstFill && newFirefighter()) { firstFill = false; radio('heli.radio.bucket.first'); radio('heli.radio.drop.tip'); }
    },
    flush,
    // The dispatch season for the board, and the first snow's note on the
    // play day it fell. No fire burns in winter once the day has begun, so a
    // scar dated today on a winter day is the snow's, whether the visit or
    // app.js (a profile becoming active) noted the day.
    season() {
      const season = seasonOf(day());
      const snowed = season.name === 'winter' ? (heliOf(getSave()).scars ?? []).find(scar => scar.day === day()) : null;
      const note = snowed ? `The first snow put out the fire at ${HELI_DESTINATIONS[snowed.courseId]?.name ?? 'the forest'}.` : null;
      return Object.freeze({...season, note});
    },
    // Today's wind: it moves the falling water and the fire.
    windNow() { return windToday(); },
    // For the board and instruments: the call, the fire in hand and the wind.
    view(heli = null) {
      const call = callNow(), burning = fire();
      if (!call && !burning) return null;
      const wind = windToday();
      const info = {call: call ? Object.freeze({...call}) : null, answerLeft: Math.max(0, answerLeft),
        courseId: burning?.courseId ?? call?.courseId ?? null,
        courseName: HELI_DESTINATIONS[burning?.courseId ?? call?.courseId]?.name ?? null,
        shareOut: burning ? shareOut(burning) : 0, cells: burning ? burning.burning.length : 0,
        wind: Object.freeze({name: wind.name, speed: wind.speed, kind: wind.kind, toward: wind.toward}), target: null};
      if (burning) {
        // For drawing (FIRE-VIEW): each burning and burnt cell's middle and
        // ground height, from the fire's own grid.
        const grid = world(burning.courseId).grid, at = cell => grid.cells.get(cell);
        info.burning = Object.freeze(burning.burning.filter(([cell]) => at(cell))
          .map(([cell, percent]) => Object.freeze({cell, x: at(cell).x, z: at(cell).z, y: at(cell).y, percent})));
        info.burnt = Object.freeze(burning.burnt.filter(cell => at(cell)).map(cell => Object.freeze({cell, x: at(cell).x, z: at(cell).z, y: at(cell).y})));
      }
      if (burning && heli) {
        const grid = world(burning.courseId).grid;
        const cell = hottestEdge(burning, grid, wind);
        if (cell !== null) {
          const [i, j] = cellIJ(cell), x = (i + 0.5) * FIRE.cell, z = (j + 0.5) * FIRE.cell;
          info.target = Object.freeze({x, z, distance: Math.hypot(x - heli.x, z - heli.z),
            bearing: (Math.atan2(x - heli.x, z - heli.z) * 180 / Math.PI + 360) % 360});
        }
      }
      return Object.freeze(info);
    },
    // Is a world point burning (for the aim ring's lock)?
    burningAt(courseId, x, z) {
      const burning = fire();
      if (!burning || burning.courseId !== courseId) return false;
      const id = (Math.floor(x / FIRE.cell) + 512) * 1024 + (Math.floor(z / FIRE.cell) + 512);
      return burning.burning.some(([cell]) => cell === id);
    },
  };
  return api;
}

// The fire grid for a course, built once with its site.
export function fireWorld(loaded, site) {
  return {...loaded, site, grid: fireGrid(loaded.course, loaded.ground, site)};
}
