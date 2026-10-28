import {KESTREL, PAD, padForces, padOutcome, kilogramsToRemove} from '../benches/lift-pad.js';
import {liftDrawing, mountLift, helicopterPicture, trialInput} from './lift-animation.js';

const empty = {fuel: KESTREL.tankKg, crates: 0, car: 0};
const heavy = {...empty, crates: 3, car: 1, collective: 1};
const hover = load => padForces(load, PAD.hoverHeight).hoverCollective;
const controls = index => [
  {id: 'fuel', label: `Pour ${PAD.canKg} kg from a fuel can / empty tank`, value: PAD.canKg, min: 0, max: KESTREL.tankKg, initial: KESTREL.tankKg, step: PAD.canKg, cycle: true},
  {id: 'crates', label: `Add a ${PAD.crateKg} kg crate / clear crates`, value: 1, min: 0, max: PAD.maxCrates, initial: index === 1 ? 1 : 0, step: 1, cycle: true},
  {id: 'car', label: `Hook / unhook Dusthawk · ${PAD.carKg} kg`, value: 1, min: 0, max: 1, initial: 0, step: 1, cycle: true},
  {id: 'collective', label: 'Pull the left-hand lever · drag or hold ↑ / ↓', value: .025, min: 0, max: 1, initial: 0, step: .025, keyboard: 'vertical', rate: KESTREL.realCollectiveRate, drag: true},
];
const predictions = {
  text: 'Will she lift off, hover, or stay down?', correct: 'hover', answers: [
    {id: 'up', label: 'Lifts off', picture: 'up', animation: 'up'},
    {id: 'hover', label: 'Hovers', picture: 'hover', animation: 'hover'},
    {id: 'down', label: 'Stays down', picture: 'down', animation: 'heavy'},
  ],
};
const check = (number, correct) => ({text: 'Which one can hover?', correct, answers: [
  {id: 'a', label: 'A', picture: `check-${number}-a`, animation: `check-${number}-a`},
  {id: 'b', label: 'B', picture: `check-${number}-b`, animation: `check-${number}-b`},
  {id: 'c', label: 'C', picture: `check-${number}-c`, animation: `check-${number}-c`},
]});
export const definition = {
  id: 'lift', vocabulary: ['rotor', 'lift', 'weight', 'collective', 'hover'],
  wonder: {text: "She can't get this load off the ground. Why?", animation: 'wonder', seconds: 3},
  words: [
    {id: 'lift-rotor', word: 'Rotor', meaning: 'The rotor is the big wings on top that spin.', animation: 'rotor'},
    {id: 'lift-weight', word: 'Weight', meaning: 'Weight is how hard the Earth pulls the helicopter and its load down.', animation: 'weight'},
    {id: 'lift-lift', word: 'Lift', meaning: 'Lift is the push up made by the rotor throwing air down.', caption: "We measure the rotor's push in kilograms, like weight, so you can compare them.", animation: 'lift'},
    {id: 'lift-collective', word: 'Collective', meaning: 'The collective is the lever by your left hand that tilts every blade steeper together to make more lift.', animation: 'collective'},
    {id: 'lift-hover', word: 'Hover', meaning: 'To hover is to stay still in the air, with lift matching weight.', animation: 'hover'},
  ],
  worked: [
    {name: 'Raise the lever slowly', text: 'The collective rises and the green lift arrow grows.', animation: 'ramp', seconds: 4},
    {name: 'Match the arrows', text: 'Lift matches weight and she hovers above the pad.', animation: 'hover', seconds: 2},
    {name: 'The Dusthawk alone', text: `The Dusthawk adds ${PAD.carKg} kg, and she can still lift it.`, animation: 'car', seconds: 3},
    {name: 'Now add three crates', text: `Three crates add ${3 * PAD.crateKg} kg. Even full collective cannot lift this load.`, animation: 'heavy', seconds: 3},
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: i === 0 ? 'Hold ↑ to pull the collective until the arrows match, then predict and run.' :
      i === 1 ? 'With a crate aboard, adjust the collective to hover.' : 'Make a load that stays down at full collective.',
    success: i < 2 ? 'You matched lift to weight and held a hover.' : "The load is too heavy even at full collective, so lighten it before flying.",
    seconds: 2, animation: 'try', controls: controls(i), prediction: {...predictions, correct: i < 2 ? 'hover' : 'down'},
  })),
  checks: [check(0, 'b'), check(1, 'c')],
  challenge: {title: 'Lift must match weight.', text: "Lighten the load if she won't climb."},
  hints: {
    fuel: {what: `The tank is empty, so the engine stopped. Pour in ${PAD.canKg} kg of fuel.`, plainer: `Click the fuel cans once to add ${PAD.canKg} kg.`, worked: 'Watch the fuelled helicopter hover, then try your load again.'},
    low: {what: 'The green arrow is shorter, so she stays down. Pull the collective up.', plainer: 'Hold ↑ until the green arrow reaches the red arrow.', worked: 'Watch the lever rise until lift matches weight.'},
    high: {what: 'She climbed instead of holding still. Lower the collective until the arrows match.', plainer: 'Hold ↓ to shorten the green arrow until it matches the red arrow.', worked: 'Watch the matching arrows hold her still in the air.'},
    heavy: {what: `This load is ${kilogramsToRemove(heavy)} kg too heavy to hover. Leave two crates behind.`, plainer: `Remove at least ${kilogramsToRemove(heavy)} kg before trying to hover.`, worked: 'Watch the lighter helicopter hover, then see the extra crates keep her down.'},
    settles: {what: 'She lifted a little, then settled as the extra push near the ground faded. Remove a crate or raise the collective.', plainer: `Remove a ${PAD.crateKg} kg crate, then match the arrows.`, worked: 'Watch the empty helicopter rise and hold above the pad.'},
    prediction: {what: 'The arrows showed a different result from your picture. Match the arrows, then pick that picture.', plainer: 'Equal arrows mean hover; a longer green arrow means climb.', worked: 'Watch which picture matches each pair of arrows.'},
    goal: {what: 'This load can lift at full collective. Add a crate and compare the arrows again.', plainer: `Add a ${PAD.crateKg} kg crate until full lift is too small.`, worked: 'Watch the Dusthawk and three crates stay down at full collective.'},
  },
};
const animations = {
  wonder: ({time}) => liftDrawing(heavy, time, 'wonder'),
  rotor: ({time}) => liftDrawing({...empty, collective: .3}, time, 'rotor'),
  lift: ({time}) => liftDrawing({...empty, collective: .3 + .3 * Math.min(1, time / 3)}, time, 'lift'),
  weight: ({time}) => liftDrawing({...empty, car: time > 1.5 ? 1 : 0}, time, 'weight'),
  collective: ({time}) => liftDrawing({...empty, collective: Math.min(1, time / 3)}, time, 'collective'),
  ramp: ({time}) => liftDrawing({...empty, collective: hover(empty) * Math.min(1, time / 4)}, time, 'ramp'),
  hover: ({time}) => liftDrawing({...empty, collective: hover(empty)}, time, 'hover'),
  car: ({time}) => liftDrawing({...empty, car: 1, collective: 1}, time, 'try'),
  heavy: ({time}) => liftDrawing(heavy, time, 'try'),
  up: ({time}) => liftDrawing({...empty, collective: 1}, time, 'try'),
  try: ({time, input, index, support}) => liftDrawing(trialInput(input, index), time, 'try', support),
};
const checkLoads = [
  [heavy, {...empty, crates: 1, collective: hover({...empty, crates: 1})}, {...empty, collective: .1}],
  [{...empty, collective: 1}, heavy, {...empty, car: 1, collective: hover({...empty, car: 1})}],
];
const pictures = {up: helicopterPicture({...empty, collective: 1}, 'Climbing'), hover: helicopterPicture({...empty, collective: hover(empty)}, 'Still in the air'), down: helicopterPicture(heavy, 'On the ground')};
checkLoads.forEach((loads, n) => loads.forEach((load, i) => {
  const id = `check-${n}-${'abc'[i]}`;
  pictures[id] = helicopterPicture(load);
  animations[id] = ({time}) => liftDrawing(load, time, padOutcome(load) === 'hover' ? 'hover' : 'try');
}));
export const hooks = {animations, pictures, mount: mountLift,
  evaluate({tryIndex, input, prediction}) {
    const load = trialInput(input, tryIndex), f = padForces(load), outcome = padOutcome(load);
    const actual = outcome === 'settles' ? 'down' : outcome;
    const goal = tryIndex < 2 ? actual === 'hover' : actual === 'down' && load.collective >= .999;
    const passed = actual === prediction && goal;
    let failure = outcome === 'settles' ? 'settles' : f.hoverCollective > 1 ? 'heavy' : actual === 'up' ? 'high' : actual === 'down' ? 'low' : 'prediction';
    if (tryIndex === 2 && !goal) failure = 'goal';
    if (!load.fuel) failure = 'fuel';
    if (goal && actual !== prediction) failure = 'prediction';
    const hint = {...definition.hints[failure]};
    if (failure === 'low') {
      hint.what = `Lift is short by ${Math.ceil(f.shortKg)} kg, so she stays down. Pull the collective up.`;
      hint.plainer = `Hold ↑ to add at least ${Math.ceil(f.shortKg)} kg of lift.`;
    }
    if (failure === 'heavy') {
      const crates = Math.ceil(kilogramsToRemove(load) / PAD.crateKg);
      hint.what = `This load is ${kilogramsToRemove(load)} kg too heavy to hover. Remove ${crates} crates (${crates * PAD.crateKg} kg).`;
      hint.plainer = `Remove at least ${kilogramsToRemove(load)} kg, then try again.`;
    }
    if (failure === 'high') {
      const excess = Math.ceil((f.liftN - f.weightN) / (f.weightN / f.massKg));
      hint.what = `Lift is ${excess} kg more than weight, so she climbs. Lower the collective.`;
      hint.plainer = `Hold ↓ to remove about ${excess} kg of lift.`;
    }
    if (failure === 'prediction') {
      const motion = actual === 'hover' ? 'hovered' : actual === 'up' ? 'climbed' : 'stayed down';
      const picture = actual === 'hover' ? 'Hovers' : actual === 'up' ? 'Lifts off' : 'Stays down';
      hint.what = `This ${Math.round(f.massKg)} kg load ${motion}. Keep the same load and choose ${picture}.`;
      hint.plainer = `Keep all ${Math.round(f.massKg)} kg aboard and pick ${picture}.`;
    }
    if (failure === 'goal') {
      if (load.collective < .999) {
        hint.what = `You have not tested this ${Math.round(f.massKg)} kg load at full collective. Hold ↑ to test its limit.`;
        hint.plainer = `Keep the same ${Math.round(f.massKg)} kg aboard and hold ↑ until the lever stops.`;
      } else {
        const addKg = Math.max(1, Math.ceil(f.maximumN / (f.weightN / f.massKg) - f.massKg + 1));
        const crates = Math.max(0, Math.ceil((addKg - (load.car ? 0 : PAD.carKg)) / PAD.crateKg));
        const action = [!load.car ? 'hook the Dusthawk' : '', crates ? `add ${crates} crates` : ''].filter(Boolean).join(' and ');
        hint.what = `This ${Math.round(f.massKg)} kg load can still climb. Add at least ${addKg} kg: ${action}.`;
        hint.plainer = `Add at least ${addKg} kg: ${action}.`;
      }
    }
    return {passed: passed && load.fuel > 0, actual, failure, hint};
  },
};
