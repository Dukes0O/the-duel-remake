// The Bowl's rival trucks (BOWL-RIVALS; docs/WASTELAND_WORLD.md section 7). Five
// computer trucks, each the show's Titan driven by a named rival with a way of
// driving of their own. Side by Side and Last Truck Rolling run from seed and
// inputs with no DOM, graphics or storage. Side by Side supplies a lane and
// speed plan to the ordinary rival driver. Last Truck Rolling keeps the arena's
// target selection and gives its pilot a Bowl pace. On Easy, two rivals
// circle at the start and join the fight at different times.
//
// The fight uses the arena's teams, computer drivers and wreck rules. The
// show supplies its own weapons and armor, removes crates and keeps knocked
// out trucks where they stopped until the end of the fight.
import {BOWL_NIGHT_RULES, SHOW_TRUCK, addComputerTruck, bowlLayout, registerBowlEventRunner,
  sayBowlLine, startBowlEventAt} from './bowl-night.js';
import {prepareShowWeapons, stepShowWeapons} from './bowl-weapons.js';
import {BOWL_GOALS} from './bowl-lines.js';
import {SHOW_NIGHTS} from './bowl-show.js';
import {DRIVE} from '../config.js';

const LEVELS = ['easy', 'medium', 'hard'];

export const BOWL_RACE_RULES = Object.freeze({
  laps: 2,
  cleanLapSec: 19.7,
  gapMetres: 25,
  gapRampMetres: 50,
  aheadSlowdown: .15,
  behindBoost: .08,
  finishGraceSec: 6,
  metresPerSecondToMph: 1 / DRIVE.mphToWorld,
  landingCueRange: 35,
  flipPaceDebtSec: .68,
});

export function bowlRivalLapTarget(id, level) {
  const ratio = level === 'easy' ? (id === 'old-bess' ? 1.45 : 1.35)
    : level === 'medium' ? 1.12 : id === 'dragon-wagon' ? .97 : 1;
  return BOWL_RACE_RULES.cleanLapSec * ratio;
}

// The two lanes start half a lap apart. This compares race distance, not map distance.
export function bowlRivalGapScale(gap, level) {
  const rules = BOWL_RACE_RULES;
  if (level === 'hard' || Math.abs(gap) <= rules.gapMetres) return 1;
  const share = Math.min(1, (Math.abs(gap) - rules.gapMetres) / rules.gapRampMetres);
  return 1 + share * (gap > 0 ? -rules.aheadSlowdown : rules.behindBoost);
}

// How hard every rival hits in Last Truck Rolling, as a share of a full knock,
// on each level: the arena's own per-truck ram strength (ramDamageScale). The
// player's truck always hits at full strength. Design numbers for Claude's
// review (docs/board/questions/BOWL-RIVALS.md).
export const BOWL_RIVAL_HITS = Object.freeze({easy: .2, medium: .6, hard: 1});
const levelOf = night => LEVELS.includes(night?.cpuDifficulty) ? night.cpuDifficulty : 'medium';

// The arena brain owns targets and tactics. The race plan below owns the time
// lost at the start and the distinct way each rival drives a lap.
export const BOWL_RIVALS = Object.freeze({
  'old-bess': Object.freeze({name: 'Old Bess', brain: 'brawler', startDelaySec: 1,
    way: 'Old Bess is Moss\'s cousin. She is slow off the line and runs wide in the turns.'}),
  'big-kettle': Object.freeze({name: 'Big Kettle', brain: 'rammer', startDelaySec: 1.6,
    way: 'Big Kettle takes a while to get going, then flies down the straight.'}),
  'rust-rhino': Object.freeze({name: 'Rust Rhino', brain: 'rammer', startDelaySec: .3,
    way: 'Rust Rhino charges into the turn and brakes late.'}),
  'tin-lizard': Object.freeze({name: 'Tin Lizard', brain: 'brawler', startDelaySec: .2,
    way: 'Tin Lizard is quick in the turns and takes its time on the straights.'}),
  'dragon-wagon': Object.freeze({name: 'Dragon Wagon', brain: 'rammer', startDelaySec: .2,
    way: 'Dragon Wagon loves the crowd and flips over the last kicker.'}),
});
export const BOWL_RIVAL_IDS = Object.freeze(Object.keys(BOWL_RIVALS));

// A view of the season data for the rival runners and their checks.
export const BOWL_RIVAL_NIGHTS = Object.freeze(SHOW_NIGHTS.map(({rivals, weapons}) =>
  Object.freeze({...rivals, showWeapons: weapons})));

// Design numbers for Claude's review; BOWL-FINISH tunes them in play.
export const BOWL_RIVAL_RULES = Object.freeze({
  lastTruckRolling: Object.freeze({
    timeLimitSec: 120,
    // Every truck, the player's too, takes the same knocks before it is out.
    // The arena's armor (about 194 for a Titan) would take eight or more
    // full-speed charges; a hard wall hit or a scrape on the scenery costs 20.
    showArmor: 60,
    pace: Object.freeze({minimum: 30, maximum: 40}),
  }),
});

// Easy openings for Hammer, Barrel Roll and Scrapasaurus Night. The lead
// rival starts hunting immediately. The others take separate lanes before
// joining, giving the driver time to chase and use their weapon.
const EASY_FIGHT_OPENINGS = Object.freeze({
  3: {ownRamRecoil: .42, joinsAt: [0, 55, 82], lanes: [0, 6, 10], speedMph: 38, lookAhead: 11},
  4: {ownRamRecoil: .22, joinsAt: [54, 0, 100], lanes: [6, 0, 10], speedMph: 37, lookAhead: 13, pace: {minimum: 28, maximum: 35}},
  5: {ownRamRecoil: .42, joinsAt: [0, 52, 92], lanes: [0, -5, 5], speedMph: 36, lookAhead: 14},
});

// The rival for a night's Side by Side, and the rivals for its Last Truck
// Rolling. A test may pass `rivals` in the night's options to choose them.
export function sideBySideRival(night) {
  const chosen = night?.rivals?.[0];
  return BOWL_RIVALS[chosen] ? chosen : BOWL_RIVAL_NIGHTS[(night?.night ?? 1) - 1]?.sideBySide ?? 'old-bess';
}
export function lastTruckRivals(night) {
  const chosen = Array.isArray(night?.rivals) ? night.rivals.filter(id => BOWL_RIVALS[id]).slice(0, 3) : [];
  return chosen.length ? chosen : [...(BOWL_RIVAL_NIGHTS[(night?.night ?? 3) - 1]?.lastTruckRolling ??
    BOWL_RIVAL_NIGHTS[2].lastTruckRolling)];
}



// Pace shapes keep each rival recognizable while the lap time remains the unit
// of difficulty. The plan drives the ordinary CPU car's pedals and steering.
const RACE_STYLE = Object.freeze({
  'old-bess': {straight: 1.13, bend: .86, brakeAhead: 12, wide: 7},
  'big-kettle': {straight: 1.35, bend: .80, brakeAhead: 17, wide: 0},
  'rust-rhino': {straight: 1.18, bend: .87, brakeAhead: 3, wide: 0},
  'tin-lizard': {straight: 1.03, bend: .99, brakeAhead: 10, wide: 1},
  'dragon-wagon': {straight: 1.14, bend: .9, brakeAhead: 10, wide: 2},
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const bending = (course, s) => Math.abs(course.at(s).curvature) > .025;

function raceJump(duel, actor, event, dt) {
  const wasInAir = event.rivalInAir;
  event.rivalInAir = !!actor.airborne;
  if (actor.airborne) {
    const remaining = event.finishS.rival - actor.s;
    const index = Number(actor._jumpOrigin?.rampId?.match(/^ramp-(\d+)$/)?.[1]);
    const kicker = duel.course.features.ramps[index]?.id?.includes('kicker');
    if (!wasInAir && event.rival === 'dragon-wagon' && !event.dragonFlipped && kicker && remaining < duel.course.length / 2) {
      event.dragonFlipped = true;
      event.dragonFlipTime = 0;
      event.paceMetres = Math.max(0, event.paceMetres - event.baseMps * BOWL_RACE_RULES.flipPaceDebtSec);
    }
    if (event.dragonFlipTime != null) {
      event.dragonFlipTime += dt;
      actor.bowlPose = {yaw: 0, roll: 0, pitch: 2 * Math.PI * Math.min(1, event.dragonFlipTime / .65)};
    }
    return;
  }
  if (!wasInAir) return;
  event.dragonFlipTime = null;
  actor.bowlPose = null;
  const player = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const rival = duel.course.worldAt(actor.s, actor.lateral);
  if (Math.hypot(rival.x - player.x, rival.z - player.z) <= BOWL_RACE_RULES.landingCueRange) {
    duel.emit({bowlRaceCue: 'bowl.rival.jump'});
  }
}

function planRaceRival(duel, actor, night, dt) {
  const {course, state} = duel, {event} = night, rival = BOWL_RIVALS[event.rival];
  const style = RACE_STYLE[event.rival];
  const relative = actor.s - event.startS.rival;
  const gap = relative - (state.s - event.startS.player);
  const paceShare = bowlRivalGapScale(gap, levelOf(night));
  const ready = state.stageTimeSec >= rival.startDelaySec;
  if (ready && event.rivalDoneAt == null) event.paceMetres += event.baseMps * paceShare * dt;
  const nearBend = bending(course, actor.s + style.brakeAhead);
  const inBend = bending(course, actor.s);
  const nominal = event.baseMps * BOWL_RACE_RULES.metresPerSecondToMph * paceShare;
  const correction = clamp((event.paceMetres - relative) * .3, -5, 7);
  const pace = nominal * (nearBend ? style.bend : style.straight) + correction;
  // Rust Rhino drifts out once from its late approach. The wall handles the contact.
  if (event.rival === 'rust-rhino' && relative > 40 && inBend) event.rhinoBrushAt ??= relative;
  const brushing = event.rhinoBrushAt != null && !event.rhinoTouched && relative < event.rhinoBrushAt + 60;
  const lane = brushing ? 23 : inBend ? style.wide : 0;
  actor.bowlRaceDrive = {
    speedMph: ready ? (event.rivalDoneAt == null ? clamp(pace, 15, 54) : 12) : 0,
    lane,
  };
  raceJump(duel, actor, event, dt);
}

// ---- Side by Side -------------------------------------------------------

// Where the player and the rival start and finish, from the course's own data:
// Show Night's bowlLayout reads the two lanes from course.features.bowl.lanes
// (BOWL-EXPAND: both on the centre line, half a lap apart), and each truck
// finishes two full laps from where it started. Nothing here assumes the floor's size.
function crossingTime(actor, finish, before, after) {
  if (!actor || actor.s < finish) return null;
  const distance = actor.s - actor.prevS;
  const fraction = distance > 0 ? clamp((finish - actor.prevS) / distance, 0, 1) : 1;
  return before + (after - before) * fraction;
}

export function sideBySideLanes(course, laps = BOWL_RACE_RULES.laps) {
  const [player, rival] = bowlLayout(course).lanes;
  const distance = laps * course.length;
  return {player: {s: player.s, lateral: player.lateral, finishS: player.s + distance},
    rival: {s: rival.s, lateral: rival.lateral, finishS: rival.s + distance}};
}

registerBowlEventRunner('sideBySide', {
  // Each truck's finish is a distance (sideBySideLanes); the Duel's own lap count
  // is left at the runners' default, so the rival never stops for having done its laps.
  place(duel, night) {
    const lanes = sideBySideLanes(duel.course), rivalId = sideBySideRival(night);
    startBowlEventAt(duel, lanes.player.s, lanes.player.lateral);
    const truck = addComputerTruck(duel, {s: lanes.rival.s, lateral: lanes.rival.lateral});
    truck.bowlRival = rivalId;
    night.event.rival = rivalId;
    night.event.startS = {player: lanes.player.s, rival: lanes.rival.s};
    night.event.finishS = {player: lanes.player.finishS, rival: lanes.rival.finishS};
    night.event.finishWinner = null;
    night.event.lastRaceTime = 0;
    const target = bowlRivalLapTarget(rivalId, levelOf(night)) * BOWL_RACE_RULES.laps;
    night.event.baseMps = (lanes.rival.finishS - lanes.rival.s) / (target - BOWL_RIVALS[rivalId].startDelaySec - .7);
    night.event.paceMetres = 0;
    duel.emit({bowlRaceCue: 'bowl.race.lights'});
  },
  goal: night => BOWL_GOALS.sideBySide(BOWL_RIVALS[night.event?.rival]?.name),
  observe(duel, night, ev) {
    const event = night.event, rival = duel.state.opponents[0];
    if (ev.bowlWall && event.rhinoBrushAt != null && rival?.lateral >= 19 && rival.pushVelocity < 0) {
      event.rhinoTouched = true;
    }
  },
  step(duel, night, dt) {
    const s = duel.state, rival = s.opponents[0], event = night.event;
    // Big Mo says who is in the other lane once he has named the event.
    if (!event.rivalSaid) { event.rivalSaid = true; sayBowlLine(duel, `rival.${event.rival}`); }
    if (rival) planRaceRival(duel, rival, night, dt);
    const before = event.lastRaceTime, after = s.stageTimeSec;
    event.playerDoneAt ??= crossingTime(s, event.finishS.player, before, after);
    event.rivalDoneAt ??= crossingTime(rival, event.finishS.rival, before, after);
    event.lastRaceTime = after;
    const first = Math.min(event.playerDoneAt ?? Infinity, event.rivalDoneAt ?? Infinity);
    if (!event.finishWinner && Number.isFinite(first)) {
      event.finishWinner = first === event.playerDoneAt ? 'player' : 'rival';
      duel.emit({bowlRaceCue: 'bowl.race.finish', bowlRaceWinner: event.finishWinner});
    }
    const facts = {rival: event.rival, playerDoneAt: event.playerDoneAt, rivalDoneAt: event.rivalDoneAt};
    const bothFinished = event.playerDoneAt != null && event.rivalDoneAt != null;
    if (bothFinished || s.stageTimeSec - first >= BOWL_RACE_RULES.finishGraceSec ||
        s.stageTimeSec >= BOWL_NIGHT_RULES.sideBySide.timeLimitSec) {
      return {...facts, won: event.finishWinner === 'player'};
    }
    return null;
  },
});

// ---- Last Truck Rolling -------------------------------------------------

// A knocked-out truck's wreck waits out the rest of the event, so the arena
// never brings it back.
const holdWreck = truck => {
  truck.combatWreckTimer = Math.max(truck.combatWreckTimer || 0, BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec);
};

registerBowlEventRunner('lastTruckRolling', {
  laps: 1,
  timeLimitSec: BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec,
  place(duel, night) {
    const s = duel.state, roster = lastTruckRivals(night), rules = BOWL_RIVAL_RULES.lastTruckRolling;
    // The arena's fight, on the Bowl: armor and wrecks are the Wasteland's
    // combat rules. Show weapons replace the ordinary arena loadouts.
    s.mode = 'wasteland'; s.wastelandGateDiscovered = true; s.weaponLoadout = [];
    duel._loadArena(duel.course.def, 'last-car-rolling', roster.map(id => ({car: SHOW_TRUCK, brain: BOWL_RIVALS[id].brain})));
    s.bowlNight = night; // the arena's load ends any night; this one goes on
    const arena = s.arena;
    // The show's clock and knock-outs decide the event, so the arena's own never runs out.
    arena.timeLimitSec = Infinity; arena.suddenDeathLimitSec = Infinity;
    s.combat.arenaSpots = []; s.combat.pickups = [];
    s.weaponLoadout = [];
    const level = levelOf(night);
    const opening = level === 'easy' ? EASY_FIGHT_OPENINGS[night.night] : null;
    if (opening) night.event.ownRamRecoil = opening.ownRamRecoil;
    roster.forEach((id, index) => {
      const truck = s.opponents[index];
      const drive = {...rules.pace, ...opening?.pace};
      const joinsAt = opening?.joinsAt[index] ?? 0;
      if (joinsAt > 0) {
        drive.opening = {joinsAt, lane: opening.lanes[index], speedMph: opening.speedMph, lookAhead: opening.lookAhead};
      }
      Object.assign(truck, {bowlRival: id, weaponLoadout: [], weaponsDisabledUntil: Infinity,
        bowlFightDrive: drive, ramDamageScale: BOWL_RIVAL_HITS[level]});
      arena.participants[index + 1].name = BOWL_RIVALS[id].name.toUpperCase();
    });
    for (const actor of [s, ...s.opponents]) actor.maxArmor = actor.armor = rules.showArmor;
    night.event.rival = null;
    night.event.rivals = roster.map(id => ({id, out: false, by: null, at: null}));
    night.event.knockouts = 0;
    prepareShowWeapons(duel, night, BOWL_RIVAL_NIGHTS[night.night-1].showWeapons);
  },
  goal(night) {
    const left = (night.event?.rivals ?? []).filter(entry => !entry.out).map(entry => BOWL_RIVALS[entry.id].name);
    if (night.event?.returnSeconds != null) return `Return through a gate: ${Math.ceil(night.event.returnSeconds)} s.`;
    return BOWL_GOALS.lastTruckRolling(left);
  },
  // A wrecked truck is knocked out, credited as the arena credits a wreck (to
  // the last truck that hit it within a few seconds), and stays where it stopped.
  observe(duel, night, ev) {
    const wreck = ev.arenaWreck, event = night.event;
    if (ev.bowlBackIn) event.returnSeconds = null;
    if (!wreck) return;
    duel.emit({bowlWeaponCue: 'bowl.knockout'});
    if (wreck.victimId === 'player') return;
    const {participants} = duel.state.arena;
    const index = participants.findIndex(participant => participant.id === wreck.victimId) - 1;
    const entry = event.rivals[index], truck = duel.state.opponents[index];
    if (!entry || entry.out || !truck) return;
    Object.assign(entry, {out: true, by: wreck.creditedId, at: +duel.state.stageTimeSec.toFixed(3)});
    holdWreck(truck);
    if (levelOf(night) === 'easy') participants[index + 1].targetId = null;
    if (wreck.creditedId === 'player') event.knockouts++;
    sayBowlLine(duel, `out.${entry.id}`);
    duel.emit({bowlKnockout: {rival: entry.id, by: wreck.creditedId, cue: 'bowl.knockout'}});
  },
  step(duel, night, dt) {
    const s = duel.state, event = night.event, arena = s.arena;
    const rules = BOWL_RIVAL_RULES.lastTruckRolling;
    if (!arena) return {won: false};
    stepShowWeapons(duel, night, dt);
    if (!event.rivalSaid) { event.rivalSaid = true; sayBowlLine(duel, `rivals.night.${night.night}`); }
    event.rivals.forEach((entry, index) => {
      const truck = s.opponents[index];
      if (!truck) return;
      if (entry.out) holdWreck(truck);
    });
    const facts = () => ({knockouts: event.knockouts, rivalsOut: event.rivals.filter(entry => entry.out).map(entry => entry.id)});
    if (s.combatWrecking) {
      // A weapon acts before the arena step. Let the arena announce and credit
      // the wreck once before finishing the night on the following tick.
      return arena.participants[0].wreckCounted ? {...facts(), won: false, knockedOut: true} : null;
    }
    if (event.rivals.every(entry => entry.out)) return {...facts(), won: true};
    if (s.stageTimeSec >= rules.timeLimitSec) {
      if (levelOf(night) === 'easy') {
        const won = event.rivals.every((entry, index) => entry.out || s.armor >= s.opponents[index].armor);
        return {...facts(), won, timeUp: true, decidedBy: 'health'};
      }
      // Time is up: of the trucks still rolling, the one that has hit the
      // others hardest wins, and a tie goes to the player. Keeping out of the
      // way wins nothing.
      const dealt = index => arena.participants[index].damageDealt || 0;
      const best = Math.max(0, ...event.rivals.map((entry, index) => entry.out ? 0 : dealt(index + 1)));
      return {...facts(), won: dealt(0) > 0 && dealt(0) >= best, timeUp: true};
    }
    return null;
  },
});
