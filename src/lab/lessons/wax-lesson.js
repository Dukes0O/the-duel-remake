import {SNOWS, WAXES, waxBench} from '../benches/wax.js';
import {word, moment, question} from './workshop-display.js';
import {waxDrawing, waxPicture, mountWax, waxSamples} from './wax-animation.js';

export const trayOf = index => Object.keys(SNOWS)[index];
export const readWax = (input, index = 0) => ({snow: trayOf(index), wax: WAXES[Math.round(input.waxDial ?? 0)]});
const choices = [['fast', 'Faster glide'], ['slow', 'Slower glide']];
export const definition = {
  id: 'wax', vocabulary: ['wax', 'glide', 'snow crystals'],
  wonder: {text: 'Same skis, same slope. Why does one skier slide past the other?', animation: 'wonder', seconds: 4},
  words: [
    word('wax', 'Wax', 'Wax is a thin coat on the ski base that helps it slide over snow.'),
    word('wax', 'Glide', 'Glide means slide smoothly over the snow.'),
    word('wax', 'Snow crystals', 'Snow crystals are tiny ice shapes, sharp when cold and wet when warm.'),
  ],
  worked: [
    moment('Cold snow scratches', 'Hard, sharp snow crystals scratch soft wax. Hard wax protects the base on cold snow.', 'cold', 4),
    moment('Warm snow sticks', 'Wet snow holds a hard base by suction. Soft wax and fine grooves help water escape.', 'wet', 4),
    moment('Match each tray', 'Hard wax suits cold snow, medium suits cool snow, and soft suits wet snow. The two wrong waxes tie in this experiment.', 'compare', 5),
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: [`Pick hard wax for ${SNOWS.powder.celsius} °C dry powder.`, `Pick a wax for ${SNOWS.cold.celsius} °C cool snow.`, `Choose your wax for ${SNOWS.wet.celsius} °C wet snow.`][i],
    success: 'Your wax matches the snow and your picture matches the glide.', seconds: 4, animation: 'try',
    controls: [{id: 'waxDial', label: 'Turn wax selector: Hard / Medium / Soft', value: 1, min: 0, max: 2, initial: 0, step: 1, cycle: true}],
    prediction: question('Will this wax give the faster or slower glide?', 'fast', choices),
  })),
  checks: [
    question(`Which wax for ${SNOWS.powder.celsius} °C powder?`, 'hard-cold', [['soft-cold', 'Soft wax'], ['hard-cold', 'Hard wax']]),
    question(`Which wax for ${SNOWS.wet.celsius} °C wet snow?`, 'soft-wet', [['hard-wet', 'Hard wax'], ['soft-wet', 'Soft wax']]),
  ].map(q => ({...q, animation: 'compare'})),
  challenge: {title: 'Hard wax for cold, soft wax for warm.', text: 'Choose the right wax for the day and finish the slalom run.'},
  hints: {
    wax: {what: 'This wax drags on this snow. Match the block to the tray temperature.', plainer: 'Pick hard for dry powder, medium for cool snow, or soft for wet snow.', worked: 'Watch the matching wax slide faster on each tray, then pick yours.'},
    prediction: {what: 'Your wax matches the snow, so it gave the faster glide. Pick the faster picture.', plainer: 'The matching wax is faster; both wrong waxes are equally slow.', worked: 'Watch the matching wax lead the other ski, then predict again.'},
  },
};
const animations = {
  wonder: ({time}) => waxDrawing({snow: 'powder', wax: 'soft'}, time, 'wonder'),
  wax: ({time}) => waxDrawing({snow: 'powder', wax: 'hard'}, time, 'wax'),
  glide: ({time}) => waxDrawing({snow: 'powder', wax: 'hard'}, time),
  'snow-crystals': ({time}) => waxDrawing({snow: 'powder', wax: 'soft'}, time, 'cold'),
  cold: ({time}) => waxDrawing({snow: 'powder', wax: 'soft'}, time, 'cold'),
  wet: ({time}) => waxDrawing({snow: 'wet', wax: 'hard'}, time, 'wet'),
  compare: ({time}) => waxDrawing({snow: 'powder', wax: 'hard'}, time, 'compare'),
  try: ({input, index, time}) => waxDrawing(readWax(input, index), time),
};
const pictures = {};
for (const [id, sample] of Object.entries(waxSamples)) {
  pictures[id] = waxPicture(sample); animations[id] = ({time}) => waxDrawing(sample, time);
}
export const hooks = {animations, pictures, mount: mountWax,
  evaluate({tryIndex, input, prediction}) {
    const sample = readWax(input, tryIndex), result = waxBench.run(sample), actual = result.right ? 'fast' : 'slow';
    const failure = result.right ? 'prediction' : 'wax';
    return {passed: result.right && prediction === actual, actual, failure,
      hint: result.right ? definition.hints.prediction : {...definition.hints.wax,
        what: `${sample.wax} wax took ${result.glideS.toFixed(2)} seconds on ${SNOWS[sample.snow].celsius} °C snow. Pick ${SNOWS[sample.snow].wax} wax for this tray.`}};
  },
};
