// The invitation reads the existing story ledger. These are outcomes, never shortcuts through a story.
import {COMBAT_TUNING, WEAPONS} from '../../../wasteland-tuning.js';
export const HOME_FOLK = Object.freeze([
  {id: 'slack', name: 'Slack', thread: 'runaway', ends: ['kept', 'paid', 'hidden', 'sent-on'],
    marks: ['runaway/kept', 'runaway/paid', 'runaway/kept-ahead', 'runaway/hidden', 'runaway/sent-on'],
    offer: "If you've a corner and a roof, I'll keep your hens.",
    greet: "Show me which eggs you take, and I'll take them the same way."},
  {id: 'finch', name: 'Finch', thread: 'burned-camp', ends: ['freed', 'bought-back'],
    marks: ['burned-camp/broke-out', 'burned-camp/drain-out', 'burned-camp/creep-out', 'burned-camp/stayed-inside',
      'burned-camp/rebuilt', 'burned-camp/relit', 'burned-camp/moved-to-seep'],
    offer: "I can keep watch from your tower, because I've had plenty of practice watching people.",
    greet: "I count them before I shoot, so I know how many are still coming."},
  {id: 'dace', name: 'Dace', thread: 'dace-goes-looking', ends: ['found-alone', 'fetched', 'found-together', 'stayed'],
    marks: ['dace-goes-looking/square', 'dace-goes-looking/fetched-home', 'dace-goes-looking/went-together', 'dace-goes-looking/he-stayed'],
    offer: "Give me a roof beside your shed, and I'll mend your truck while you're away.",
    greet: "I've looked at your car, and I think I can put it right before you need it again."},
  {id: 'hetty', name: 'Hetty', thread: 'radio-hill-voice', ends: ['second-set', 'two-voices'],
    marks: ['radio-hill-voice/took-the-set', 'radio-hill-voice/two-voices'],
    offer: "Put a mast beside my hut, driver, and you'll hear about riders before you see them.",
    greet: "I'm listening to the roads, driver, so you needn't keep asking whether I'm listening."},
  {id: 'mr-penny', name: 'Mr Penny', thread: 'dry-pump', ends: ['water-back', 'friends-fetched', 'late'],
    marks: ['dry-pump/penny-valve-returned', 'dry-pump/penny-has-friends'],
    offer: "If there's a roof for me, I could put a motor on that pump and call it work completed.",
    greet: "Your pump is in the book as work completed, which makes a pleasant change."},
  {id: 'growers', name: "Marigold's growers", thread: 'burned-camp', ends: ['freed', 'bought-back'],
    marks: ['burned-camp/stayed-inside', 'burned-camp/rebuilt', 'burned-camp/relit', 'burned-camp/moved-to-seep'],
    offer: "Give us a roof by your glass, and we'll tend your beds and bring two good Marans with us.",
    greet: "Those beans won't pick themselves, so it's just as well you've got us."},
]);
export const homeFolkOffer = (world, id) => {
  const row = HOME_FOLK.find(row => row.id === id), story = row && world.open.threads[row.thread];
  if (id === 'slack' && story?.end === 'sent-on' && world.ledger.marks.includes('runaway/told-where')) return false;
  return !!story && row.ends.includes(story.end) && row.marks.some(mark => world.ledger.marks.includes(mark));
};
export const hasHomeFolk = (home, id) => !!home?.folk?.some(row => row.id === id && row.arrived &&
  home.builds.some(hut => hut.kind === 'hut' && hut.stage === 4 && hut.i === row.hut.i && hut.j === row.hut.j));
export const HOME_MARANS = Object.freeze([
  {name: 'Truffle', breed: 'marans', due: 28800}, {name: 'Cocoa', breed: 'marans', due: 28800},
]);
export const HOME_CROSSBOW = Object.freeze({reach: 25, seconds: WEAPONS.crossbow.cooldown, damage: COMBAT_TUNING.armor.crossbow});
