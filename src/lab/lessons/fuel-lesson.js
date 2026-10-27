import {fuelBench, FUEL_RIG, PETROL_KG_PER_LITRE} from '../benches/tunnel.js';
import {tunnelPacket, partPicture} from './tunnel-packet.js';
import {fuelDrawing, mountFuel} from './fuel-animation.js';
const full = FUEL_RIG.tankLitres, half = full / 2;
const at = litres => ({litres});
export const spec = {
  id: 'fuel', bench: fuelBench,
  words: [['Fuel load', 'Fuel load is the petrol the car carries.'], ['Litre', 'A litre measures how much space a liquid takes up.'], ['Kilogram', 'A kilogram measures mass, or how much stuff you carry.']],
  wonder: 'The same car starts quicker with half a tank. Why?',
  wordInputs: [at(full), at(5), at(full)],
  worked: [['Fill the can', `${full} litres of petrol weighs ${(full * PETROL_KG_PER_LITRE).toFixed(1)} kg.`, at(full)],
    ['Half the petrol', `${half} litres weighs ${(half * PETROL_KG_PER_LITRE).toFixed(1)} kg, so the car carries less.`, at(half)],
    ['The same push', 'The lighter car reaches 60 mph sooner with the same push.', at(half)]],
  controls: [{id: 'litres', label: 'Pour 5 litres from the can / empty at full', value: 5, min: 0, max: full, initial: full, step: 5, cycle: true}],
  classify: r => r.settings.litres <= half ? 'light' : 'heavy',
  answers: [['light', 'Lighter, quicker'], ['heavy', 'Heavier, slower']],
  answerInputs: {light: at(half), heavy: at(full)},
  question: 'Which picture matches its carried mass and launch time?',
  examples: [at(full), at(half), at(20)],
  prompts: ['Start with a full tank and predict.', 'Pour out petrol until the tank is half full.', 'Choose a load below half a tank and predict.'],
  goal: (r, i) => i === 0 ? r.settings.litres === full : i === 1 ? r.settings.litres === half : r.settings.litres > 0 && r.settings.litres < half,
  success: 'You compared the carried mass and the launch time.',
  checks: [['Which can carries less weight?', [at(full), at(half)], 1],
    ['Which car reaches 60 mph sooner in this rig?', [at(20), at(full)], 0]],
  hint: 'The petrol amount is different from this comparison. Pour from the can and check its litres.',
  plainer: `Use ${full} litres, then ${half} litres, then 20 litres.`,
  resultHint: r => `${r.settings.litres} litres adds ${r.fuelKg.toFixed(1)} kg and takes ${r.zeroToSixtyS.toFixed(2)} seconds to 60 mph. Pour to the amount for this run.`,
  replay: 'Watch a full tank and a half tank move the same car.',
  card: 'Carry the fuel you need, no more.',
  picture: partPicture('can', r => [`${r.settings.litres} litres`, `${r.fuelKg.toFixed(1)} kg`, `${r.zeroToSixtyS.toFixed(2)} seconds`]),
};
export const {definition, hooks} = tunnelPacket(spec, fuelDrawing, mountFuel);
