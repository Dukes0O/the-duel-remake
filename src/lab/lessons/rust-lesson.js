import {RUST_PARTS, rightProtection} from '../lab-workshop.js';
import {word, moment, question} from './workshop-display.js';
import {readRust, rustState, rustTrial, rustSamples, rustDrawing, mountRust, rustPicture} from './rust-animation.js';

export const definition = {
  id: 'rust', vocabulary: ['rust', 'salt water', 'paint', 'zinc coat'],
  wonder: {text: 'The Sirena came out of the sea crusted orange. What did the sea do to her?', animation: 'wonder', seconds: 3},
  words: [
    word('rust', 'Rust', 'Rust is iron turning flaky orange when water and air reach it.'),
    word('rust', 'Salt water', 'Salt water is water with salt in it, which makes iron rust faster.'),
    word('rust', 'Paint', 'Paint is a skin that keeps water and air out.'),
    word('rust', 'Zinc coat', 'A zinc coat is metal that rusts first to save the steel underneath.'),
  ],
  worked: [
    moment('A week in ten seconds', 'Dry air stays shiny, fresh water spots, and salt water rusts fast.', 'jars', 10),
    moment('The coat wears away', 'The zinc coat wears away first, keeping the nail clean.', 'zinc', 10),
    moment('Heat changes the choice', 'Paint flakes off a hot exhaust. A zinc coat or a heat-proof finish lasts.', 'heat', 10),
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: ['Turn the three dials to choose a part, a jar and a protection.', 'Change one dial and compare the nail with your last try.', 'Choose your own part, jar and protection.'][i],
    success: 'Your picture matches what happened after a week.', animation: 'try', seconds: 10,
    controls: [
      {id: 'partDial', label: 'Choose part: Underbody / Exhaust / Armour', value: 1, min: 0, max: 2, initial: 0, step: 1, cycle: true},
      {id: 'jarDial', label: 'Choose jar: Dry / Fresh / Salt', value: 1, min: 0, max: 2, initial: 2, step: 1, cycle: true},
      {id: 'coatDial', label: 'Choose protection: Bare / Paint / Zinc coat', value: 1, min: 0, max: 2, initial: 0, step: 1, cycle: true},
    ], prediction: question('How rusty will it be after a week?', 'rusty', [['clean', 'Clean'], ['spots', 'A few spots'], ['rusty', 'Very rusty']]),
  })),
  checks: RUST_PARTS.map(part => question(`${part.name}: ${part.lives} Which protection?`, `${part.id}-${rightProtection(part.id)}`,
    [[`${part.id}-bare`, 'Leave bare'], [`${part.id}-zinc`, 'Zinc coat']])),
  challenge: {text: 'Keep water and air out, or let zinc rust first.'},
  hints: {
    prediction: {what: 'The nail changed more or less than your picture. Compare the orange patches before choosing again.', plainer: 'Salt water rusts bare metal fast; paint keeps water out and zinc goes first.', worked: 'Watch the four jars for a week, then choose a picture again.'},
    heat: {what: 'Paint flakes off a hot exhaust, letting water reach the metal. Try a zinc coat.', plainer: 'Turn the protection dial to Zinc coat for the hot part.', worked: 'Watch the zinc wear away while the steel stays clean.'},
  },
};
const animations = {
  wonder: ({time}) => rustDrawing(rustSamples.rusty, 10 + time, 'wonder'),
  rust: ({time}) => rustDrawing(rustSamples.rusty, time * 3),
  'salt-water': ({time}) => rustDrawing(rustSamples.rusty, time * 3),
  paint: ({time}) => rustDrawing({...rustSamples.rusty, protection: 'paint'}, time * 3),
  'zinc-coat': ({time}) => rustDrawing(rustSamples.clean, time * 3),
  jars: ({time}) => rustDrawing(rustSamples.rusty, time, 'jars'),
  zinc: ({time}) => rustDrawing(rustSamples.clean, time),
  heat: ({time}) => rustDrawing({part: 'exhaust', jar: 'salt', protection: 'paint'}, time),
  try: ({input, time}) => rustDrawing(readRust(input), time),
};
const pictures = {};
for (const [id, sample] of Object.entries(rustSamples)) {
  pictures[id] = rustPicture(sample); animations[id] = ({time}) => rustDrawing(sample, time * 3);
}
for (const part of RUST_PARTS) for (const protection of ['bare', 'zinc']) {
  const id = `${part.id}-${protection}`, sample = {part: part.id, jar: part.jar, protection};
  pictures[id] = rustPicture(sample, true); animations[id] = ({time}) => rustDrawing(sample, time * 3);
}
export const hooks = {animations, pictures, mount: mountRust,
  evaluate({input, prediction}) {
    const load = readRust(input), result = rustTrial(load), actual = rustState(result.rust);
    const failure = load.part === 'exhaust' && load.protection === 'paint' && result.rust > .1 ? 'heat' : 'prediction';
    const hint = {...definition.hints[failure]};
    if (failure === 'prediction') hint.what = `The nail is ${Math.round(result.rust * 100)}% rusty after a week. Choose the picture with that much orange.`;
    return {passed: prediction === actual, actual, failure, hint};
  },
};
