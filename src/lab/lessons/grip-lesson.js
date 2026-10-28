import {gripBench, bestSlideDegrees} from '../benches/tunnel.js';
import {tunnelPacket, partPicture} from './tunnel-packet.js';
import {gripDrawing, mountGrip, gripSound} from './grip-animation.js';

const peak = bestSlideDegrees();
const tyrePicture = partPicture('tyre', r => [`${r.settings.slideDeg} degrees`, `${Math.round(r.grip * 100)}% grip`]);
export const spec = {
  id: 'grip', bench: gripBench,
  words: [['Grip', 'Grip is how hard a tyre can push on the road.'], ['Slip', 'Slip is a tyre sliding a little sideways.'], ['Limit', 'The limit is the most sideways push before the tyre slides too far.']],
  wonder: 'Same bend, but one car slides wide. Why?',
  wordInputs: [{slideDeg: 4}, {slideDeg: 9}, {slideDeg: 4}],
  worked: [['A little sideways', 'The tyre still has all its grip here.', {slideDeg: 2}],
    ['Find the edge', `The limit ends at about ${peak.toFixed(1)} degrees in this game.`, {slideDeg: 4}],
    ['Too far', 'Past the limit, the grip falls and the screech gets louder.', {slideDeg: 9}]],
  controls: [{id: 'slideDeg', label: 'Turn the tyre dial / drag or hold Up and Down', min: 0, max: 12, initial: 2, step: .5, value: .5, drag: true, keyboard: 'vertical', rate: 2}],
  classify: r => r.grip === 1 ? 'holds' : 'slides',
  answers: [['holds', 'Full grip'], ['slides', 'Lost grip']],
  answerInputs: {holds: {slideDeg: 4}, slides: {slideDeg: 9}},
  question: 'Will the tyre keep all its grip or lose some?',
  examples: [{slideDeg: 4}, {slideDeg: 9}, {slideDeg: 3.5}],
  prompts: ['Turn the dial to 4 degrees, then choose a picture.', 'Turn past the limit and predict.', 'Find full grip again, above 3 degrees.'],
  goal: (r, i) => i === 1 ? r.grip < 1 : r.grip === 1 && r.settings.slideDeg >= 3,
  success: 'You matched the picture to the tyre on the road.',
  checks: [['Which tyre still has full grip?', [{slideDeg: 9}, {slideDeg: 4}], 1],
    ['Which tyre has gone past the limit?', [{slideDeg: 3.5}, {slideDeg: 12}], 1]],
  hint: 'The tyre is on the wrong side of the limit. Turn the dial and compare the blue arrow.',
  plainer: 'Use 4 degrees for full grip and 9 degrees for lost grip.',
  resultHint: r => `At ${r.settings.slideDeg} degrees, grip is ${Math.round(r.grip * 100)} percent. Turn toward 4 degrees for full grip or 9 for a slide.`,
  replay: 'Watch the tyre hold at 4 degrees, then slide at 9.',
  card: 'A short squeal marks the limit; a screech means lost time.',
  picture(ctx, w, h, r) {
    tyrePicture(ctx, w, h, r);
    const x = a => w * .55 + a / 12 * w * .38, y = g => h * .96 - (g - .85) / .15 * h * .32;
    ctx.strokeStyle = '#619dff'; ctx.lineWidth = 2; ctx.beginPath();
    for (let a = 0; a <= 12; a += .5) { const g = gripBench.run({slideDeg: a}).grip; if (a) ctx.lineTo(x(a), y(g)); else ctx.moveTo(x(a), y(g)); } ctx.stroke();
    ctx.fillStyle = '#edc557'; ctx.beginPath(); ctx.arc(x(r.settings.slideDeg), y(r.grip), 5, 0, Math.PI * 2); ctx.fill();
  },
};
const packet = tunnelPacket(spec, gripDrawing, mountGrip);
export const definition = packet.definition;
export const hooks = {...packet.hooks, sound: gripSound};
