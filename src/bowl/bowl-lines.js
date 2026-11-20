// Every word Show Night puts on screen (BOWL-HOOKS): Big Mo's captions and the
// results screen. Plain, whole sentences that a person would say out loud, each
// with one job (Kyle, 19 November 2026; docs/story/night-2-lines-review.md).
// Data only: no DOM, no game state. Cards that add events or nights add their
// lines here under the same keys (BOWL-RIVALS, BOWL-TURNS, BOWL-REX-FIGHT).

// The sound each new Show Night event makes. Until the Bowl's own sounds are
// picked (BOWL-FINISH), each plays the stand-in named beside it.
export const BOWL_SOUND_CUES = Object.freeze({
  'bowl.mo': 'interface.countdown',        // Big Mo starts a caption: a short PA chime
  'bowl.crowd.rise': 'crowd.cheer',        // the crowd meter passes a quarter mark
  'bowl.event.won': 'interface.win',       // an event is won
  'bowl.event.lost': 'interface.lose',     // an event is lost and can be tried again
  'bowl.purse': 'interface.bonus',         // the purse is paid into the scrap wallet
});

export const BOWL_EVENT_NAMES = Object.freeze({
  carCrush: 'Car Crush',
  freestyle: 'Freestyle',
  sideBySide: 'Side by Side',
  lastTruckRolling: 'Last Truck Rolling',
});

// What the player must do now: the HUD's one line for each event.
export const BOWL_GOALS = Object.freeze({
  carCrush: target => `Drive straight down the line and crush everything you can. Reach ${target} to go on.`,
  freestyle: target => `Do big jumps, flips and crushes to score ${target} points before the clock runs out.`,
  sideBySide: () => 'Race the other truck once round the Bowl and cross the line first.',
  lastTruckRolling: () => 'Knock the other trucks out and be the last one still rolling.',
});

// The rows of the Car Crush line, by how far the truck got.
export const BOWL_CRUSH_ROWS = Object.freeze([
  'the first row of cars', 'the second row of cars', 'the third row of cars',
  'the buses', 'the burning stack',
]);

// Big Mo, the announcer (docs/WASTELAND_WORLD.md section 7).
export const BIG_MO = Object.freeze({
  'night.1.open': 'Ladies and gentlemen, and also dogs, welcome to the Bowl! Tonight we have a brand new driver, so let us make some noise.',
  'night.2.open': 'Welcome back to the Bowl! Our new driver came back for more, and I can see a few more dogs in the crowd tonight.',
  'night.3.open': 'Tonight there are four trucks in the Bowl, and only one of them will still be rolling at the end.',
  'night.4.open': 'The crowd is bigger than ever tonight. Somebody told them our driver never gives up, and they want to see it for themselves.',
  'night.5.open': 'This is the last night of the season, and something very large is waiting under the stands. Drive carefully, everyone.',
  'lent.truck': 'Our driver has no truck of their own, so tonight they are driving the show truck. Please bring it back in one piece.',
  'event.carCrush.intro': 'First up is the Car Crush. Drive down that line and see how far you can get before the junk stops you.',
  'event.freestyle.intro': 'Now it is Freestyle, and you have ninety seconds to do whatever you like. The louder the crowd gets, the faster the points come in.',
  'event.sideBySide.intro': 'It is time for Side by Side. Two trucks go once round the Bowl, and the first one over the line goes on.',
  'event.lastTruckRolling.intro': 'Here comes Last Truck Rolling. Four trucks go in, and the last one still moving wins.',
  'moment.crush': 'That car is now a pancake, and the crowd loves pancakes.',
  'moment.carLaunch': 'Did you see that? The truck drove up a car and took off like a rocket.',
  'moment.bigJump': 'What a jump! That truck was in the air longer than my last holiday.',
  'moment.flip': 'A full flip, and it landed on its wheels! I did not know trucks could do that.',
  'moment.roof': 'That one landed on its roof, but the crowd still liked it, and so did I.',
  'moment.donut': 'Round and round it goes. That is a proper donut, and the dirt is everywhere.',
  'crowd.25': 'The crowd is starting to warm up.',
  'crowd.50': 'Listen to that! The crowd is on its feet now.',
  'crowd.75': 'The crowd is going wild, so every trick is worth more right now.',
  'crowd.100': 'I have never heard the Bowl this loud. Keep it going!',
  'event.won.carCrush': 'That truck went a long way down the line. On to the next event!',
  'event.won.freestyle': 'That was a Freestyle to remember, and the score is good enough to go on.',
  'event.won.sideBySide': 'Our driver crossed the line first, so the night is theirs!',
  'event.won.lastTruckRolling': 'Our driver is the last truck rolling, so the night is theirs!',
  'event.lost.carCrush': 'The junk won that time, but you can have another run at it.',
  'event.lost.freestyle': 'The clock ran out before the score got high enough, so let us try that again.',
  'event.lost.sideBySide': 'The other truck got there first, but you can race it again.',
  'event.lost.lastTruckRolling': 'Our driver was knocked out, but the trucks are lining up again.',
  'night.won': 'That is the end of the show, and what a show it was. Thank you all for coming, and that includes the dogs.',
});

// The results screens. Functions take the facts they need and return one sentence.
export const BOWL_RESULTS = Object.freeze({
  pickTitle: 'SHOW NIGHT',
  pickIntro: 'Big Mo runs a show at the Bowl every night. Each night is three events, one after the other.',
  pickTruckOwned: 'You will drive your own Titan tonight.',
  pickTruckLent: 'You have no truck of your own, so the show will lend you its truck for the night. It goes back to the show when you leave.',
  pickNightOpen: night => `Night ${night} is ready to start.`,
  pickNightWon: night => `You have already won night ${night}, so you can play it again for fun.`,
  pickNightLocked: night => `Win night ${night - 1} to open night ${night}.`,
  pickNightLater: 'The later nights need more trucks in the Bowl, so they are not ready yet.',
  pickStart: night => `START NIGHT ${night}`,
  eventWonTitle: 'EVENT WON',
  eventLostTitle: 'TRY AGAIN',
  eventScore: score => `You scored ${score.toLocaleString()} points in this event.`,
  eventRows: rows => rows > 0 ? `You crushed your way into ${BOWL_CRUSH_ROWS[rows - 1]}.` : 'You did not reach the first row of cars.',
  eventRace: won => won ? 'You crossed the line ahead of the other truck.' : 'The other truck crossed the line before you.',
  eventNext: name => `Next up is ${name}.`,
  eventRetry: name => `Have another go at ${name}. Your score from that run does not count towards the night.`,
  nextButton: 'NEXT EVENT',
  retryButton: 'TRY AGAIN',
  nightTitle: night => `NIGHT ${night} WON`,
  nightTotal: score => `Your score for the whole night is ${score.toLocaleString()} points.`,
  nightPurse: scrap => `Big Mo paid you a purse of ${scrap.toLocaleString()} scrap, and it is in your wallet now.`,
  nightPurseAlready: 'You already won the purse for this night, so this time you played for the crowd.',
  nightPurseUnsaved: 'The purse could not be saved, so it lasts only until you close the game.',
  nightBest: name => `That is your best ever score in ${name}.`,
  nightTruckBack: 'The show truck goes back to the show until your next night.',
  yardButton: 'BACK TO THE YARD',
  menuButton: 'MAIN MENU',
  pickButton: 'CHOOSE ANOTHER NIGHT',
  leaveButton: 'LEAVE THE SHOW',
  closeButton: 'CLOSE',
  leaveNote: 'If you leave in the middle of a night, the purse is not paid.',
});
