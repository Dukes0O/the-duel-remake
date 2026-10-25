// Ana's lines on the through-water phone (docs/THE_DEEP.md section 6.7): a warm
// stock voice, Bella, not used by any crew member, the helicopter radio or the
// driving instructor. The text is also the caption. Lines never name prices.
// The takes are made by tools/audio/elevenlabs.mjs and copied unchanged to
// public/assets/audio/voices/ by tools/audio/build-deep-phone.mjs.

export const DEEP_PHONE_VOICE = Object.freeze({name: 'Bella', voiceId: 'hpp4J3VqNfWAUOO0d1Us'});

export const DEEP_PHONE_LINES = Object.freeze(Object.fromEntries(Object.entries({
  'deep.ana.hello': {file: 'deep-ana-hello.mp3', volume: 0.62, text: 'Hello? You found the old ramp! I\'m Ana, at the field station. If you\'re staying down, could you help me count what lives here? Drive up slow and close, and the log does the rest.'},
  'deep.ana.legend': {file: 'deep-ana-legend.mp3', volume: 0.65, text: 'And keep your eyes open. In 1966 my grandmother\'s race car went over the side out here in a storm. Nobody has ever found it.'},
  'deep.ana.badge': {file: 'deep-ana-badge.mp3', volume: 0.37, text: 'Is that a Falcone badge? It is! Hold on, I\'m sending you a sonar.'},
  'deep.ana.sonar': {file: 'deep-ana-sonar.mp3', volume: 0.74, text: 'Press R to ping. Sound runs through water at fifteen hundred metres a second, and the sonar times the echo. The blip shows where something solid is.'},
  'deep.ana.bag': {file: 'deep-ana-bag.mp3', volume: 0.57, text: 'Stop right beside it and press F. One litre of air lifts about one kilo down there, so one bag will carry that.'},
  'deep.ana.part': {file: 'deep-ana-part.mp3', volume: 0.77, text: 'Got it. My boat\'s got it. That\'s a real piece of the Sirena.'},
  'deep.ana.norseman': {file: 'deep-ana-norseman.mp3', volume: 0.79, text: 'You know, this isn\'t the only car on the sea floor. A Chrysler show car went down with a big liner in 1956, and it\'s still there today.'},
  'deep.ana.deep': {file: 'deep-ana-deep.mp3', volume: 0.53, text: 'Five pieces, all light ones. The heavy part must have gone straight down. Try the edge of the drop-off.'},
  'deep.ana.car': {file: 'deep-ana-car.mp3', volume: 0.76, text: 'That\'s her. That\'s the Sirena. She\'s heavy, so it\'ll take four bags.'},
  'deep.ana.raised': {file: 'deep-ana-raised.mp3', volume: 0.56, text: 'She\'s coming up! Look at that. Sixty years in the dark.'},
  'deep.ana.lab': {file: 'deep-ana-lab.mp3', volume: 0.75, text: 'She\'ll need a lot of work. Salt gets into the metal. Take her to the Lab.'},
  'deep.ana.cup': {file: 'deep-ana-cup.mp3', volume: 0.6, text: 'Grandma Rosa watched you race. She says thank you. The Sirena finally ran the Coast Cup.'},
  'deep.ana.log': {file: 'deep-ana-log.mp3', volume: 0.61, text: 'That\'s one for the survey. Thank you.'},
  'deep.ana.page': {file: 'deep-ana-page.mp3', volume: 0.58, text: 'That\'s every animal on the Kelp Coast. That page is done.'},
  'deep.ana.pearl': {file: 'deep-ana-pearl.mp3', volume: 0.37, text: 'A pearl! Abalone hardly ever make them. Keep it safe.'},
  'deep.ana.otter': {file: 'deep-ana-otter.mp3', volume: 0.55, text: 'See the otters? They eat the sea urchins. No otters, no kelp forest.'},
}).map(([id, line]) => [id, Object.freeze(line)])));

// The sound-bank records (the same fields as src/sound-bank.js), behind the
// `the-deep` switch: the lines play on the voice bus through the phone chain
// (src/deep/deep-phone.js), one at a time like the helicopter's radio. Bella's
// takes are louder than Brian's and differ from line to line, so each line has
// its own `volume`, fitted so every line leaves the chain at about -14.7 LUFS
// (the helicopter radio's level; tools/audio/render-deep-phone.mjs). The kept
// takes stay unchanged.
export const DEEP_PHONE_CUES = Object.freeze(Object.fromEntries(Object.entries(DEEP_PHONE_LINES).map(([id, line]) =>
  [id, Object.freeze({bus: 'voice', volume: line.volume, pitchRange: [1, 1], volumeRange: [1, 1], priority: 90, limit: 1,
    spatial: null, duck: 'voice', flag: 'the-deep', file: `voices/${line.file}`})])));
