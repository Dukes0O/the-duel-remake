// Brian's lines in the Lab (docs/LAB.md section 8.1): his own clean voice at the bench, with no radio
// filter. Recorded with the same voice and settings as the driving lessons, the helicopter and Ana's
// phone; the text is also the caption. Lines never name credits or prices. The takes are made by
// tools/audio/elevenlabs.mjs and copied unchanged to public/assets/audio/voices/ by
// tools/audio/build-lab-voice.mjs. The Lab's sounds are in lab-cues.js.
import {HELI_RADIO_VOICE} from '../lessons/radio-voice.js';
import {LAB_SOUND_CUES} from './lab-cues.js';

// Brian in the Lab is the same Brian.
export const LAB_VOICE = HELI_RADIO_VOICE;

// How loud a clean line plays, integrated: the instructor's lessons leave the radio chain at about -15 and
// the gatekeeper at about -16 LUFS; this is the level asked for on the card, a little under both so the
// game's master stage has room. Each line's `volume` is its take's loudness brought to this number
// (tools/test-lab-radio.mjs checks it from the files). Raise this one number to make all lines louder.
export const LAB_VOICE_TARGET_LUFS = -18;

export const LAB_LINES = Object.freeze(Object.fromEntries(Object.entries({
  'lab.brian.lift.intro': {file: 'lab-brian-lift-intro.mp3', volume: 2.11, text: 'Kestrel One is on the weighing pad. Add fuel and cargo, raise the collective, and see if she leaves the ground.'},
  'lab.brian.lift.explain': {file: 'lab-brian-lift-explain.mp3', volume: 2.03, text: 'To hover, the rotor has to push the air down as hard as gravity pulls the helicopter down. More weight needs more push, and every rotor has a most it can give.'},
  'lab.brian.lift.pass': {file: 'lab-brian-lift-pass.mp3', volume: 1.92, text: 'Good. Now you know why a heavy load is a hard lift.'},
  'lab.brian.projectile.intro': {file: 'lab-brian-projectile-intro.mp3', volume: 2.26, text: 'Pick a height and a forward speed, drop the parcel, and watch where it lands.'},
  'lab.brian.projectile.explain': {file: 'lab-brian-projectile-explain.mp3', volume: 2.12, text: 'A dropped thing keeps the forward speed it had, so it lands ahead of where you let go. And it falls faster every second. Air slows a spray of water more than a stone, so water falls shorter.'},
  'lab.brian.projectile.pass': {file: 'lab-brian-projectile-pass.mp3', volume: 2.01, text: 'That\'s your aim. Let go early, not right over the target.'},
  'lab.brian.fire.intro': {file: 'lab-brian-fire-intro.mp3', volume: 2.16, text: 'Three switches: gas for heat, wood for fuel, and a lid for air. Let\'s put the fire out three different ways.'},
  'lab.brian.fire.explain': {file: 'lab-brian-fire-explain.mp3', volume: 2.09, text: 'Fire needs heat, fuel and air. Take away any one and it dies. Water takes the heat, a lid takes the air, a cleared strip takes the fuel. Retardant coats plants so they char instead of burn, so planes drop it in front of a fire, not on it.'},
  'lab.brian.fire.pass': {file: 'lab-brian-fire-pass.mp3', volume: 1.97, text: 'Heat, fuel, air. Break any one and the fire is done.'},
  'lab.brian.pendulum.intro': {file: 'lab-brian-pendulum-intro.mp3', volume: 2.31, text: 'Three weights on three strings, then a heavier weight on the same string. The stopwatch times every swing.'},
  'lab.brian.pendulum.explain': {file: 'lab-brian-pendulum-explain.mp3', volume: 2.03, text: 'A swing takes longer on a longer string, and the weight makes no difference. Slow swings are gentler and easier to calm, but a longer cable needs more height.'},
  'lab.brian.pendulum.pass': {file: 'lab-brian-pendulum-pass.mp3', volume: 1.95, text: 'A long cable swings slow, and a slow swing is easy to settle.'},
  'lab.brian.altitude.intro': {file: 'lab-brian-altitude-intro.mp3', volume: 2.09, text: 'A rotor on a test stand at sea level, at Panorama Ridge and at Summit Run. Measure its lift at each.'},
  'lab.brian.altitude.explain': {file: 'lab-brian-altitude-explain.mp3', volume: 2.15, text: 'Higher up the air is thinner. At Summit Run each lungful holds about three quarters of the air it would at sea level, so the rotor has less to push on and the engine makes less power. The game rounds this down a little, to seventy one percent.'},
  'lab.brian.altitude.pass': {file: 'lab-brian-altitude-pass.mp3', volume: 2.01, text: 'Thin air, less lift. Plan your load for the high country.'},
  'lab.brian.strength.intro': {file: 'lab-brian-strength-intro.mp3', volume: 1.93, text: 'Three bars of the same weight: aluminium, steel and carbon fibre. Load them until they bend or snap.'},
  'lab.brian.strength.explain': {file: 'lab-brian-strength-explain.mp3', volume: 2.01, text: 'Aluminium is about a third the weight of steel, size for size. Carbon fibre is lighter still and very stiff, but it snaps instead of bending. Engineers choose by what the part has to do.'},
  'lab.brian.strength.pass': {file: 'lab-brian-strength-pass.mp3', volume: 2.23, text: 'That arm holds the load for the least weight. Well chosen.'},
  'lab.brian.rust.intro': {file: 'lab-brian-rust-intro.mp3', volume: 2.08, text: 'Four steel nails in jars for a week. Dry air, fresh water, salt water, and one with a zinc coat in salt water.'},
  'lab.brian.rust.explain': {file: 'lab-brian-rust-explain.mp3', volume: 2.1, text: 'Iron rusts when water and oxygen reach it, and salt water makes it rust much faster. A zinc coat rusts first and saves the steel under it.'},
  'lab.brian.rust.pass': {file: 'lab-brian-rust-pass.mp3', volume: 2.24, text: 'Right protection for the right part. That\'s how you keep metal alive.'},
  'lab.brian.gforce.intro': {file: 'lab-brian-gforce-intro.mp3', volume: 2.06, text: 'A car on a turning arm. Set the speed and the radius, and watch the weight on the string lean.'},
  'lab.brian.gforce.explain': {file: 'lab-brian-gforce-explain.mp3', volume: 2.07, text: 'In a corner the car pushes you sideways. One g is a push as strong as your own weight. Twice the speed makes four times the push, and half the radius makes twice the push. The cars in this game are allowed between two and a half and three and a half g.'},
  'lab.brian.gforce.pass': {file: 'lab-brian-gforce-pass.mp3', volume: 2.28, text: 'That\'s a proper corner. You can feel that in the seat.'},
  'lab.brian.headings.intro': {file: 'lab-brian-headings-intro.mp3', volume: 2.13, text: 'A map table with a compass and a ruler. Find the heading and the distance between two pads.'},
  'lab.brian.headings.explain': {file: 'lab-brian-headings-explain.mp3', volume: 1.98, text: 'A heading is the compass direction you point. Zero is north, ninety is east, one eighty is south and two seventy is west. A map\'s scale says how many real metres one map unit stands for.'},
  'lab.brian.headings.pass': {file: 'lab-brian-headings-pass.mp3', volume: 2, text: 'A heading and a distance. With those two you can find anything.'},
  'lab.brian.grip.intro': {file: 'lab-brian-grip-intro.mp3', volume: 2.22, text: 'A tyre on the rolling road. Each run, we slide it a little more and graph the grip.'},
  'lab.brian.grip.explain': {file: 'lab-brian-grip-explain.mp3', volume: 1.97, text: 'In the game a tyre keeps all its grip up to four point three degrees of slide. Past that the rubber skates and grip falls. A short squeal says you are at the limit. A long screech says you are past it.'},
  'lab.brian.grip.pass': {file: 'lab-brian-grip-pass.mp3', volume: 2.3, text: 'Right at the limit and no further. That\'s grip.'},
  'lab.brian.downforce.intro': {file: 'lab-brian-downforce-intro.mp3', volume: 2.05, text: 'A wing in the smoke. Turn the fan from fifty to a hundred and fifty miles an hour, and watch the scale.'},
  'lab.brian.downforce.explain': {file: 'lab-brian-downforce-explain.mp3', volume: 2.04, text: 'A racing wing is an aeroplane wing upside down, so it pushes the car onto the road. Twice the speed gives four times the push. More push means more grip in fast corners, but the wing also drags, so top speed falls.'},
  'lab.brian.downforce.pass': {file: 'lab-brian-downforce-pass.mp3', volume: 1.93, text: 'More wing, more grip, less top speed. Choose for the track.'},
  'lab.brian.braking.intro': {file: 'lab-brian-braking-intro.mp3', volume: 2, text: 'The car brakes from fifty and from a hundred miles an hour. You can slide the braking between front and back.'},
  'lab.brian.braking.explain': {file: 'lab-brian-braking-explain.mp3', volume: 2.03, text: 'From a hundred miles an hour a car needs four times the road it needs from fifty. Braking tips the weight forward onto the front tyres, so the front brakes do most of the work. Too much rear brake and the back slides. The bench shows the weight shift at a gentle stop; the distances use the car\'s full braking.'},
  'lab.brian.braking.pass': {file: 'lab-brian-braking-pass.mp3', volume: 1.76, text: 'Double the speed, four times the road. Brake early and brake straight.'},
  'lab.brian.suspension.intro': {file: 'lab-brian-suspension-intro.mp3', volume: 2.1, text: 'A shaker rig under each wheel, a bumpy road and a smooth one. Try soft springs and stiff springs.'},
  'lab.brian.suspension.explain': {file: 'lab-brian-suspension-explain.mp3', volume: 2.24, text: 'Soft springs let the body ride over a bump, so it is shaken less, but it leans more in a corner. Stiff springs pass every bump up into the body and shake it harder, but keep it flatter.'},
  'lab.brian.suspension.pass': {file: 'lab-brian-suspension-pass.mp3', volume: 1.91, text: 'Soft for bumps, stiff for smooth. Now you can set up for the road.'},
  'lab.brian.fuel.intro': {file: 'lab-brian-fuel-intro.mp3', volume: 2.31, text: 'A jerry can on the scale, then the car timed from nought to sixty, full and half full.'},
  'lab.brian.fuel.explain': {file: 'lab-brian-fuel-explain.mp3', volume: 2.16, text: 'Petrol weighs about three quarters of a kilo a litre, so a seventy litre tank holds about fifty two kilos. A lighter car speeds up quicker. Electric cars carry batteries instead, which weigh the same full or empty.'},
  'lab.brian.fuel.pass': {file: 'lab-brian-fuel-pass.mp3', volume: 2.14, text: 'Less fuel, less weight, a quicker car. But you still have to finish the race.'},
  'lab.brian.launch.intro': {file: 'lab-brian-launch-intro.mp3', volume: 2.04, text: 'A small launcher. Set the angle and the speed, and measure how far it goes.'},
  'lab.brian.launch.explain': {file: 'lab-brian-launch-explain.mp3', volume: 2.1, text: 'On flat ground with no air, forty five degrees goes furthest. Air drag, and landing lower than you took off, both make the best angle lower than forty five.'},
  'lab.brian.launch.pass': {file: 'lab-brian-launch-pass.mp3', volume: 2.3, text: 'Right on target. That\'s how you plan a jump.'},
  'lab.brian.wax.intro': {file: 'lab-brian-wax-intro.mp3', volume: 2.29, text: 'Skis on three kinds of snow, with three waxes. We\'ll time every glide.'},
  // LAB-POLISH: the caption is clarified; this one kept take still says its original words.
  'lab.brian.wax.explain': {spokenText: "Cold snow has hard, sharp crystals, so it needs a hard wax. Warm wet snow sticks by suction, so it needs a softer wax and fine grooves in the base to let the water out.", file: 'lab-brian-wax-explain.mp3', volume: 2.12, text: 'Very cold, dry snow has hard, sharp crystals, so it needs a hard wax. Medium snow wants a medium wax. Warm wet snow sticks by suction, so it needs a softer wax and fine grooves in the base to let the water out.'},
  'lab.brian.wax.pass': {file: 'lab-brian-wax-pass.mp3', volume: 2.35, text: 'Right wax for the snow. That\'s free speed.'},
  'lab.brian.secret.reverse': {file: 'lab-brian-secret-reverse.mp3', volume: 1.94, text: 'Huh. A fan that sucks the car onto the road, even standing still. Someone really built that.'},
  'lab.brian.secret.1970': {file: 'lab-brian-secret-1970.mp3', volume: 1.95, text: 'In 1970 the Chaparral 2J raced with two fans sucking it to the ground.'},
  'lab.brian.secret.1978': {file: 'lab-brian-secret-1978.mp3', volume: 2.08, text: 'In 1978 the Brabham BT46B fan car won its first race, the Swedish Grand Prix, and was withdrawn straight after.'},
  'lab.brian.secret.2022': {file: 'lab-brian-secret-2022.mp3', volume: 2.13, text: 'In 2022 the electric McMurtry Spéirling set the Goodwood hill climb record, 39.08 seconds. Its fans pull about two thousand kilos of downforce, even standing still.'},
  'lab.brian.restore.start': {file: 'lab-brian-restore-start.mp3', volume: 1.93, text: 'Salt has been working on her metal for sixty years. First a long soak in fresh water to draw it out, then a small electric current to loosen the rust.'},
  'lab.brian.restore.done': {file: 'lab-brian-restore-done.mp3', volume: 2.06, text: 'Strip, rebuild, paint. There she is. Sixty years under the sea, and she\'s ready to race.'},
}).map(([id, line]) => [id, Object.freeze(line)])));

// The sound-bank records (the same fields as src/sound-bank.js), behind the `lab` switch: the lines on
// the voice bus, one at a time, ducking the mix like the other speech.
const voiceCue = line => Object.freeze({bus: 'voice', volume: line.volume, pitchRange: [1, 1], volumeRange: [1, 1], priority: 90, limit: 1,
  spatial: null, duck: 'voice', flag: 'lab', file: `voices/${line.file}`});
export const LAB_VOICE_CUES = Object.freeze(Object.fromEntries(Object.entries(LAB_LINES).map(([id, line]) => [id, voiceCue(line)])));

// Everything the sound bank adds for the Lab.
export const LAB_CUES = Object.freeze({...LAB_VOICE_CUES, ...LAB_SOUND_CUES});
