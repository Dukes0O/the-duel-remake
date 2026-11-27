// HOME-GROUND-1 and HOME-GROUND-2 (docs/HOME_GROUND.md, sections 4 to 7 and 15): the player's own ground beside Tin
// Town, as data. The
// rules are in src/world/open/home-rule.js, the part in src/world/open/parts/home.js and the drawing in
// src/world/open/looks/home-ground-look.js. Nothing here reads or writes a save.
import {validateTalkScene} from '../../../story/talk.js';
import {LAND} from '../../scablands-names.js';

// The place, measured on the land on 27 November 2026 (docs/board/cards/HOME-GROUND-1.md, "Claude answers"): its
// north-west corner is 100 m west and 100 m south of Tin Town's centre, so the ground runs from 100 m to 60 m west of
// the centre and from 100 m to 140 m south of it. It rises 0.5 m from its north edge to its south edge.
export const HOME_CORNER = LAND.at('tin-town', -100, 100);
export const HOME_SIZE = 40;   // metres on a side; later steps let it grow a strip at a time
export const HOME_STEP = 2;    // metres: the grid that panels stand on
export const HOME_CELLS = HOME_SIZE / HOME_STEP;

// The pieces of step 1. `cells` is how many grid steps a piece spans; `hammer` the seconds of holding the build key.
// Level 1 is tin (Kyle, 27 November 2026); the timbered level is a later step's.
export const HOME_PIECES = Object.freeze({
  panel: Object.freeze({id: 'panel', name: 'tin panel', cells: 1, hammer: 3, height: 1.8, upCue: 'home.fence.up'}),
  gate: Object.freeze({id: 'gate', name: 'gate', cells: 4, hammer: 4, height: 2.2, upCue: 'home.gate.hang'}),
});
// HOME-GROUND-2: a nest box is knocked together from an old crate in a cell of the grid, not on its lines. It is hammered
// up like a panel, and picked up again free.
// Its size is HOME-GROUND-LOOK-1's crate on its side on two blocks (home-hens-look.js, HOME_NEST_SIZE), with room round it.
export const HOME_BOX = Object.freeze({id: 'box', name: 'nest box', hammer: 2.5, size: .5, height: .55, upCue: 'home.box.up'});
// Auntie Solder has the panels stacked at the ground for him: 76 fence the edge round the gate, and four are over.
export const HOME_PANELS = 80;
// The lane runs from the gate straight across the ground to the far fence, as wide as the gate (section 6).
export const HOME_LANE_CELLS = HOME_PIECES.gate.cells;
// A strike of the hammer is heard this often while the key is held.
export const HAMMER_STRIKE_SECONDS = .6;
// The outline stands this far in front of him.
export const HOME_REACH = 1.6;
// The cursor from above moves this fast, in metres a second.
export const HOME_CURSOR_SPEED = 12;
// The camera from above: straight down over the middle of the ground, high enough to see all of it with room round it.
export const HOME_VIEW = Object.freeze({height: 62, fov: 52, liftSeconds: .7});
// The board with his ground's name stands just outside the gate, on its left.
export const HOME_NAME_LONGEST = 24;

// ---- HOME-GROUND-2: hens, nest boxes and the real clock (sections 4 and 7) ----------------------------------------
// A real day is a hen's week: a Tin Town Brown lays about 6 eggs a week in life (the usual breed-guide figure for a brown
// laying hen), so about 6 a real day here, one every 4 hours. A nest box holds three days of one hen's eggs; when every
// box is full the hens wait, and nothing is lost.
export const HEN_BREEDS = Object.freeze({
  'tin-town-brown': Object.freeze({id: 'tin-town-brown', name: 'Tin Town Brown', egg: 'brown', eggsADay: 6}),
});
export const DAY_SECONDS = 24 * 60 * 60;
export const layInterval = breed => DAY_SECONDS / HEN_BREEDS[breed].eggsADay;
export const BOX_HOLDS = 3 * HEN_BREEDS['tin-town-brown'].eggsADay;
// The old crates Moss leaves: the one the hens came in and a spare. Each becomes one nest box.
export const HOME_CRATES = 2;
// Moss's two hens, with the names they have until he gives his own. The first lays soon after she has a box, so that the
// first egg comes before he leaves (section 15); after that each lays every 4 hours.
export const MOSS_HENS = Object.freeze([
  Object.freeze({name: 'Clover', breed: 'tin-town-brown', due: 120}),
  Object.freeze({name: 'Nutmeg', breed: 'tin-town-brown', due: 420}),
]);
// A hen who had nowhere to lay settles into a box with room this many seconds after the room is made.
export const HEN_SETTLE_SECONDS = 45;
// The laptop's clock is read once when an outing opens. The time since his last visit counts for no more than this, and a
// clock set back counts as no time at all.
export const AWAY_LONGEST = 3 * DAY_SECONDS;
// The board at the gate shows itself once an outing when he comes this near, and stays up this long.
export const BOARD_NEAR = 12;
export const BOARD_SECONDS = 14;
// The build outline goes away when he has pressed none of the build keys for this long.
export const BUILD_IDLE_SECONDS = 10;
// He sees a hen's name when he faces her this near.
export const HEN_LOOK = 4.5;

// On foot: sprinting is the game's own; the third speed (15 m a second, FIGHTER_RULES in src/onfoot.js) is far too
// fast and lasts three seconds, then refills in six.
export const FOOT_BURST = Object.freeze({seconds: 3, refillSeconds: 6});

// Every event's sound cue. OPEN-SOUND chooses and registers the sounds; until then these are names only.
export const HOME_CUES = Object.freeze({
  hammer: 'home.fence.hammer', up: 'home.fence.up', lift: 'home.piece.lift', gate: 'home.gate.hang',
  refused: 'home.place.refused', sprint: 'foot.sprint', burst: 'foot.burst', spent: 'foot.burst.spent',
  viewUp: 'home.view.up', viewDown: 'home.view.down', mark: 'home.mark.set', unmark: 'home.mark.clear',
  // HOME-GROUND-2
  cluck: 'home.hen.cluck', lay: 'home.hen.lay', gather: 'home.egg.gather', boxFull: 'home.box.full',
  boardRead: 'home.board.read', boxUp: 'home.box.up', crateOpen: 'home.crate.open',
});

// What he reads. Every line is a whole sentence.
export const HOME_WORDS = Object.freeze({
  askAuntie: 'This bare ground is spoken for. Ask Auntie Solder about it in town.',
  given: 'Your ground is marked on the map. The tin panels are stacked by its corner.',
  hold: 'Hold B to hammer up the {piece}. Press R to turn it and G to change it.',
  holdMark: 'Hold B to hammer up the {piece} you marked from above.',
  hammering: 'Keep holding B to hammer it up.',
  lift: 'Press B to pick up this {piece}.',
  offGround: 'That is off your ground. Build inside the four stakes.',
  lane: 'That would close the lane from your gate. Keep it 8 metres wide so that machines can get in.',
  onTop: 'Something already stands there. Pick it up first.',
  gateEdge: 'Step up to the edge of your ground to hang the gate.',
  gateLane: 'A panel stands in the lane this gate needs. Pick it up first.',
  noPanels: 'You have no panels left. Pick one up to move it.',
  noGate: 'You have no gate left. Pick it up to move it.',
  panelsLeft: 'You have {count} tin panels left.',
  aboveHelp: 'Move the outline with W, A, S and D. Press B to mark a piece, R to turn it and G to change it. Press V to go back down.',
  aboveClear: 'Press B to clear this mark.',
  aboveBuilt: 'That is built. Go down to the ground to pick it up.',
  viewHint: 'Press V to look down on your ground from above.',
  nameAsk: 'What will you call your ground?',
  nameHint: 'Type a name and press Enter. Press F at the board to change it later.',
  renameHint: 'Press F to change the name on the board.',
  burstReady: 'Hold X for a burst of speed.',
  // HOME-GROUND-2
  startBuild: 'Press B to build here. Press V to look down on your ground from above.',
  holdBox: 'Hold B to hammer the old crate into a nest box. Press G to change it.',
  boxCell: 'A nest box stands there already. Pick it up first.',
  boxLane: 'That would stand in the lane from your gate. Set the nest box beside it.',
  noCrates: 'You have no old crates left. Pick up a nest box to move it.',
  gateLaneBox: 'A nest box stands in the lane this gate needs. Pick it up first.',
  cratesLeft: 'You have {count} old crates left.',
  gather: 'Press F to gather the {count} eggs in this nest box.',
  gatherOne: 'Press F to gather the egg in this nest box.',
  emptyBox: 'This nest box is empty. Press B to pick it up.',
  gathered: 'You gathered {count} eggs. You have {store} eggs in your store.',
  gatheredOne: 'You gathered one egg. You have {store} eggs in your store.',
  laid: '{hen} laid an egg in the nest box.',
  boxFull: 'The nest boxes are full, so your hens have stopped laying until you gather the eggs.',
  henSeen: '{hen}, a Tin Town Brown. Press F to give her a new name.',
  henAsk: 'What will you call this hen?',
  crateWaiting: 'Moss has brought two hens in a crate. Press F to talk to him.',
  firstBox: 'Your hens need somewhere to lay. Press B, then G until you hold an old crate, and hold B to make a nest box.',
  boardHint: 'Press F to read the board again.',
});

// What the board at the gate says (src/world/open/home-rule.js, boardLines). Every line is a whole sentence.
export const BOARD_WORDS = Object.freeze({
  awayMoment: 'You were only away for a moment.',
  away: 'You were away for {time}.',
  awayLong: 'You were away for more than three days, and the board counts only the last three.',
  laidMany: 'Your hens laid {count} eggs while you were gone.',
  laidOne: 'Your hens laid one egg while you were gone.',
  laidNone: 'Your hens laid no eggs while you were gone.',
  full: 'The nest boxes are full, so they stopped laying.',
  noBox: 'They have no nest box yet, so they have not laid.',
  waiting: 'The nest boxes hold {count} eggs, waiting for you to gather them.',
  waitingOne: 'The nest boxes hold one egg, waiting for you to gather it.',
  emptyBoxes: 'The nest boxes are empty.',
  store: 'You have {count} eggs in your store.',
  storeOne: 'You have one egg in your store.',
  storeNone: 'Your store has no eggs in it yet.',
  fenceFirst: 'Close your fence all the way round, and Moss will bring you two hens.',
  crate: 'Moss has left two hens in a crate by your gate.',
});

// Auntie Solder's one talk. The choice gives him the ground (src/world/open/parts/home.js).
export const HOME_OFFER_ID = 'home-ground/offer';
export const HOME_OFFER = Object.freeze({
  id: HOME_OFFER_ID,
  lines: [
    {speaker: 'auntie-solder', words: "There's a bare patch of ground past the gate, on your right as you go out. Nobody has used it in years."},
    {speaker: 'auntie-solder', words: "If you fence it, it's yours. I've had tin panels stacked there for you, and a gate."},
    {speaker: 'auntie-solder', words: 'Leave a wide way in from the gate, because one day you will want to drive a machine in there.'},
  ],
  choices: [{id: 'take', words: "I'll fence it."}],
});
validateTalkScene(HOME_OFFER);

// HOME-GROUND-2: Moss's one talk at the hens' crate, once the fence is closed all the way round.
export const MOSS_HENS_ID = 'home-ground/moss-hens';
export const MOSS_TALK = Object.freeze({
  id: MOSS_HENS_ID,
  lines: [
    {speaker: 'moss', words: "Auntie told me you'd closed your fence, so I've brought you two hens in this crate."},
    {speaker: 'moss', words: "They're Tin Town Browns, the best layers we have. Each one lays about six eggs a day if she has a nest box."},
    {speaker: 'moss', words: 'Knock a nest box together from this crate, and from the spare one I left beside it.'},
    {speaker: 'moss', words: 'Give them names, too. My gran always said a hen comes to her name.'},
  ],
  choices: [{id: 'take', words: "I'll look after them."}],
});
validateTalkScene(MOSS_TALK);
// The same test as checkSentence (src/world/open/check-tables.js), written here so that this table imports no rules.
const checkSentence = text => [...(text.includes('—') ? ['"' + text + '" has an em dash.'] : []),
  ...(/[.!?]["')\]*]*$/.test(text.trim()) ? [] : ['"' + text + '" does not end as a sentence.'])];
const wrongWords = [...Object.values(HOME_WORDS), ...Object.values(BOARD_WORDS),
  ...[HOME_OFFER, MOSS_TALK].flatMap(scene => [...scene.lines.map(line => line.words), ...scene.choices.map(choice => choice.words)])]
  .flatMap(checkSentence);
if (wrongWords.length) throw new Error('Home ground words:\n  ' + wrongWords.join('\n  '));

// The name he starts with, until he types his own. It keeps only the letters a ground's name may have
// (src/world/open/home-rule.js, cleanHomeName), and is short enough to be one: "Kyle_B" gives "KyleB's Ground".
const NAME_SUFFIX = "'s Ground";
export function defaultHomeName(playerName) {
  const kept = typeof playerName === 'string' ? playerName.replace(/[^\p{L}\p{N} -]/gu, '').replace(/\s+/g, ' ').trim() : '';
  // Whole characters only, so that a letter written as two code units is never cut in half.
  let short = '';
  for (const letter of kept) { if (short.length + letter.length > HOME_NAME_LONGEST - NAME_SUFFIX.length) break; short += letter; }
  short = short.trim();
  return short ? short + NAME_SUFFIX : 'My Ground';
}
