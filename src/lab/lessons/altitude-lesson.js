import {SITES} from '../benches/altitude.js';
import {altitudeInput, altitudeReading, altitudeDrawing, mountAltitude, altitudePicture} from './altitude-animation.js';
import {range, word, question, hint} from './flying-display.js';
const summit = altitudeReading({siteIndex: 2}), sea = altitudeReading({siteIndex: 0});
const choices = [['up', 'Lifts'], ['hover', 'Hovers'], ['down', 'Stays down']];
export const definition = {
  id: 'altitude', vocabulary: ['altitude', 'thin air', 'air density'],
  wonder: {text: 'The same machine lifts this load at home, but struggles at Summit Run. What changed?', animation: 'wonder', seconds: 4},
  words: [word('altitude', 'Altitude', 'Altitude is how high a place is above the sea.'), word('altitude', 'Thin air', 'Thin air has less air in each breath higher up.'), word('altitude', 'Air density', 'Air density is how much air is packed into one space.')],
  worked: [
    {name: 'Home pad', text: 'At sea level the air is packed close together. The rotor pushes up harder on the same load.', animation: 'sea', seconds: 3},
    {name: 'Panorama Ridge', text: `At ${SITES['panorama-ridge'].altitudeM} m the jar has fewer dots. The green arrow shrinks.`, animation: 'ridge', seconds: 3},
    {name: 'Summit Run', text: `The game rounds the real air figure down a little to ${Math.round(summit.gameShare * 100)}% here. Full lift is about ${Math.round(summit.liftKg / 100) * 100} kg instead of ${Math.round(sea.liftKg / 10) * 10} kg.`, animation: 'summit', seconds: 3},
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: i === 0 ? 'Turn the height selector to compare places, then predict this load.' : i === 1 ? 'Change the load, then compare it with what the rotor can lift.' : 'Choose a place and load, then predict the movement.',
    success: 'Your picture matched the load and the air at this height.', seconds: 3, animation: 'try',
    controls: [range('siteIndex', 'Move stand · sea / ridge / summit', 0, 2, i, 1), range('loadKg', 'Add / remove load · kg', 1000, 4000, 2800, 100)],
    prediction: question('Will this load lift, hover or stay down?', altitudeReading({siteIndex: i}).outcome, choices),
  })),
  checks: [question('Where can she lift this same load?', 'sea', [['sea', 'Sea level'], ['ridge', 'Panorama Ridge'], ['summit', 'Summit Run']]),
    question('Which place has the least lift for the same load?', 'summit', [['sea', 'Sea level'], ['ridge', 'Panorama Ridge'], ['summit', 'Summit Run']])],
  challenge: {title: 'Thin air, less lift.', text: 'Go light up high.'},
  hints: {prediction: hint('The load and green arrow did not match your picture. A longer green arrow lifts; equal arrows hold still.', 'Keep the load and choose the picture that matches the arrows.', 'Watch the same load at all three heights.'),
    heavy: hint(`At Summit she can lift about ${Math.round(summit.liftKg / 100) * 100} kg. Carry less fuel up high.`, 'Take some load off or try a lower place.', 'Watch the green arrow shrink as the air gets thinner.')},
};
const animations = {wonder: ({time}) => altitudeDrawing({siteIndex: time < 2 ? 0 : 2}, time, 'wonder'),
  altitude: ({time}) => altitudeDrawing({siteIndex: Math.min(2, Math.floor(time))}, time),
  'thin-air': ({time}) => altitudeDrawing({siteIndex: 2}, time), 'air-density': ({time}) => altitudeDrawing({siteIndex: Math.min(2, Math.floor(time))}, time),
  try: ({time, input, index}) => altitudeDrawing(altitudeInput(input, index), time)};
const pictures = {};
animations.undefined = () => altitudeDrawing({siteIndex: 2}, 2, 'summit');
for (const [id, siteIndex] of [['sea', 0], ['ridge', 1], ['summit', 2]]) {
  pictures[id] = altitudePicture(siteIndex, 3200); animations[id] = ({time}) => altitudeDrawing({siteIndex, loadKg: 3200}, time);
}
for (const [id, loadKg] of [['up', 2000], ['hover', Math.round(sea.liftKg)], ['down', 4000]]) {
  pictures[id] = altitudePicture(0, loadKg, id); animations[id] = ({time}) => altitudeDrawing({loadKg}, time);
}
export const hooks = {animations, pictures, mount: mountAltitude, evaluate({tryIndex, input, prediction}) {
  const p = altitudeInput(input, tryIndex), r = altitudeReading(p);
  const failure = r.outcome === 'down' ? 'heavy' : 'prediction';
  return {actual: r.outcome, passed: prediction === r.outcome, failure,
    hint: {what: `${SITES[r.site].name} can lift ${Math.round(r.liftKg)} kg against your ${p.loadKg} kg load. Choose ${r.outcome === 'down' ? 'Stays down or remove some load' : r.outcome === 'up' ? 'Lifts' : 'Hovers'}.`, plainer: `Keep this load and choose ${r.outcome === 'down' ? 'Stays down' : r.outcome === 'up' ? 'Lifts' : 'Hovers'}.`}};
}};
