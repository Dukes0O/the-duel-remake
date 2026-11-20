// The Bowl's rival trucks (BOWL-RIVALS; docs/WASTELAND_WORLD.md section 7). Five
// computer trucks, each the show's Titan driven by a named rival with a way of
// driving of their own. Their pace is data, from Easy to Hard. This module
// replaces Side by Side's one computer truck and adds Last Truck Rolling; both
// run from seed and inputs alone, with no DOM, graphics or storage.
//
// Side by Side keeps the duel's own rival rules on the course's second lane: the
// rival's pace for the night's level caps its speed, and its start delay is how
// long it takes to get going when the lights go.
//
// Last Truck Rolling is the arena's own fight on the Bowl (src/arena): its
// teams (every truck for itself), its computer drivers (src/arena/arena-brains.js
// and arena-pilot.js) and its wrecks. The show changes three things and nothing
// in the arena's code: no weapons and no crates, the same show armor for every
// truck, and a wrecked truck is knocked out and stays where it stopped instead
// of coming back.
import {BOWL_NIGHT_RULES, SHOW_TRUCK, addComputerTruck, bowlLayout, registerBowlEventRunner,
  sayBowlLine, startBowlEventAt} from './bowl-night.js';
import {BOWL_GOALS} from './bowl-lines.js';

const LEVELS = ['easy', 'medium', 'hard'];

// How hard every rival hits in Last Truck Rolling, as a share of a full knock,
// on each level: the arena's own per-truck ram strength (ramDamageScale). The
// player's truck always hits at full strength. Design numbers for Claude's
// review (docs/board/questions/BOWL-RIVALS.md).
export const BOWL_RIVAL_HITS = Object.freeze({easy: .2, medium: .6, hard: 1});
const levelOf = night => LEVELS.includes(night?.cpuDifficulty) ? night.cpuDifficulty : 'medium';

// Each rival: the name on screen, how they drive, and their top pace on each
// level in miles an hour. `brain` is one of the arena's own driving styles: a
// rammer lines up and charges; a brawler charges while its truck is sound and
// keeps its distance once it is badly hurt. `startDelaySec` is how long the
// rival takes to get going when the lights go. Design numbers for Claude's
// review; BOWL-FINISH tunes them in play.
export const BOWL_RIVALS = Object.freeze({
  'old-bess': Object.freeze({name: 'Old Bess', brain: 'brawler', startDelaySec: 1,
    way: 'Old Bess is Moss\'s cousin. She is slow off the line and never in a hurry, but she never gives up.',
    pace: Object.freeze({easy: 13, medium: 24, hard: 28})}),
  'big-kettle': Object.freeze({name: 'Big Kettle', brain: 'rammer', startDelaySec: 1.6,
    way: 'Big Kettle takes a long time to get the boiler going, and then it pushes everything out of the way.',
    pace: Object.freeze({easy: 14, medium: 24, hard: 29})}),
  'rust-rhino': Object.freeze({name: 'Rust Rhino', brain: 'rammer', startDelaySec: .3,
    way: 'Rust Rhino puts its head down and charges at whatever is in front of it.',
    pace: Object.freeze({easy: 14, medium: 24, hard: 30})}),
  'tin-lizard': Object.freeze({name: 'Tin Lizard', brain: 'brawler', startDelaySec: .2,
    way: 'Tin Lizard is quick and slippery, and it runs away when it gets hurt.',
    pace: Object.freeze({easy: 15, medium: 25, hard: 31})}),
  'dragon-wagon': Object.freeze({name: 'Dragon Wagon', brain: 'rammer', startDelaySec: .2,
    way: 'Dragon Wagon is the fastest truck in the show, and it loves a crowd.',
    pace: Object.freeze({easy: 15, medium: 26, hard: 32})}),
});
export const BOWL_RIVAL_IDS = Object.freeze(Object.keys(BOWL_RIVALS));

// Who is in the Bowl on each night: one rival in Side by Side on nights one and
// two, three rivals (four trucks with the player's) in Last Truck Rolling from
// night three. Every rival drives at least once.
export const BOWL_RIVAL_NIGHTS = Object.freeze([
  Object.freeze({sideBySide: 'old-bess'}),
  Object.freeze({sideBySide: 'rust-rhino'}),
  Object.freeze({lastTruckRolling: Object.freeze(['big-kettle', 'tin-lizard', 'old-bess'])}),
  Object.freeze({lastTruckRolling: Object.freeze(['rust-rhino', 'tin-lizard', 'big-kettle'])}),
  Object.freeze({lastTruckRolling: Object.freeze(['dragon-wagon', 'rust-rhino', 'tin-lizard'])}),
]);

// Design numbers for Claude's review; BOWL-FINISH tunes them in play.
export const BOWL_RIVAL_RULES = Object.freeze({
  lastTruckRolling: Object.freeze({
    timeLimitSec: 120,
    // Every truck, the player's too, takes the same knocks before it is out.
    // The arena's armor (about 194 for a Titan) would take eight or more
    // full-speed charges; a hard wall hit or a scrape on the scenery costs 20.
    // At 60 a child-pace driver knocks out one to three trucks on Easy and
    // still wins 9 or 10 times in 10 (tools/test-bowl-rivals.mjs); at 80 it
    // knocked out one or two and nearly every event ran to the clock.
    showArmor: 60,
  }),
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

// The rival's own pace: no faster than their top for the level, and parked
// until their start delay has run. A truck in the air or being knocked about
// is left to the physics.
function holdPace(duel, actor, rivalId, level) {
  const rival = BOWL_RIVALS[rivalId];
  if (!rival || actor.airborne || actor.knock || actor.combatWrecking) return;
  if (duel.state.stageTimeSec < rival.startDelaySec) { actor.speedMph = Math.min(actor.speedMph, 0); return; }
  actor.speedMph = Math.min(actor.speedMph, rival.pace[level]);
}

// ---- Side by Side -------------------------------------------------------

// Where the player and the rival start and finish, from the course's own data:
// Show Night's bowlLayout reads the two lanes from course.features.bowl.lanes
// (BOWL-EXPAND: both on the centre line, half a lap apart), and each truck
// finishes one full lap from where it started. Nothing here assumes the floor's size.
export function sideBySideLanes(course) {
  const [player, rival] = bowlLayout(course).lanes;
  return {player: {s: player.s, lateral: player.lateral, finishS: player.s + course.length},
    rival: {s: rival.s, lateral: rival.lateral, finishS: rival.s + course.length}};
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
    night.event.finishS = {player: lanes.player.finishS, rival: lanes.rival.finishS};
  },
  goal: night => BOWL_GOALS.sideBySide(BOWL_RIVALS[night.event?.rival]?.name),
  step(duel, night) {
    const s = duel.state, rival = s.opponents[0], event = night.event;
    // Big Mo says who is in the other lane once he has named the event.
    if (!event.rivalSaid) { event.rivalSaid = true; sayBowlLine(duel, `rival.${event.rival}`); }
    if (rival) holdPace(duel, rival, event.rival, levelOf(night));
    if (event.playerDoneAt == null && s.s >= event.finishS.player) event.playerDoneAt = s.stageTimeSec;
    if (event.rivalDoneAt == null && rival?.s >= event.finishS.rival) event.rivalDoneAt = s.stageTimeSec;
    const facts = {rival: event.rival, rivalDoneAt: event.rivalDoneAt};
    if (event.playerDoneAt != null) return {...facts, won: event.rivalDoneAt == null || event.playerDoneAt <= event.rivalDoneAt};
    if (event.rivalDoneAt != null || s.stageTimeSec >= BOWL_NIGHT_RULES.sideBySide.timeLimitSec) return {...facts, won: false};
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
    // combat rules, so the event runs under them with no weapons at all.
    s.mode = 'wasteland'; s.wastelandGateDiscovered = true; s.weaponLoadout = [];
    duel._loadArena(duel.course.def, 'last-car-rolling', roster.map(id => ({car: SHOW_TRUCK, brain: BOWL_RIVALS[id].brain})));
    s.bowlNight = night; // the arena's load ends any night; this one goes on
    const arena = s.arena;
    // The show's clock and knock-outs decide the event, so the arena's own never runs out.
    arena.timeLimitSec = Infinity; arena.suddenDeathLimitSec = Infinity;
    s.combat.arenaSpots = []; s.combat.pickups = [];
    s.weaponLoadout = [];
    roster.forEach((id, index) => {
      const truck = s.opponents[index];
      Object.assign(truck, {bowlRival: id, weaponLoadout: [], weaponsDisabledUntil: Infinity,
        ramDamageScale: BOWL_RIVAL_HITS[levelOf(night)]});
      arena.participants[index + 1].name = BOWL_RIVALS[id].name.toUpperCase();
    });
    for (const actor of [s, ...s.opponents]) actor.maxArmor = actor.armor = rules.showArmor;
    night.event.rival = null;
    night.event.rivals = roster.map(id => ({id, out: false, by: null, at: null}));
    night.event.knockouts = 0;
  },
  goal(night) {
    const left = (night.event?.rivals ?? []).filter(entry => !entry.out).map(entry => BOWL_RIVALS[entry.id].name);
    return BOWL_GOALS.lastTruckRolling(left);
  },
  // A wrecked truck is knocked out, credited as the arena credits a wreck (to
  // the last truck that hit it within a few seconds), and stays where it stopped.
  observe(duel, night, ev) {
    const wreck = ev.arenaWreck, event = night.event;
    if (!wreck || wreck.victimId === 'player') return;
    const index = duel.state.arena.participants.findIndex(participant => participant.id === wreck.victimId) - 1;
    const entry = event.rivals[index], truck = duel.state.opponents[index];
    if (!entry || entry.out || !truck) return;
    Object.assign(entry, {out: true, by: wreck.creditedId, at: +duel.state.stageTimeSec.toFixed(3)});
    holdWreck(truck);
    if (wreck.creditedId === 'player') event.knockouts++;
    sayBowlLine(duel, `out.${entry.id}`);
    duel.emit({bowlKnockout: {rival: entry.id, by: wreck.creditedId, cue: wreck.creditedId === 'player' ? 'arena.wreck-credit' : 'bowl.mo'}});
  },
  step(duel, night) {
    const s = duel.state, event = night.event, arena = s.arena, level = levelOf(night);
    const rules = BOWL_RIVAL_RULES.lastTruckRolling;
    if (!arena) return {won: false};
    if (!event.rivalSaid) { event.rivalSaid = true; sayBowlLine(duel, `rivals.night.${night.night}`); }
    event.rivals.forEach((entry, index) => {
      const truck = s.opponents[index];
      if (!truck) return;
      if (entry.out) holdWreck(truck);
      else holdPace(duel, truck, entry.id, level);
    });
    const facts = () => ({knockouts: event.knockouts, rivalsOut: event.rivals.filter(entry => entry.out).map(entry => entry.id)});
    if (s.combatWrecking) return {...facts(), won: false, knockedOut: true};
    if (event.rivals.every(entry => entry.out)) return {...facts(), won: true};
    if (s.stageTimeSec >= rules.timeLimitSec) {
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
