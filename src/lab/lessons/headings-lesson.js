import {MAP_UNIT_METRES} from '../benches/headings.js';
import {word, moment, question} from './workshop-display.js';
import {MAP_LEGS, readHeading, headingOutcome, headingSamples, headingsDrawing, mountHeadings, headingPicture} from './headings-animation.js';

const rows = [['pad', 'At the pad'], ['distance', 'Before or beyond it'], ['off', 'In another direction']];
const correctLeg = index => ({...readHeading({}, index), headingDeg: Math.round(MAP_LEGS[index].truth.headingDeg), rulerUnits: Math.round(MAP_LEGS[index].truth.distanceUnits * 10) / 10});
export const definition = {
  id: 'headings', vocabulary: ['heading', 'north', 'east', 'south', 'west', 'scale'],
  wonder: {text: "Smoke rises from the woods, but the helicopter's arrow is gone. How do you find it?", animation: 'wonder', seconds: 3},
  words: [
    word('headings', 'Heading', 'Heading is the compass direction you point.'),
    word('headings', 'North', 'North is 0 degrees on the compass.'),
    word('headings', 'East', 'East is 90 degrees on the compass.'),
    word('headings', 'South', 'South is 180 degrees on the compass.'),
    word('headings', 'West', 'West is 270 degrees on the compass.'),
    word('headings', 'Scale', `Scale tells you how far one map square is on the ground: ${MAP_UNIT_METRES} metres here.`),
  ],
  worked: [
    moment('Turn towards the lake', 'The toy turns to 90 degrees and points east.', 'east'),
    moment('Lay the ruler between pads', `Four squares stand for ${4 * MAP_UNIT_METRES} metres. Count the squares, then turn the compass.`, 'scale'),
    moment('A real pad journey', `From Woods to Snow, point ${correctLeg(0).headingDeg} degrees and travel ${correctLeg(0).rulerUnits * MAP_UNIT_METRES} metres.`, 'pad'),
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, index) => ({support,
    prompt: [`Turn to ${correctLeg(0).headingDeg} degrees and lay the ruler to ${correctLeg(0).rulerUnits * MAP_UNIT_METRES} metres for Snow.`, 'Find the heading and distance from Woods to Panorama.', 'Find the heading and distance from Woods to Summit.'][index],
    success: 'Your heading and distance brought the toy to the pad.', animation: 'try', seconds: 3,
    controls: [
      {id: 'headingDeg', label: 'Turn compass: drag or hold Up / Down', value: 1, min: 0, max: 359, initial: 270, step: 1, drag: true, keyboard: 'vertical', rate: 40},
      {id: 'rulerUnits', label: 'Lay ruler: add 100 m / start again', value: .1, min: .1, max: 20, initial: 4, step: .1, cycle: true, drag: true},
    ], prediction: question('Where will the toy land?', 'pad', rows),
  })),
  checks: [
    question('Which heading points to the lake?', 'lake-east', [['lake-north', '0 degrees'], ['lake-east', '90 degrees'], ['lake-west', '270 degrees']]),
    question('Which journey reaches the Snow pad?', 'pad', rows),
  ],
  challenge: {text: 'Point the heading, count the distance.'},
  hints: {course: {
    what: 'The toy missed the pad. Read the compass and measure the distance again.',
    plainer: 'Turn towards the smoke, then count the map squares with the ruler.',
    worked: 'Watch the compass turn and the ruler measure, then fly the toy yourself.',
  }},
};
const animations = {
  wonder: ({time}) => headingsDrawing(headingSamples.off, time),
  heading: ({time}) => headingsDrawing({...correctLeg(0), headingDeg: time * 45 % 360}, time),
  scale: ({time}) => headingsDrawing({...correctLeg(0), headingDeg: 90, rulerUnits: 4}, time),
  try: ({input, index, time}) => headingsDrawing(readHeading(input, index), time),
};
const pictures = {};
for (const [id, sample] of Object.entries(headingSamples)) {
  pictures[id] = headingPicture(sample); animations[id] = ({time}) => headingsDrawing(sample, time);
}
for (const [name, degrees] of [['north', 0], ['east', 90], ['south', 180], ['west', 270]]) {
  const sample = {...correctLeg(0), headingDeg: degrees, rulerUnits: 4};
  animations[name] = ({time}) => headingsDrawing(sample, time, 'cardinal');
  animations[`lake-${name}`] = animations[name]; pictures[`lake-${name}`] = headingPicture(sample, true);
}
export const hooks = {animations, pictures, mount: mountHeadings,
  evaluate({tryIndex, input, prediction}) {
    const load = readHeading(input, tryIndex), actual = headingOutcome(load), truth = MAP_LEGS[tryIndex].truth;
    const heading = Math.round(truth.headingDeg), metres = Math.round(truth.distanceUnits * MAP_UNIT_METRES / 100) * 100;
    const hint = {what: actual === 'pad' ? 'The toy reached the pad. Keep this journey and pick At the pad.' :
      `You flew ${Math.round(load.headingDeg)} degrees for ${Math.round(load.rulerUnits * MAP_UNIT_METRES)} metres. Turn to ${heading} degrees and measure ${metres} metres.`,
      plainer: actual === 'pad' ? 'Keep the same controls and pick At the pad.' : `Set ${heading} degrees and ${metres} metres, then choose At the pad.`};
    return {passed: actual === 'pad' && prediction === actual, actual, failure: 'course', hint};
  },
};
