// STORY-KOGANE-DUEL: Daichi's settings by level, the level start, the one rule that grants the Skyline, and the
// win-rate curve of docs/story/kogane-invitation.md section 5. Memory-only saves.
//   node tools/test-story-kogane-duel.mjs                                      rules and a short race check (lane tier)
//   node tools/test-story-kogane-duel.mjs --rates easy|medium|hard|lesson      the seeded duels for one level
//   add --upgrade N to try another tuning level, --skill X for one fixed driver skill
import assert from 'node:assert/strict';

// The Skyline is in the car list only while the nissan-skyline switch is on; this run asks for it as private QA does.
globalThis.__DUEL_QA__ = true;
globalThis.location = {search: '?flags=nissan-skyline,kogane-pass'};
globalThis.cancelAnimationFrame ??= () => {};
const memory = new Map();
globalThis.localStorage = {getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k)};
const {createProfile, settleRace} = await import('../src/progression.js');
const {COURSE} = await import('../src/config.js');
const {ALL_CIRCUITS} = await import('../src/circuits/index.js');
const {App} = await import('../src/app.js');
const {makeRng} = await import('../src/rng.js');
const {useRacingLine} = await import('./track-script-drive.mjs');
const {readKoganeLetter, markKoganeLesson, markKoganeSupplies, markKoganeDuel, storyOf, KOGANE_SKYLINE} = await import('../src/story/story-save.js');
const {KOGANE_DUEL_MARK, KOGANE_DUEL_COURSE, DAICHI_UPGRADE_LEVEL, daichiRival, koganeDuelStart, levelStart} =
  await import('../src/story/kogane-duel.js');

let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const LEVELS = ['easy', 'medium', 'hard'];

// ---- The race harness ----------------------------------------------------------------------------------------------
// The Night version of Kogane Pass (KOGANE-PASS-C7) does not exist yet. The curve is proved on the day road, which has
// the same 4,684 m of road and the same four hairpins; the Night version runs the same numbers when it is built.
const nightExists = ALL_CIRCUITS.some(item => item.id === KOGANE_DUEL_COURSE);
const raceCourseId = nightExists ? KOGANE_DUEL_COURSE : 'kogane-pass';
const courseIndex = id => {
  let at = COURSE.findIndex(item => item.id === id);
  if (at < 0) at = COURSE.push(ALL_CIRCUITS.find(item => item.id === id)) - 1;
  return at;
};

// A seeded duel has no chance in it: one road, no traffic, and the rival drives the same every time. So the 30 duels of
// a level differ in the driver. The test driver (the racing-line driver the circuit tests use, Stuttgart 959-S) takes
// its skill from the seeded generator, spread evenly over SKILL_RANGE: stratified, so 30 seeds cover the range.
export const SKILL_RANGE = [.80, 1.00];   // from a careful learner to the line at its limit; .95 is the circuit tests' value
export const LESSON_RANGE = [.88, .96];   // the lesson's pace: about 92% of the instructor's line
const skillFor = (index, count, [low, high]) => low + (high - low) * (index + makeRng(7001 + index).float()) / count;

const FIRST_HAIRPIN = 'Cedar Hairpin';

// One race. `solo` runs Daichi alone: the player stays 40 m behind him, so the catch-up rule is neutral, and the run ends
// when he crosses the line. Otherwise the driver races him to the finish.
function race({level, skill = .95, upgrade, solo = false, noNitro = false, car = 'stuttgart_959s', seed = 1989}) {
  const app = new App();
  app._refreshPlayer(); app.seed = seed; app.cpuDifficulty = level;
  const start = koganeDuelStart(level);
  if (upgrade != null) start.rival = {...start.rival, upgradeLevel: upgrade};
  const stage = courseIndex(raceCourseId);
  app.duel.startCampaign({...start, car, difficulty: 'casual', driverId: 'club', startStage: stage, seed, playerId: app.player.id, upgrades: {}});
  const d = app.duel, s = d.state, daichi = s.opponents[0];
  ok(daichi.car === KOGANE_SKYLINE && d.rivalSpec === d.rivalSpec && s.rivalSettings.car === KOGANE_SKYLINE, 'Daichi drives the Skyline');
  ok(levelStart(d) && daichi.s === 0 && s.s === 0, 'the duel starts level');
  app.autopilot = !solo; app._scriptedCrashDone = true;
  if (!solo) useRacingLine(app, skill);
  const pieces = d.course.script.pieces, hairpin = pieces.find(piece => piece.name === FIRST_HAIRPIN);
  const facts = {hits: [], resets: 0, stuckSec: 0, maxStuckSec: 0};
  const contacts = d._staticContacts.bind(d), reset = d._safeReset.bind(d), advance = d.step.bind(d);
  // A wall or roadside hit that scrubs Daichi's speed, and a reset onto the road, are his crashes.
  d._staticContacts = (actor, ...rest) => {
    const before = actor.speedMph, out = contacts(actor, ...rest);
    if (actor === daichi && before > 20 && actor.speedMph < before * .9) facts.hits.push(daichi.s);
    return out;
  };
  d._safeReset = (actor, ...rest) => { if (actor === daichi) { facts.resets++; facts.hits.push(daichi.s); } return reset(actor, ...rest); };
  d.step = dt => {
    if (noNitro) daichi.boost = 0;   // an experiment only: what the rival's pace would be with no nitro
    if (solo && s.status === 'racing') { s.s = s.prevS = Math.max(0, daichi.s - 40); s.speedMph = 0; }
    advance(dt);
    if (s.status === 'racing' && s.stageTimeSec > 8 && !daichi.finished) {
      facts.stuckSec = daichi.speedMph < 3 ? facts.stuckSec + dt : 0;
      facts.maxStuckSec = Math.max(facts.maxStuckSec, facts.stuckSec);
    }
  };
  let frames = 0;
  while (!['stage_result', 'gameover', 'complete'].includes(s.status) && frames++ < 60 * 400) {
    app.advance(1 / 60, 1 / 60);
    if (solo && daichi.finished) break;
  }
  const inHairpin = at => at > hairpin.s0 - 50 && at < hairpin.s1 + 20;
  const result = {
    skill, level, upgrade: start.rival.upgradeLevel, status: s.status,
    won: !solo && s.results?.won === true, timeSec: s.results?.timeSec ?? null,
    daichiFinished: daichi.finished === true, daichiTime: daichi.finishTime ?? null, daichiAt: daichi.s,
    hits: facts.hits.length, resets: facts.resets, hairpinHits: facts.hits.filter(inHairpin).length, stuck: facts.maxStuckSec > 8,
  };
  app.dispose?.();
  return result;
}

// ---- Daichi's settings -----------------------------------------------------------------------------------------------
same(DAICHI_UPGRADE_LEVEL, {easy: 0, medium: 2, hard: 0}, 'tuning level by CPU level');
for (const level of LEVELS) {
  const rival = daichiRival(level);
  ok(rival.car === 'nissan_skyline_gtr_r34' && rival.driverId === 'club' && rival.upgradeLevel === DAICHI_UPGRADE_LEVEL[level], `${level}: the Skyline, the Club driver, the tuning level`);
  const start = koganeDuelStart(level);
  ok(start.mode === 'duel' && start.opponentCount === 1 && start.cpuDifficulty === level && start.story === KOGANE_DUEL_MARK, `${level}: a one-rival duel that carries the story mark`);
  same(start.rival, rival, `${level}: the same rival settings`);
}
ok(daichiRival('brutal') === null && koganeDuelStart(undefined) === null, 'an unknown level has no Daichi');
ok(KOGANE_DUEL_MARK === 'kogane-night-duel' && KOGANE_DUEL_COURSE === 'kogane-pass-night', 'the names of the contract');

// ---- The grant rule, through settleRace ------------------------------------------------------------------------------
// The Night road is not built yet. The rule is checked on a stand-in road that has its id.
const day = ALL_CIRCUITS.find(item => item.id === 'kogane-pass');
const standIn = (id, extra = {}) => {
  let at = COURSE.findIndex(item => item.id === id);
  if (at < 0) at = COURSE.push({...day, id, ...extra}) - 1;
  return at;
};
const night = standIn(KOGANE_DUEL_COURSE), dayAt = courseIndex('kogane-pass'), practiceAt = standIn('kogane-practice-stand-in', {practice: true});

const ready = () => {
  let p = createProfile();
  for (const step of [readKoganeLetter, markKoganeLesson, markKoganeSupplies]) p = step(p).profile;
  return p;
};
let runs = 0;
const win = (over = {}) => ({runId: 'run-' + (++runs), stageIndex: night, won: true, completed: true, timeSec: 101.5, laps: 1,
  car: 'stuttgart_959s', driverId: 'club', mode: 'duel', difficulty: 'casual', cpuDifficulty: 'easy', seed: 1989,
  rival: daichiRival('easy'), story: KOGANE_DUEL_MARK, ...over});
const owns = profile => profile.unlockedCars.includes(KOGANE_SKYLINE);
const noGrant = (profile, result, label) => {
  const out = settleRace(profile, result);
  ok(!owns(out.profile) && out.storyCar === undefined && out.storyOwned === undefined && out.storyDuel === undefined, label + ': no car');
  same(storyOf(out.profile), storyOf(profile), label + ': the story is unchanged');
  return out;
};

const first = settleRace(ready(), win());
ok(first.awarded && owns(first.profile) && first.storyCar === KOGANE_SKYLINE && first.storyDuel === 'easy' && first.storyOwned === undefined, 'a story win on the Night road adds the Skyline');
ok(storyOf(first.profile).kogane.duel === 'easy', 'and marks the duel at the level won');
ok(first.reward > 0, 'the ordinary Rival Duel pay is still paid');
{
  const plain = settleRace(ready(), win({story: undefined}));
  ok(first.reward === plain.reward, 'the story adds no pay: the car is the prize');
  const changed = Object.keys(first.profile).filter(key => JSON.stringify(first.profile[key]) !== JSON.stringify(plain.profile[key])).sort();
  same(changed.filter(key => !['history', 'settledResults', 'activeRace'].includes(key)), ['story', 'unlockedCars'], 'the story changes only the car list and the story mark');
}
{
  // The same race settled twice is a duplicate: nothing more happens, and the first is not undone.
  const run = win({runId: 'twice'}), once = settleRace(ready(), run), again = settleRace(once.profile, run);
  same(again.profile, once.profile, 'a duplicate finish changes nothing');
  ok(again.storyCar === undefined && again.awarded === false, 'a duplicate reports no car');
  // A duplicate of a race that was lost first (same key) cannot grant either.
  const lostRun = win({runId: 'lost-then-won', won: false}), lost = settleRace(ready(), lostRun);
  const lateWin = settleRace(lost.profile, {...lostRun, won: true});
  ok(!owns(lateWin.profile), 'a settled race cannot be settled again as a win');
}

const base = ready();
noGrant(base, win({story: undefined}), 'the same rival picked by hand (no story mark)');
noGrant(base, win({story: 'something-else'}), 'another mark');
noGrant(base, win({won: false}), 'a loss');
noGrant(base, win({won: false, beatRival: false}), 'a completed loss');
noGrant(base, win({abandoned: true, completed: false, won: false}), 'an abandoned race');
noGrant(base, win({abandoned: true}), 'an abandoned race that claims a win');
noGrant(base, win({completed: false}), 'an unfinished race');
noGrant(base, win({timeSec: 0}), 'an invalid time');
noGrant(base, win({timeout: true}), 'a timed out race');
noGrant(base, win({laps: 3}), 'a wrong lap count');
noGrant(base, win({practice: true}), 'practice');
noGrant(base, win({qualifying: true}), 'qualifying');
noGrant(base, win({stageIndex: practiceAt}), 'a practice road');
noGrant(base, win({stageIndex: dayAt}), 'the day road, not the Night version');
noGrant(base, win({stageIndex: 9999}), 'a road that does not exist');
noGrant(base, win({mode: 'timetrial'}), 'a time trial');
noGrant(base, win({mode: 'grandprix'}), 'a Grand Prix');
noGrant(base, win({rival: {...daichiRival('easy'), upgradeLevel: 3}}), 'another tuning level');
noGrant(base, win({rival: {...daichiRival('easy'), car: 'stuttgart_959s'}}), 'another rival car');
noGrant(base, win({rival: {...daichiRival('easy'), driverId: 'mara_vale'}}), 'another rival driver');
noGrant(base, win({rival: null}), 'no rival settings');
noGrant(base, win({cpuDifficulty: 'hard'}), 'a level that does not match Daichi\'s tuning');
noGrant(base, win({cpuDifficulty: 'brutal'}), 'an unknown level');
noGrant(createProfile(), win(), 'a player who has not started the story');
noGrant(markKoganeLesson(readKoganeLetter(createProfile()).profile).profile, win(), 'a player who has not delivered the supplies');
noGrant(markKoganeSupplies(createProfile()).profile, win(), 'a player whose supplies are marked without the lesson');
{
  const newer = {...base, story: {version: 2, kogane: {lesson: true, supplies: true}, later: 1}};
  const out = noGrant(newer, win(), 'a story from a newer game');
  same(out.profile.story, newer.story, 'the newer story is kept exactly');
}

// Already owning the Skyline: only the duel mark changes.
{
  const owned = {...ready(), unlockedCars: [...ready().unlockedCars, KOGANE_SKYLINE]};
  const out = settleRace(owned, win({runId: 'owner'}));
  ok(out.storyOwned === true && out.storyCar === undefined && out.storyDuel === 'easy', 'an owner is told the car was already theirs');
  same(out.profile.unlockedCars, owned.unlockedCars, 'the car list is untouched');
  same(storyOf(out.profile).kogane, {...storyOf(owned).kogane, duel: 'easy'}, 'only the duel mark is written');
}
// Marks only rise: a harder win raises it, an easier one later does not lower it, and neither adds a second car.
{
  const easy = settleRace(ready(), win({runId: 'a'}));
  const hard = settleRace(easy.profile, win({runId: 'b', cpuDifficulty: 'hard', rival: daichiRival('hard')}));
  ok(storyOf(hard.profile).kogane.duel === 'hard' && hard.storyOwned === true && hard.profile.unlockedCars.filter(id => id === KOGANE_SKYLINE).length === 1, 'a harder win raises the mark, one car');
  const back = settleRace(hard.profile, win({runId: 'c'}));
  ok(storyOf(back.profile).kogane.duel === 'hard', 'an easier win later does not lower it');
  const direct = markKoganeDuel(hard.profile, 'easy');
  ok(direct.ok && !direct.changed, 'the writer agrees');
}
for (const level of ['medium', 'hard']) {
  const out = settleRace(ready(), win({runId: 'lv-' + level, cpuDifficulty: level, rival: daichiRival(level)}));
  ok(owns(out.profile) && storyOf(out.profile).kogane.duel === level, `a ${level} win grants and marks ${level}`);
}

// ---- Short race checks (the lane tier) ---------------------------------------------------------------------------------
const rates = process.argv.includes('--rates') ? process.argv[process.argv.indexOf('--rates') + 1] : null;
const argNumber = name => process.argv.includes(name) ? Number(process.argv[process.argv.indexOf(name) + 1]) : undefined;
if (!rates) {
  const lessonDuel = race({level: 'easy', skill: .92});
  ok(lessonDuel.won && lessonDuel.status === 'stage_result', `the lesson-pace driver beats Easy Daichi (${lessonDuel.timeSec} s)`);
  for (const level of LEVELS) {
    const solo = race({level, solo: true});
    ok(solo.daichiFinished && solo.daichiTime > 60 && solo.daichiTime < 200 && !solo.stuck, `${level}: Daichi alone finishes the road in ${solo.daichiTime?.toFixed(1)} s`);
    ok(solo.hairpinHits === 0 && solo.resets === 0, `${level}: Daichi does not crash at the first hairpin`);
  }
} else if (rates === 'solo') {
  // Daichi alone, every level at every tuning level: how long he takes to drive the road.
  for (const level of LEVELS) console.log(level.padEnd(7) + [0, 1, 2, 3].map(upgrade => {
    const run = race({level, upgrade, noNitro: process.argv.includes('--no-nitro'), solo: true});
    return `tuning ${upgrade}: ${run.daichiTime?.toFixed(1)} s (${run.hits} hits)`;
  }).join('   '));
} else {
  // ---- The curve: 30 seeded duels per level -----------------------------------------------------------------------------
  const bands = {easy: [.85, 1], medium: [.35, .60], hard: [.10, .30]};
  const lesson = rates === 'lesson', level = lesson ? 'easy' : rates;
  assert.ok(LEVELS.includes(level), 'Choose easy, medium, hard or lesson.');
  const count = lesson ? 10 : 30, range = lesson ? LESSON_RANGE : SKILL_RANGE, upgrade = argNumber('--upgrade'), noNitro = process.argv.includes('--no-nitro'), fixed = argNumber('--skill');
  const rows = [];
  for (let index = 0; index < count; index++) {
    const skill = fixed ?? skillFor(index, count, range);
    rows.push({duel: race({level, skill, upgrade, noNitro, seed: 1989 + index}), solo: null});
  }
  const wins = rows.filter(row => row.duel.won).length, rate = wins / count;
  const duels = rows.map(row => row.duel);
  // Daichi finishes when he crosses the line, or when the driver wins while he is still running and has not stopped.
  const finished = duels.filter(row => (row.daichiFinished || row.won && !row.stuck) && row.hairpinHits === 0).length;
  const solo = race({level, upgrade, noNitro, solo: true});
  console.log(`${lesson ? 'lesson-pace driver on Easy' : level} on ${raceCourseId}, tuning ${duels[0].upgrade}, ${count} duels`);
  console.log(`  driver skill ${range.map(v => v.toFixed(2)).join(' to ')}${fixed ? ` (fixed ${fixed})` : ''}; wins ${wins}/${count} = ${Math.round(rate * 100)}%`);
  console.log(`  times: driver ${Math.min(...duels.map(r => r.timeSec)).toFixed(1)} to ${Math.max(...duels.map(r => r.timeSec)).toFixed(1)} s; Daichi alone ${solo.daichiTime?.toFixed(1)} s`);
  console.log(`  Daichi: finished or running at the end ${finished}/${count}; wall hits ${duels.reduce((n, r) => n + r.hits, 0)}, resets ${duels.reduce((n, r) => n + r.resets, 0)}, ` +
    `at the first hairpin ${duels.reduce((n, r) => n + r.hairpinHits, 0)}, stuck in ${duels.filter(r => r.stuck).length}`);
  console.log('  win by skill: ' + duels.map(r => `${r.skill.toFixed(3)}${r.won ? 'W' : 'L'}`).join(' '));
  if (fixed == null && upgrade == null && !noNitro) {
    if (lesson) ok(wins >= 9, `the lesson-pace driver wins Easy at least 9 of 10 (${wins})`);
    else ok(rate >= bands[level][0] && rate <= bands[level][1], `${level} win rate ${Math.round(rate * 100)}% is inside ${bands[level].map(v => v * 100).join(' to ')}%`);
    ok(finished / count >= .95, `Daichi finishes at least 95% of ${level} races (${finished}/${count})`);
    ok(duels.every(r => r.hairpinHits === 0) && solo.hairpinHits === 0 && solo.daichiFinished, 'Daichi never crashes at the first hairpin and finishes alone');
  }
}
console.log(`story-kogane-duel: ${checks} checks passed`);
