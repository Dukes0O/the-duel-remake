// HOME-GROUND-1 (docs/HOME_GROUND.md, sections 5, 6 and 15): the player's own ground beside Tin Town, as data. The
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

// On foot: sprinting is the game's own; the third speed (15 m a second, FIGHTER_RULES in src/onfoot.js) is far too
// fast and lasts three seconds, then refills in six.
export const FOOT_BURST = Object.freeze({seconds: 3, refillSeconds: 6});

// Every event's sound cue. OPEN-SOUND chooses and registers the sounds; until then these are names only.
export const HOME_CUES = Object.freeze({
  hammer: 'home.fence.hammer', up: 'home.fence.up', lift: 'home.piece.lift', gate: 'home.gate.hang',
  refused: 'home.place.refused', sprint: 'foot.sprint', burst: 'foot.burst', spent: 'foot.burst.spent',
  viewUp: 'home.view.up', viewDown: 'home.view.down', mark: 'home.mark.set', unmark: 'home.mark.clear',
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
  gateEdge: 'Hang the gate in the outside fence, on the edge of your ground.',
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
// The same test as checkSentence (src/world/open/check-tables.js), written here so that this table imports no rules.
const checkSentence = text => [...(text.includes('—') ? ['"' + text + '" has an em dash.'] : []),
  ...(/[.!?]["')\]*]*$/.test(text.trim()) ? [] : ['"' + text + '" does not end as a sentence.'])];
const wrongWords = [...Object.values(HOME_WORDS), ...HOME_OFFER.lines.map(line => line.words),
  ...HOME_OFFER.choices.map(choice => choice.words)].flatMap(checkSentence);
if (wrongWords.length) throw new Error('Home ground words:\n  ' + wrongWords.join('\n  '));

// The name he starts with, until he types his own.
export const defaultHomeName = playerName => (typeof playerName === 'string' && playerName.trim()
  ? playerName.trim().slice(0, 16) + "'s Ground" : 'My Ground');
