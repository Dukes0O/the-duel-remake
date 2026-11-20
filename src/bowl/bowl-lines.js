// Every word Show Night puts on screen (BOWL-HOOKS): Big Mo's captions and the
// results screen. Plain, whole sentences that a person would say out loud, each
// with one job (Kyle, 19 November 2026; docs/story/night-2-lines-review.md).
// Data only: no DOM, no game state. Cards that add events or nights add their
// lines here under the same keys (BOWL-RIVALS, BOWL-TURNS, BOWL-REX-FIGHT).

// The sound each new Show Night event makes. Until the Bowl's own sounds are
// picked (BOWL-FINISH), each plays the stand-in named beside it.
export const BOWL_SOUND_CUES = Object.freeze({
  // BOWL-REX-FIGHT: the Scrapasaurus (src/bowl/bowl-rex.js REX_CUES), each on a stand-in.
  'bowl.rex.roar': 'yeti.roar',             // it rears up and its chest glows: fire is coming (the tell)
  'bowl.rex.fire': 'weapon.flame.start',    // the fire comes out, into the cone drawn on the floor
  'bowl.rex.fire.end': 'weapon.flame.end',  // the fire stops
  'bowl.rex.scorch': 'vehicle.crash-impact', // the fire or a thrown car catches the player's truck
  'bowl.rex.box.open': 'weapon.tesla.charge', // it crouches to rest and a battery box opens, sparking
  'bowl.rex.box.close': 'raider.warning',   // the rest is over and the box closes
  'bowl.rex.box.smash': 'weapon.tesla.pulse', // the truck lands on the open box and smashes it
  'bowl.rex.bump': 'vehicle.crash',         // the truck runs into its legs and is pushed away
  'bowl.rex.lift': 'world.salt.horn',       // it picks up a junk car to throw, and the ring shows on the floor
  'bowl.rex.throw': 'heli.setdown.thud',    // the junk car leaves its jaws
  'bowl.rex.throw.land': 'vehicle.crush',   // the junk car comes down in the ring
  'bowl.rex.eat': 'vehicle.crush',          // it eats a junk car to mend its limp
  'bowl.rex.fall': 'combat.explosion',      // the third box is smashed and it falls over
  'bowl.rex.gate': 'world.furnace.horn',    // it walks out through the car park gate
  'bowl.mo': 'interface.countdown',        // Big Mo starts a caption: a short PA chime
  'bowl.crowd.rise': 'crowd.cheer',        // the crowd meter passes a quarter mark
  'bowl.event.won': 'interface.win',       // an event is won
  'bowl.event.lost': 'interface.lose',     // an event is lost and can be tried again
  'bowl.purse': 'interface.bonus',         // the purse is paid into the scrap wallet
});

export const BOWL_EVENT_NAMES = Object.freeze({
  scrapasaurus: 'The Scrapasaurus', // BOWL-REX-FIGHT
  carCrush: 'Car Crush',
  freestyle: 'Freestyle',
  sideBySide: 'Side by Side',
  lastTruckRolling: 'Last Truck Rolling',
});

// What the player must do now: the HUD's one line for each event.
export const BOWL_GOALS = Object.freeze({
  // BOWL-REX-FIGHT: what to do now, by what the Scrapasaurus is doing.
  scrapasaurus: ({phase, left = 3, last = false} = {}) => phase === 'tell' || phase === 'fire'
    ? 'Fire is coming, so get out of the orange on the floor and stay out until it stops.'
    : phase === 'rest' ? 'A battery box is open, so jump the big ramp now and land on its back.'
      : phase === 'lift' || phase === 'throw' ? 'It is going to throw a car, so keep moving and stay out of the ring on the floor.'
        : phase === 'fallen' ? 'It is falling over, so stay back and enjoy it.'
          : last ? `It is heading for the car park gate, and you still have ${REX_BOXES[left]} to smash.`
            : `Smash ${REX_BOXES[left]}. It rests by the big ramp after it breathes fire there, so meet it then.`,
  carCrush: target => `Drive straight down the line and crush everything you can. Reach ${target} to go on.`,
  freestyle: target => `Do big jumps, flips and crushes to score ${target} points before the clock runs out.`,
  sideBySide: () => 'Race the other truck once round the Bowl and cross the line first.',
  lastTruckRolling: () => 'Knock the other trucks out and be the last one still rolling.',
});

// The Scrapasaurus's battery boxes still to smash, as a person would say it (BOWL-REX-FIGHT).
const REX_BOXES = ['no battery boxes', 'its last battery box', 'two more battery boxes', 'its three battery boxes'];

// The rows of the Car Crush line, by how far the truck got.
export const BOWL_CRUSH_ROWS = Object.freeze([
  'the first row of cars', 'the second row of cars', 'the third row of cars',
  'the buses', 'the burning stack',
]);

// Big Mo, the announcer (docs/WASTELAND_WORLD.md section 7).
export const BIG_MO = Object.freeze({
  // BOWL-REX-FIGHT: the Scrapasaurus. Nights one to four end with a hint of what waits for night five.
  'rex.seen.1': 'Did anybody else hear a roar under the stands just now? No? Good, then it was probably my tummy.',
  'rex.seen.2': 'Something under the stands ate our spare tyres again. I am sure it is nothing to worry about.',
  'rex.seen.3': 'Did you see that big shape behind the wall tonight? Please do not tell anyone about it yet.',
  'rex.seen.4': 'Our driver has beaten every truck in the Bowl, so next time I will have to open the big gate under the stands. I am a little bit scared.',
  'event.scrapasaurus.intro': 'You beat every truck in the Bowl, so here is the Scrapasaurus! It is heading for the car park gate, and if it gets out it will eat every car in the car park.',
  'rex.tell': 'Look at its chest glowing. That means fire is coming, so get out of the orange on the floor.',
  'rex.rest': 'It has stopped to cool down, and a battery box is open. Jump the big ramp and land on its back!',
  'rex.rest.last': 'This is its last rest before the car park gate, so jump the big ramp and land on that box!',
  'rex.smash.1': 'One battery box is smashed! Now it is limping, and it will want a snack.',
  'rex.smash.2': 'Two battery boxes are gone! One more landing and it will fall over.',
  'rex.smash.3': 'That was the last battery box! Everybody stand back, because it is going to fall.',
  'rex.scorch': 'Ouch, that truck got toasted. Keep out of the orange next time.',
  'rex.bump': 'You cannot push it over from the ground. You have to land on its back.',
  'rex.lift': 'It has picked up a car to throw! Keep moving and stay away from the ring on the floor.',
  'rex.eat': 'It is eating a junk car to get its strength back. That is disgusting, and the crowd loves it.',
  'rex.ate': 'It has finished its snack, so it is not limping any more.',
  'rex.gone': 'It walked straight out of the gate and into the car park. The crowd is not happy about their cars.',
  'rex.toasted': 'That truck has been toasted too many times, so we have to stop the show and cool it down.',
  'event.won.scrapasaurus': 'The Scrapasaurus is down, and the crowd is going wild! It will make a lovely ornament for your yard.',
  'event.lost.scrapasaurus': 'The Scrapasaurus won that round, but your truck is ready for another go, so let us try that again.',
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
  // BOWL-REX-FIGHT: how the fight with the Scrapasaurus ended.
  eventRex: ({boxes = 0, reason} = {}) => [
    boxes === 3 ? 'You smashed all three of its battery boxes, and it fell over.'
      : boxes === 0 ? 'You did not smash any of its battery boxes.'
        : `You smashed ${boxes === 1 ? 'one' : 'two'} of its three battery boxes.`,
    reason === 'gate' ? 'It reached the car park gate before you could stop it.'
      : reason === 'toasted' ? 'Its fire and its junk caught your truck too many times.' : null,
  ].filter(Boolean),
  eventRexYard: 'The Scrapasaurus is going to stand in your yard from now on.',
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
