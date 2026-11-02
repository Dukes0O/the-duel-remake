// The Water Road in the game (docs/story/wasteland-water-road.md sections 2 and
// 3): what each chapter shows and the one thing to do next, and the story job's
// mark from the Story card's button through the setup, the start and the
// settlement. Behind the `water-road` switch. The save rules are in
// water-save.js, the words in water-lines.js. Nothing here changes a race, a
// fight or the career's own rewards: a won story job only adds its id to
// `story.water.jobs`, in the same profile change as the game's own settlement.
import {COURSE} from '../config.js';
import {WARLORDS, warlordUnlockSatisfied} from '../warlords.js';
import {warlordEnabled} from '../warlords/index.js';
import {isCourseUnlocked, COURSE_PRICES} from '../course-access.js';
import {storyIsNewer} from './story-save.js';
import {WATER_CHAPTERS, waterOf, waterChapterDone, waterChapterOpen, waterJobDone, waterNotesDue, waterRoadWon,
  readWaterNote, markWaterJob, markWaterNotes, markWaterEnd} from './water-save.js';
import {waterJobCaption, WATER_NOTES} from './water-lines.js';

export const WATER_SWITCH = 'water-road';
// The features the story stands on (section 10).
export const WATER_NEEDS = Object.freeze(['hidden-road', 'warlord-cards']);

const courseName = id => COURSE.find(course => course.id === id)?.name ?? id;
// The cheapest of these roads, for a player who owns none of them yet.
const cheapest = courses => [...courses].sort((a, b) => (COURSE_PRICES[a] ?? 0) - (COURSE_PRICES[b] ?? 0))[0];
const buyWords = id => `Buy ${courseName(id)} in Your Courses first (${(COURSE_PRICES[id] ?? 0).toLocaleString('en-US')} credits from any race).`;
const MODE_NAMES = Object.freeze({'fuel-run': 'Fuel Run', 'bounty-hunt': 'Bounty Hunt', 'ambush-alley': 'Ambush Alley',
  'last-car-rolling': 'Last Car Rolling', 'convoy-raid': 'Convoy Raid'});

// The words for each chapter's job: what to do, and the button that starts it.
const JOB_WORDS = Object.freeze({
  sal: {task: 'Win a Mad Max Duel on Sal\'s road: Pacific Canyon Circuit or Red Mesa Corkscrew.', button: 'Race on Sal\'s road', gets: 'The pipe is patched.'},
  dustmonger: {task: 'Win a Fuel Run in the Scrapdome.', button: 'Start a Fuel Run', gets: 'The pump coughs into life.'},
  mirage: {task: 'Win a Bounty Hunt in the Scrapdome. The thief carries the valve.', button: 'Start a Bounty Hunt', gets: 'The valve is back on the pipe.'},
  gunn: {task: 'Hold the fort in Ambush Alley for five waves while Odessa fits the pump.', button: 'Hold the fort', gets: 'The pump house has a roof.'},
  kettle: {task: 'Win Last Car Rolling in the Scrapdome.', button: 'Start Last Car Rolling', gets: 'The boiler boils water clean.'},
  vultures: {task: 'Win a Mad Max Duel on Alpine Serpent. The Vultures have the water truck.', button: 'Race on Alpine Serpent', gets: 'The water truck is home.'},
  tollkeeper: {task: 'Win a Convoy Raid on the Salt Flats. The tanker holds the water.', button: 'Start the Convoy Raid', gets: 'The tanker fills the tower to the top line.'},
  blackiron: {task: 'Beat Baron Blackiron for the Cistern.', button: null, gets: 'Water runs into the camp, and Vesper joins your crew.'},
  magnus: {task: 'Magnus the Magnet heard the water is flowing. Beat him in his scrapyard on the Salt Flats.', button: null,
    gets: 'His card goes on the Story Wall, and the Tesla Coil is yours.'},
});
export const waterChapterGets = id => JOB_WORDS[id]?.gets ?? '';

// The roads and games that add a territory's hold (wasteland-career.js and arena-settlement.js), in plain words.
function holdWords(warlord) {
  const roads = warlord.id === 'sal' ? 'Sal\'s road' : warlord.courses.map(courseName).join(' or ');
  return warlord.id === 'kettle' ? `${roads} or in the Scrapdome against two or more cars` : roads;
}

// What one chapter shows. `where` is 'menu' (the main menu's Story card) or 'yard' (the Story Wall): arena games and
// fights start only in the yard, so from the menu their button goes to the yard first.
export function waterChapterView(profile, n, {where = 'yard', jobAvailable = () => ({open: true}), courseOwned = () => true} = {}) {
  const chapter = WATER_CHAPTERS[n];
  const id = chapter.id, done = waterChapterDone(profile, n);
  const base = {id, n, state: done ? 'done' : waterChapterOpen(profile, n) ? 'open' : 'locked', note: '', button: '', bar: null, action: null};
  if (n === 0) return {...base, note: done ? 'Hollis\'s note is read.' : 'Read Hollis\'s note above.'};
  const warlord = WARLORDS[chapter.warlordId], words = JOB_WORDS[id];
  const yardOnly = action => where === 'menu' && action.type !== 'race' ? {type: 'yard', then: action} : action;
  if (done) return {...base, note: `${warlord.name} is beaten. ${words.gets}`, jobDone: true};
  if (base.state === 'locked') return {...base, note: n === 1 ? 'Read Hollis\'s note first.' : `Beat ${WARLORDS[WATER_CHAPTERS[n - 1].warlordId].name} first.`};
  // A warlord with no territory (Magnus): no hold, the fight opens with the chapter.
  if (!warlord.territoryId) {
    if (!warlordUnlockSatisfied(profile, id)) return {...base, state: 'locked', note: `Beat ${WARLORDS[WATER_CHAPTERS[n - 1].warlordId].name} first.`};
    const step = yardOnly({type: 'fight', warlordId: id});
    return {...base, note: words.task, button: step.type === 'yard' ? 'Go to the yard' : `Fight ${warlord.name}`, action: step};
  }
  const career = profile?.wasteland, hold = Math.max(0, Math.min(100, Number.isSafeInteger(career?.territories?.[id]?.hold) ? career.territories[id].hold : 0));
  const wins = Math.ceil((100 - hold) / 25), fightOpen = warlordUnlockSatisfied(profile, id);
  const holdBar = {value: hold, max: 100, label: fightOpen ? `${warlord.name}'s fight is open.` :
    `${wins} more ${wins === 1 ? 'win' : 'wins'} on ${holdWords(warlord)} ${wins === 1 ? 'opens' : 'open'} the fight.`};
  const jobDone = waterJobDone(profile, n);
  const jobFacts = chapter.job && !jobDone ? jobAvailable(chapter.job, id) : null;
  // 1. The chapter's job, while it is still to do and its game is open.
  if (jobFacts?.open) {
    const action = chapter.job.kind === 'race'
      ? {type: 'race', mark: id, courseId: chapter.job.courses.find(course => courseOwned(course)) ?? chapter.job.courses[0], courses: chapter.job.courses}
      : {type: 'arena', mark: id, mode: chapter.job.mode, venueId: chapter.job.venueId};
    const ready = action.type !== 'race' || courseOwned(action.courseId);
    if (ready) {
      const step = yardOnly(action);
      return {...base, note: words.task + (fightOpen ? ` ${warlord.name}'s fight is open too.` : ''),
        button: step.type === 'yard' ? 'Go to the yard' : words.button, bar: holdBar, action: step, job: true};
    }
    // A road the player does not own yet: the button opens Your Courses.
    if (!fightOpen) {
      const road = cheapest(chapter.job.courses);
      return {...base, note: `${words.task} ${buyWords(road)}`, button: 'Open Your Courses', bar: holdBar,
        action: {type: 'courses', courseId: road}, job: true};
    }
  }
  // 2. The fight, once its hold is full.
  if (fightOpen) {
    const step = yardOnly({type: 'fight', warlordId: id});
    return {...base, note: chapter.job && !jobDone ? `${warlord.name}'s fight is open. ${jobFacts?.why ?? ''}`.trim() : `${warlord.name}'s fight is open.`,
      button: step.type === 'yard' ? 'Go to the yard' : `Fight ${warlord.name}`, bar: holdBar, action: step, jobDone};
  }
  // 3. More hold: the territory's road, or the Scrapdome for Kettle. A job whose game is not open yet says what opens it.
  const jobBar = jobFacts && !jobFacts.open && jobFacts.rank ? {value: Math.min(career?.rank || 1, jobFacts.rank), max: jobFacts.rank,
    label: `${MODE_NAMES[chapter.job.mode]} opens at rank ${jobFacts.rank}. You are rank ${career?.rank || 1}. Every race counts.`} : null;
  // Kettle's hold also grows in the Scrapdome, open to everyone; the others need one of their own roads.
  const road = warlord.courses.find(course => courseOwned(course));
  const action = road ? {type: 'race', courseId: road, courses: warlord.courses} : id === 'kettle' ?
    {type: 'arena', mode: 'last-car-rolling', venueId: 'scrapdome'} : {type: 'courses', courseId: cheapest(warlord.courses)};
  const step = action.type === 'courses' ? action : yardOnly(action);
  const roadButton = action.type === 'courses' ? 'Open Your Courses' : road ? `Race on ${id === 'sal' ? 'Sal\'s road' : courseName(road)}` : 'Start Last Car Rolling';
  const why = (jobFacts && !jobFacts.open ? ` ${jobFacts.why}` : '') + (action.type === 'courses' ? ` ${buyWords(action.courseId)}` : '');
  return {...base, note: ((chapter.job && !jobDone ? words.task : `Fill ${warlord.name}'s hold to open the fight.`) + why).trim(),
    button: step.type === 'yard' ? 'Go to the yard' : roadButton, bar: jobBar ?? holdBar, holdBar, action: step, jobDone};
}

// Whether a job's game can be played now, and if not, why (and the rank it needs).
export function waterJobAvailable(app, job) {
  if (job.kind === 'race') return {open: true};
  const rank = app.profile?.wasteland?.rank || 1;
  const open = job.mode === 'fuel-run' ? app.fuelRunAvailable?.() : job.mode === 'bounty-hunt' ? app.bountyHuntAvailable?.() :
    job.mode === 'ambush-alley' ? app.ambushAlleyAvailable?.() : job.mode === 'convoy-raid' ? app.convoyRaidAvailable?.() : app.arenaAvailable?.();
  if (open === true) return {open: true};
  if (job.rank && rank < job.rank) return {open: false, rank: job.rank, why: `${MODE_NAMES[job.mode]} opens at rank ${job.rank}.`};
  if (job.mode === 'convoy-raid') return {open: false, why: 'Win a Mad Max Duel on Neon Docks Circuit first to find the convoy.'};
  return {open: false, why: `${MODE_NAMES[job.mode]} is not open yet.`};
}

// The game side: one per App. Reads the app; writes the profile only through water-save.js.
export function createWaterRoad(app) {
  let pending = null;   // the Story card asked for a job: {kind, mark, courses | mode + venueId}
  let run = null;       // the run started as a story job: {runId, mark, kind, mode, venueId}
  const on = () => app._switches().enabled(WATER_SWITCH) === true;
  const available = () => !!app.player && on() && WATER_NEEDS.every(name => app._switches().enabled(name) === true) &&
    app.wastelandUnlocked?.() === true && !storyIsNewer(app.profile);
  // The chapters shown: a warlord whose fight is switched off has no chapter yet (chapter 9 until Magnus is on).
  const shown = () => WATER_CHAPTERS.filter(chapter => !chapter.warlordId ||
    warlordEnabled({featureFlags: app._switches()}, chapter.warlordId));
  const view = (n, where) => waterChapterView(app.profile, n, {where,
    jobAvailable: job => waterJobAvailable(app, job), courseOwned: id => isCourseUnlocked(app.profile, id)});

  function props(where = 'menu') {
    if (!available()) return {available: false, step: null, read: false, steps: [], lead: ''};
    const water = waterOf(app.profile), chapters = shown();
    const next = chapters.find(chapter => !waterChapterDone(app.profile, chapter.n));
    const steps = chapters.map(chapter => view(chapter.n, where));
    return {available: true, step: next ? next.id : 'done', chapter: next ? next.n : WATER_CHAPTERS.length, read: water.read === true,
      steps, notesShown: water.notes ?? 0, notesDue: waterNotesDue(app.profile), ended: water.end === true,
      // Chapter 9 is shown and done: Magnus is beaten too.
      ninth: chapters.length > 9 && waterChapterDone(app.profile, 9),
      // V.'s notes so far, under Hollis's (one after each chapter done, up to seven).
      notes: WATER_NOTES.slice(0, waterNotesDue(app.profile)).map(note => note.text),
      // A message waits while Hollis's note is unread or a note from V. has not been seen.
      message: water.read !== true || waterNotesDue(app.profile) > (water.notes ?? 0)};
  }
  // Opening the card reads Hollis's note and V.'s notes so far. Only the red dot goes away.
  function open() {
    if (!available()) return false;
    let profile = app.profile, changed = false;
    for (const write of [readWaterNote, p => markWaterNotes(p, waterNotesDue(p))]) {
      const out = write(profile);
      if (out.ok && out.changed) { profile = out.profile; changed = true; }
    }
    if (changed) { app.profile = profile; app._saveProfile(); }
    return true;
  }
  // A chapter's button. Returns what the screen must do next: {setup: 'race'} (the menu shows the filled setup),
  // {setup: 'arena', mode, venueId} (the yard's Scrapdome panel, filled), {started: true} (a fight began), {yard: true}.
  function step(id, where = app.isYardHomeActive?.() ? 'yard' : 'menu') {
    if (!available()) return null;
    const n = shown().find(chapter => chapter.id === id)?.n ?? -1;
    const chapterView = n >= 0 ? view(n, where) : null;
    const action = chapterView?.state === 'open' ? chapterView.action : null;
    if (!action) return null;
    pending = null;
    if (action.type === 'yard') return app.visitWasteland?.() ? {yard: true} : null;
    // Your Courses is on the main menu.
    if (action.type === 'courses') {
      if (app.duel.state.status !== 'menu') app.returnToMenu();
      return app.duel.state.status === 'menu' ? {courses: action.courseId} : null;
    }
    if (action.type === 'fight') return app.startWarlordFight(action.warlordId) ? {started: true} : null;
    if (action.type === 'arena') {
      if (!app.isYardHomeActive?.()) return null;
      if (action.mark) pending = {kind: 'arena', mark: action.mark, mode: action.mode, venueId: action.venueId};
      return {setup: 'arena', mode: action.mode, venueId: action.venueId};
    }
    // A race: back to the menu, the setup filled (the road and Mad Max Duel). The player still presses START.
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (app.duel.state.status !== 'menu' || !app.setRaceSettings({eventId: action.courseId, mode: 'wasteland'})) return null;
    if (action.mark) pending = {kind: 'race', mark: action.mark, courses: action.courses};
    return {setup: 'race'};
  }
  // Changing the road (to one off the job's list) or the mode cancels a story race, so it cannot be won by accident.
  function settingsChanged(values, now) {
    if (pending?.kind !== 'race') return;
    const eventId = Object.hasOwn(values, 'eventId') ? values.eventId : now.eventId, mode = Object.hasOwn(values, 'mode') ? values.mode : now.mode;
    if (!pending.courses.includes(eventId) || mode !== 'wasteland') pending = null;
  }
  // The yard's Scrapdome choices: another mode or venue cancels a story game.
  function arenaChoice({mode, venueId} = {}) {
    if (pending?.kind === 'arena' && (mode !== undefined && mode !== pending.mode || venueId !== undefined && venueId !== pending.venueId)) pending = null;
  }
  // At the start: is this the story's race, or a restart of it? Consumes the request either way. Returns the caption to
  // play (none on a restart), or null.
  function raceStarted({stage, mode, runId, rematch = false}) {
    const asked = pending; pending = null;
    const again = rematch && run?.kind === 'race' ? run : null;
    run = null;
    if (!available() || mode !== 'wasteland') return null;
    const story = asked?.kind === 'race' ? asked : again;
    if (!story || !story.courses.includes(stage?.id)) return null;
    run = {runId, mark: story.mark, kind: 'race', courses: story.courses};
    return again ? null : waterJobCaption(story.mark);
  }
  // At an arena start: the story's game, or a rematch of it (same mode and venue, from its results). A warlord fight never is.
  function arenaStarted({mode, venueId, warlordId, runId, rematch}) {
    const asked = pending; pending = null;
    const again = rematch && run?.kind === 'arena' && run.mode === mode && run.venueId === venueId ? run : null;
    run = null;
    if (!available() || warlordId) return null;
    const mark = asked?.kind === 'arena' && asked.mode === mode && asked.venueId === venueId ? asked.mark : again?.mark;
    if (!mark) return null;
    run = {runId, mark, kind: 'arena', mode, venueId};
    return again ? null : waterJobCaption(mark);
  }
  // The settlement: a won story job adds its mark to the profile the game is about to save. Anything else changes nothing.
  // Returns {profile, mark} with the mark written, or null.
  function settle(profile, {runId, won, stageId}) {
    if (!available() || !run || run.runId !== runId || won !== true) return null;
    // A race job counts only on its own roads: NEXT CIRCUIT after a loss keeps the run but leaves the job's road.
    if (run.kind === 'race' && !run.courses.includes(stageId)) return null;
    const out = markWaterJob(profile, run.mark);
    return out.ok && out.changed ? {profile: out.profile, mark: run.mark} : null;
  }
  // The water works' stage: warlord chapters done in order (0 to 8), or null while the story is not shown.
  // Chapter 0 is Hollis's note, so the first warlord beaten is stage 1. The tower is full with the Baron (chapter 9 adds nothing).
  function stage() {
    if (!available() || storyIsNewer(app.profile)) return null;
    // Warlords beaten in ladder order, whether or not Hollis's note is read yet (a returning player's yard is not dry).
    const at = WATER_CHAPTERS.slice(1, 9).findIndex(chapter => !waterChapterDone(app.profile, chapter.n));
    return at === -1 ? 8 : at;
  }
  // Leaving to the menu, quitting or a new player: no story job waits or runs.
  function clear() { pending = null; run = null; }
  // The yard visit after the Baron: Hollis's two end lines, once.
  function yardArrived() {
    if (!available() || !waterRoadWon(app.profile)) return false;
    const out = markWaterEnd(app.profile);
    if (!out.ok || !out.changed) return false;
    app.profile = out.profile; app._saveProfile();
    return true;
  }
  return {available, on, props, open, step, stage, settingsChanged, arenaChoice, raceStarted, arenaStarted, settle, clear, yardArrived,
    get pending() { return pending; }, get run() { return run; }};
}
