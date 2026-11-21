// Every word Show Night puts on screen (BOWL-HOOKS): Big Mo's captions and the
// results screen. Plain, whole sentences that a person would say out loud, each
// with one job (Kyle, 19 November 2026; docs/story/night-2-lines-review.md).
// Data only: no DOM, no game state. Cards that add events or nights add their
// lines here under the same keys (BOWL-RIVALS, BOWL-TURNS, BOWL-REX-FIGHT).

// The sound each new Show Night event makes. Until the Bowl's own sounds are
// picked (BOWL-FINISH), each plays the stand-in named beside it.
import {SECRETS} from './bowl-secrets.js';

export const BOWL_SOUND_CUES = Object.freeze({
  // BOWL-REX-FIGHT: the Scrapasaurus (src/bowl/bowl-rex.js REX_CUES), each on a stand-in.
  'bowl.rex.roar': 'yeti.roar',             // it rears up and its chest glows: fire is coming (the tell)
  'bowl.rex.fire': 'weapon.flame.start',    // the fire comes out, into the cone drawn on the floor
  'bowl.rex.fire.end': 'weapon.flame.end',  // the fire stops
  'bowl.rex.scorch': 'vehicle.crash-impact', // the fire or a thrown car catches the player's truck
  'bowl.rex.box.open': 'weapon.tesla.charge', // it crouches to rest and a battery box opens, sparking
  'bowl.rex.bump': 'vehicle.crash',         // the truck runs into its legs and is pushed away
  'bowl.rex.lift': 'world.salt.horn',       // it picks up a junk car to throw, and the ring shows on the floor
  'bowl.rex.throw': 'heli.setdown.thud',    // the junk car leaves its jaws
  'bowl.rex.throw.land': 'vehicle.crush',   // the junk car comes down in the ring
  'bowl.rex.burst': 'world.furnace.horn',
  'bowl.rex.sag': 'weapon.flame.end',
  'bowl.rex.rise': 'raider.warning',
  'bowl.rex.sweep': 'weapon.flame.start',
  'bowl.rex.brace': 'yeti.roar',
  'bowl.hook.fire': 'weapon.harpoon.fire',
  'bowl.hook.bite': 'heli.setdown.thud',
  'bowl.hook.clang': 'vehicle.crash',
  'bowl.hook.jerk': 'vehicle.crash-impact',
  'bowl.hook.letgo': 'interface.radar',
  'bowl.rex.box.out': 'weapon.tesla.pulse',
  'bowl.rex.fall': 'combat.explosion',      // the third box is smashed and it falls over
  'bowl.rex.gate': 'world.furnace.horn',    // it walks out through the car park gate
  'bowl.out.over': 'crowd.cheer',
  'bowl.out.leap': 'interface.win',
  'bowl.out.gate': 'world.furnace.horn',
  'bowl.out.back': 'interface.bonus',
  // bowl.out.stands is named by the event for BOWL-SOUND to supply.
  'bowl.secret.start': 'weapon.tesla.pulse',
  'bowl.secret.found': 'interface.win',
  'bowl.secret.cheer': 'crowd.cheer',
  'bowl.secret.armed': 'world.furnace.horn',
  'bowl.secret.hint': 'interface.radar',
  'bowl.trick.late': 'interface.radar',
  // bowl.trick.go is the turn-start rush, with no stand-in.
  'bowl.trick.land': 'interface.bonus',
  'bowl.trick.new': 'interface.win',
  'bowl.trick.slam': 'vehicle.crash',
  'bowl.trick.cyclone': 'crowd.cheer',
  // bowl.trick.wheelie is the engine note; it has no stand-in.
  'bowl.wall.bounce': 'heli.setdown.thud',
  'bowl.wall.hard': 'vehicle.crash',
  'bowl.wall.big': 'vehicle.crash-impact',
  'bowl.wall.scrape': 'vehicle.tires',
  'bowl.race.lights': 'interface.countdown',
  'bowl.race.finish': 'interface.win',
  'bowl.rival.jump': 'heli.setdown.thud',
  'bowl.rival.jump.fallback': 'vehicle.landing',
  'bowl.mo': 'interface.countdown',        // Big Mo starts a caption: a short PA chime
  'bowl.crowd.rise': 'crowd.cheer',        // the crowd meter passes a quarter mark
  'bowl.event.won': 'interface.win',       // an event is won
  'bowl.event.lost': 'interface.lose',     // an event is lost and can be tried again
  'bowl.purse': 'interface.bonus',         // the purse is paid into the scrap wallet
  'bowl.school.tick': 'interface.bonus',
  'bowl.school.next': 'interface.radar',
  'bowl.school.why': 'interface.countdown',
  'bowl.school.done': 'crowd.cheer',
  'bowl.turn.up': 'interface.radar',       // BOWL-TURNS: the pass-the-keyboard screen opens for the next player
  'bowl.turn.winner': 'crowd.cheer',       // BOWL-TURNS: the Turn Show is over and the scoreboard names the winner
  // BOWL-RIVALS: a rival knocked out in Last Truck Rolling plays the arena's wreck
  // cue when the player did it ('arena.wreck-credit', already played by the game's
  // audio for an arena wreck) and Big Mo's chime with his line otherwise.
  // BOWL-SOUND-CRUSH: the crush set, each its own recording (src/sound-bank.js); bowlCrushCues picks them.
  'bowl.crush.car': 'bowl.crush.car',         // the truck's wheels first bite a junk car (four takes in turn)
  'bowl.crush.bus': 'bowl.crush.bus',         // a bus or the RV: longer and deeper, with a boom from the hollow body
  'bowl.crush.stack': 'bowl.crush.stack',     // a burning stack: the deepest, with a rush of sparks
  'bowl.crush.glass': 'bowl.crush.glass',     // a quarter of a second after the bite, on cars and buses: windows going
  'bowl.crush.groan': 'bowl.crush.groan',     // while the wheels are on the wreck: metal groaning, held and let go
  'bowl.crush.off': 'bowl.crush.off',         // the truck comes off the wreck: a clank as it settles
  'bowl.crush.flat': 'bowl.crush.flat',       // a wreck run over again: a dull flat crunch, half as loud
  'bowl.crush.pancake': 'bowl.crush.pancake', // a piece crushed by a truck coming down out of the air
  'bowl.crush.ooh': 'bowl.crush.ooh',         // a bus, the RV, a stack or the Bus Pile: the crowd's "ooh"
});

// What a crushed piece is, for its sound: the course's pieces name their kind (junkCar, bowlBus, bowlRv,
// bowlBurningHeap) and BOWL-CRUSH's field adds the Bus Pile.
export function bowlCrushKind(kind) {
  const name = String(kind || '');
  if (/pile/i.test(name)) return 'pile';
  if (/heap|stack/i.test(name)) return 'stack';
  if (/bus|rv/i.test(name)) return 'bus';
  return 'car';
}

// The sounds of one crush, in order: {cue, at (seconds after the bite), scale}. A pancake on a car replaces the
// bite with the heavier one; on a bigger piece it lands under that piece's own bite. Glass goes a quarter of a
// second later on everything but a stack; the crowd says "ooh" for everything but a car. A wreck run over again
// is the flat crunch alone. The groan and the clank follow the wheels on and off the wreck (src/audio.js).
export function bowlCrushCues({kind, pancake = false, flat = false} = {}) {
  const piece = bowlCrushKind(kind);
  if (flat) return [{cue: 'bowl.crush.flat', at: 0, scale: 1}];
  const bite = piece === 'car' ? 'bowl.crush.car' : piece === 'stack' ? 'bowl.crush.stack' : 'bowl.crush.bus';
  const cues = pancake && piece === 'car' ? [{cue: 'bowl.crush.pancake', at: 0, scale: 1}]
    : [{cue: bite, at: 0, scale: 1}, ...(pancake ? [{cue: 'bowl.crush.pancake', at: 0, scale: .6}] : [])];
  if (piece !== 'stack') cues.push({cue: 'bowl.crush.glass', at: .25, scale: 1});
  if (piece !== 'car') cues.push({cue: 'bowl.crush.ooh', at: .35, scale: 1});
  return cues;
}

// The rivals' names joined as a person would say them: "A", "A and B", "A, B and C".
// Also used by the Turn Show's lines (BOWL-TURNS) below.
const names = list => list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;

export const BOWL_EVENT_NAMES = Object.freeze({
  trickSchool: 'Trick School',
  scrapasaurus: 'The Scrapasaurus', // BOWL-REX-FIGHT
  carCrush: 'Car Crush',
  freestyle: 'Freestyle',
  sideBySide: 'Side by Side',
  lastTruckRolling: 'Last Truck Rolling',
});

// What the player must do now: the HUD's one line for each event.
const FREESTYLE_SCORE_NAMES = ['Old Bess', 'Rust Rhino', 'Tin Lizard', 'Big Kettle', 'Dragon Wagon'];
export const BOWL_GOALS = Object.freeze({
  // BOWL-REX-FIGHT: what to do now, by what the Scrapasaurus is doing.
  scrapasaurus: ({phase, hook, boxes = []} = {}) => {
    if (phase === 'fallen') return 'THE SCRAPASAURUS IS DOWN';
    if (hook?.phase === 'attached') return hook.tight ? 'KEEP PULLING' : 'DRIVE AWAY AND PULL';
    if (phase === 'tell' || phase === 'fire') return 'GET OUT OF THE ORANGE';
    if (phase === 'lift' || phase === 'throw') return 'Dodge the thrown car.';
    if (hook?.phase === 'dragging') return 'PRESS F TO RELEASE';
    if (phase === 'rest') return 'HOOK THE GLOWING BOX';
    return ['WATCH THE SCRAPASAURUS','TWO BOXES LEFT','ONE BOX LEFT'][boxes.filter(Boolean).length];
  },
  carCrush: target => `Drive straight down the line and crush everything you can. Reach ${target} to go on.`,
  freestyle: (target, night = 1) => `Beat ${FREESTYLE_SCORE_NAMES[night - 1] ?? FREESTYLE_SCORE_NAMES[0]}: ${target}.`,
  sideBySide: (rival = 'the other truck') => `Beat ${rival} over two laps.`,
  lastTruckRolling: (left = []) => left.length
    ? `Knock out ${names(left)}, and be the last truck still rolling.`
    : 'Knock the other trucks out and be the last one still rolling.',
});

// The Scrapasaurus's battery boxes still to smash, as a person would say it (BOWL-REX-FIGHT).

// A row of the Car Crush line, named by what stands in it (the rows come from the course).
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
export const BOWL_CRUSH_ROW = Object.freeze({
  cars: n => ORDINALS[n - 1] ? `the ${ORDINALS[n - 1]} row of cars` : `row ${n} of the cars`,
  buses: 'the buses',
  fire: 'the burning stack',
  last: 'the end of the line',
});

// Big Mo, the announcer (docs/WASTELAND_WORLD.md section 7).
export const BIG_MO = Object.freeze({
  'school.done': 'The floor is yours to practise on, and you can find the secrets for yourself if you tap the keys quickly.',
  ...Object.fromEntries(SECRETS.map(trick => ['secret.' + trick.id, 'You found the ' + trick.name.slice(4) + '!'])),
  'secret.all': 'You have found every secret trick in the show!',
  'secret.armed': 'Something has got into that engine!',
  // BOWL-REX-FIGHT: the Scrapasaurus. Nights one to four end with a hint of what waits for night five.
  'rex.seen.1': 'Did anybody else hear a roar under the stands just now? No? Good, then it was probably my tummy.',
  'rex.seen.2': 'Something under the stands ate our spare tyres again. I am sure it is nothing to worry about.',
  'rex.seen.3': 'Did you see that big shape behind the wall tonight? Please do not tell anyone about it yet.',
  'outside.gate': 'Drive off the back of the stands and follow the gate marker to get back in!',
  'rex.seen.4': 'Our driver has beaten every truck in the Bowl, so next time I will have to open the big gate under the stands. I am a little bit scared.',
  'event.scrapasaurus.intro': 'You beat every truck in the Bowl, so here is the Scrapasaurus! It is heading for the car park gate, and if it gets out it will eat every car in the car park.',
  'rex.tell': 'Look at its chest glowing. That means fire is coming, so get out of the orange on the floor.',
  'rex.rest': 'The cage is up. Face the glowing box and fire your hook with F!',
  'rex.out.1': 'One box is out! Press F to drop it. Two to go.',
  'rex.out.2': 'Two out! Let that one go. The last eye is behind its head.',
  'rex.out.3': 'All three are out! Look at it fall!',
  'rex.noBox': 'The box was shut. Wait for the cage to open.',
  'rex.slack': 'The cable is slack. Drive away until it goes tight.',
  'rex.brace': 'It pulled you in, so press Space as you pull.',
  'rex.scorch': 'Ouch, that truck got toasted. Keep out of the orange next time.',
  'rex.bump': 'Circle its legs and aim for the open eye.',
  'rex.lift': 'It has picked up a car to throw! Keep moving and stay away from the ring on the floor.',
  'rex.gone': 'It walked straight out of the gate and into the car park. The crowd is not happy about their cars.',
  'rex.toasted': 'That truck has been toasted too many times, so we have to stop the show and cool it down.',
  'event.won.scrapasaurus': 'The Scrapasaurus is down, and the crowd is going wild! It will make a lovely ornament for your yard.',
  'event.lost.scrapasaurus': 'The Scrapasaurus won that round, but your truck is ready for another go, so let us try that again.',
  'night.1.open': 'Ladies and gentlemen, and also dogs, welcome to the Bowl! Tonight we have a brand new driver, so let us make some noise.',
  'night.2.open': 'Welcome back to the Bowl! Our new driver came back for more, and I can see a few more dogs in the crowd tonight.',
  'night.3.open': 'Tonight there are four trucks in the Bowl, and only one of them will still be rolling at the end.',
  'night.4.open': 'The crowd is bigger than ever tonight. Somebody told them our driver never gives up, and they want to see it for themselves.',
  'night.5.open': 'This is the last night of the season, and something very large is waiting under the stands. Drive carefully, everyone.',
  'lent.truck': 'Our driver has no truck yet, so tonight the show lends its own. Please bring it back in one piece.',
  'event.carCrush.intro': 'First up is the Car Crush. Drive down that line and see how far you can get before the junk stops you.',
  'event.freestyle.intro': 'Now it is Freestyle, and you have ninety seconds to do whatever you like. The louder the crowd gets, the faster the points come in.',
  'event.sideBySide.intro': 'It is time for Side by Side. Two trucks race two laps, and the first one across the line wins.',
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
  'event.won.lastTruckRolling': 'Our driver is still rolling at the end, so the night is theirs!',
  'event.lost.carCrush': 'The junk won that time, but you can have another run at it.',
  'event.lost.freestyle': 'The clock ran out before the score got high enough, so let us try that again.',
  'event.lost.sideBySide': 'The other truck got there first, but you can race it again.',
  'event.lost.lastTruckRolling': 'Another truck won that one, but the trucks are lining up again.',
  // BOWL-RIVALS: who is in the other lane, who is in the Bowl tonight, and who is out.
  'rival.old-bess': 'In the other lane is Old Bess, Moss\'s cousin. She has never once been in a hurry, but she never gives up.',
  'rival.rust-rhino': 'In the other lane is Rust Rhino. Watch out for that horn, because Rust Rhino likes to charge.',
  'rival.big-kettle': 'In the other lane is Big Kettle. It takes a while to get the boiler going, and then it is hard to stop.',
  'rival.tin-lizard': 'In the other lane is Tin Lizard, the quickest and most slippery truck in the show.',
  'rival.dragon-wagon': 'In the other lane is Dragon Wagon, the fastest truck in the show, and it loves to show off on the ramps.',
  'rivals.night.3': 'In the Bowl with our driver tonight are Big Kettle, Tin Lizard and Old Bess.',
  'rivals.night.4': 'In the Bowl with our driver tonight are Rust Rhino, Tin Lizard and Big Kettle.',
  'rivals.night.5': 'In the Bowl with our driver tonight are Dragon Wagon, Rust Rhino and Tin Lizard.',
  'out.old-bess': 'Old Bess is out! She is going to have a little rest now.',
  'out.rust-rhino': 'Rust Rhino is out! That horn will not be charging at anybody else tonight.',
  'out.big-kettle': 'Big Kettle is out, and all the steam has gone out of it.',
  'out.tin-lizard': 'Tin Lizard is out! It was not quick enough to get away this time.',
  'out.dragon-wagon': 'Dragon Wagon is out, and its fire has gone out too.',
  'night.won': 'That is the end of the show, and what a show it was. Thank you all for coming, and that includes the dogs.',
  // A Turn Show go (BOWL-TURNS): one go each, so nobody is told to try again.
  'turn.open': 'Here comes the next driver, so give them a big cheer!',
  'turn.won': 'That go won the event, and it goes straight up on the scoreboard.',
  'turn.lost': 'That go did not win the event, but every point still goes on the scoreboard.',
});

// The results screens. Functions take the facts they need and return one sentence.
export const BOWL_RESULTS = Object.freeze({
  // BOWL-REX-FIGHT: how the fight with the Scrapasaurus ended.
  eventRex: ({boxes = 0, reason} = {}) => [
    boxes === 3 ? 'You pulled out all three battery boxes, and it fell over.'
      : boxes === 0 ? 'Its three battery boxes are still in place.'
        : `You pulled out ${boxes === 1 ? 'one' : 'two'} of its three battery boxes.`,
    reason === 'gate' ? 'It reached the car park gate before you could stop it.'
      : reason === 'toasted' ? 'Its fire and its junk caught your truck too many times.' : null,
  ].filter(Boolean),
  eventRexYard: 'The Scrapasaurus is going to stand in your yard from now on.',
  pickTitle: 'SHOW NIGHT',
  pickIntro: 'Big Mo runs a show at the Bowl every night. Each night is three events, one after the other, and the last night has a fourth.',
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
  eventRows: row => row ? `You crushed your way into ${row}.` : 'You did not reach the first row of cars.',
  eventRace: (won, rival = 'the other truck') => won ? `You crossed the line ahead of ${rival}.`
    : `${rival[0].toUpperCase()}${rival.slice(1)} crossed the line before you.`,
  // BOWL-RIVALS: how Last Truck Rolling ended.
  eventKnockouts: ({won, knockouts = 0, timeUp = false}) => won && timeUp
    ? 'The clock ran out, and of the trucks still rolling, yours hit the others hardest, so the win is yours.'
    : won ? 'Every other truck was knocked out, and yours was the last one still rolling.'
      : timeUp ? 'The clock ran out, and another truck still rolling had hit the others harder than yours.'
        : knockouts === 1 ? 'You knocked out one truck before your own truck was knocked out.'
          : knockouts > 1 ? `You knocked out ${['two', 'three'][knockouts - 2] ?? knockouts} trucks before your own truck was knocked out.`
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

const EVENTS_WON = ['no events', 'one event', 'two events', 'three events'];
const eventsWon = count => EVENTS_WON[count] ?? `${count} events`;

// The Turn Show's screens (BOWL-TURNS). A name is a player's own, as typed.
// Keys that end in Title, Button or Heading are labels; every other line is one sentence.
export const BOWL_TURN_LINES = Object.freeze({
  pickerNote: 'Two or more players can share the keyboard and take turns in a Turn Show.',
  pickerButton: 'TAKE TURNS',
  setupTitle: 'TURN SHOW',
  setupIntro: 'Each player has one go at every event, and only one player drives at a time.',
  setupRules: 'The player who wins the most events wins the night, and points settle a tie.',
  setupPurse: 'A player who wins every event also wins that night in their own save, with its purse in their own wallet.',
  setupPick: 'Pick the players in the order they will drive.',
  setupCount: count => `There are ${count} players in tonight's show.`,
  setupNeedTwo: 'Pick at least two players to start the show.',
  setupFull: 'A Turn Show has room for four players.',
  setupTooFew: 'A Turn Show needs at least two players, so add a player with NEW on the main menu first.',
  setupNightOpen: night => `Night ${night} is open for every player you picked.`,
  setupNightLocked: night => `Night ${night} opens when every player you picked has won night ${night - 1}.`,
  setupStartButton: night => `START NIGHT ${night}`,
  backButton: 'BACK',
  handoffTitle: name => `${name.toUpperCase()} IS UP. PASS THE KEYBOARD.`,
  handoffEvent: (name, event) => `${name}, it is your go at ${event}.`,
  handoffKey: 'Press any key when you are ready, and the countdown will start.',
  readyButton: 'I AM READY',
  hudDriver: name => `${name.toUpperCase()} IS DRIVING`,
  goWonTitle: 'EVENT WON',
  goLostTitle: 'GO OVER',
  goScore: (name, score, event) => `${name} scored ${score.toLocaleString()} points in ${event}.`,
  goWon: 'That go won the event.',
  goLost: 'That go did not win the event, but the points still count.',
  goRows: (name, row) => row ? `${name} crushed their way into ${row}.` : `${name} did not reach the first row of cars.`,
  goRace: (name, won, rival = 'the other truck') => won ? `${name} crossed the line ahead of ${rival}.`
    : `${rival[0].toUpperCase()}${rival.slice(1)} crossed the line before ${name}.`,
  // BOWL-RIVALS: how one go at Last Truck Rolling ended.
  goKnockouts: (name, {won, knockouts = 0, timeUp = false}) => won && timeUp
    ? `The clock ran out, and of the trucks still rolling, ${name}'s hit the others hardest, so the win is ${name}'s.`
    : won ? `Every other truck was knocked out, and ${name}'s was the last one still rolling.`
      : timeUp ? `The clock ran out, and another truck still rolling had hit the others harder than ${name}'s.`
        : knockouts === 1 ? `${name} knocked out one truck before their own truck was knocked out.`
          : knockouts > 1 ? `${name} knocked out ${['two', 'three'][knockouts - 2] ?? knockouts} trucks before their own truck was knocked out.`
            : `${name}'s truck was knocked out before it could knock anyone else out.`,
  goBest: (name, event) => `That is ${name}'s best ever score in ${event}.`,
  goNightWon: (name, night) => `${name} won every event, so night ${night} is won in ${name}'s own save.`,
  goPurse: (name, scrap) => `Big Mo paid ${name} a purse of ${scrap.toLocaleString()} scrap, and it is in ${name}'s own wallet now.`,
  goPurseAlready: name => `${name} already won the purse for this night, so this time the points were for the scoreboard.`,
  goUnsaved: name => `${name}'s save could not be written, so this go lasts only until you close the game.`,
  goNext: (name, event) => `${name} is up next in ${event}.`,
  goLastNext: 'That was the last go of the night, so it is time for the scoreboard.',
  passButton: 'PASS THE KEYBOARD',
  scoreboardButton: 'SEE THE SCOREBOARD',
  leaveButton: 'LEAVE THE SHOW',
  leaveNote: 'If you leave in the middle of the show, the goes already played stay saved and the rest are not played.',
  boardTitle: 'THE SCOREBOARD',
  boardPlayerHeading: 'PLAYER',
  boardTotalHeading: 'TOTAL',
  boardWonHeading: 'WON',
  boardWinner: (name, wins, points) => `${name} wins the night with ${eventsWon(wins)} won and ${points.toLocaleString()} points.`,
  boardTie: list => `${names(list)} tie for the night, with the same events won and the same points.`,
  boardLeading: (name, wins, points) => `${name} is ahead so far, with ${eventsWon(wins)} won and ${points.toLocaleString()} points.`,
  boardLevel: list => `${names(list)} are level so far.`,
  closeButton: 'CLOSE',
});
