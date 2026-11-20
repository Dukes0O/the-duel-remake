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
  // BOWL-RIVALS: a rival knocked out in Last Truck Rolling plays the arena's wreck
  // cue when the player did it ('arena.wreck-credit', already played by the game's
  // audio for an arena wreck) and Big Mo's chime with his line otherwise.
});

// The rivals' names joined as a person would say them: "A", "A and B", "A, B and C".
const names = list => list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;

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
  sideBySide: (rival = 'the other truck') => `Race ${rival} once round the Bowl and cross the line first.`,
  lastTruckRolling: (left = []) => left.length
    ? `Knock out ${names(left)}, and be the last truck still rolling.`
    : 'Knock the other trucks out and be the last one still rolling.',
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
  // BOWL-RIVALS: who is in the other lane, who is in the Bowl tonight, and who is out.
  'rival.old-bess': 'In the other lane is Old Bess, Moss\'s cousin. She has never once been in a hurry, but she never gives up.',
  'rival.rust-rhino': 'In the other lane is Rust Rhino. Watch out for that horn, because Rust Rhino likes to charge.',
  'rival.big-kettle': 'In the other lane is Big Kettle. It takes a while to get the boiler going, and then it is hard to stop.',
  'rival.tin-lizard': 'In the other lane is Tin Lizard, the quickest and most slippery truck in the show.',
  'rival.dragon-wagon': 'In the other lane is Dragon Wagon, the fastest truck in the show, and it breathes fire on the ramps.',
  'rivals.night.3': 'In the Bowl with our driver tonight are Big Kettle, Tin Lizard and Old Bess.',
  'rivals.night.4': 'In the Bowl with our driver tonight are Rust Rhino, Tin Lizard and Big Kettle.',
  'rivals.night.5': 'In the Bowl with our driver tonight are Dragon Wagon, Rust Rhino and Tin Lizard.',
  'out.old-bess': 'Old Bess is out! She is going to have a little rest now.',
  'out.rust-rhino': 'Rust Rhino is out! That horn will not be charging at anybody else tonight.',
  'out.big-kettle': 'Big Kettle is out, and all the steam has gone out of it.',
  'out.tin-lizard': 'Tin Lizard is out! It was not quick enough to get away this time.',
  'out.dragon-wagon': 'Dragon Wagon is out, and its fire has gone out too.',
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
  eventRace: (won, rival = 'the other truck') => won ? `You crossed the line ahead of ${rival}.`
    : `${rival[0].toUpperCase()}${rival.slice(1)} crossed the line before you.`,
  // BOWL-RIVALS: how Last Truck Rolling ended.
  eventKnockouts: ({won, knockouts = 0, timeUp = false}) => won && timeUp
    ? 'The clock ran out, and of the trucks still rolling, yours hit the others hardest, so the win is yours.'
    : won ? 'Every other truck was knocked out, and yours was the last one still rolling.'
      : timeUp ? 'The clock ran out, and another truck still rolling had hit the others harder than yours.'
        : knockouts === 1 ? 'You knocked out one truck before your own truck was knocked out.'
          : knockouts > 1 ? `You knocked out ${knockouts} trucks before your own truck was knocked out.`
            : 'Your truck was knocked out before it could knock anyone else out.',
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
