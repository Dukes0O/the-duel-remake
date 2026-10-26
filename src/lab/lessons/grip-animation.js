import {gripBench} from '../benches/tunnel.js';
import {tunnelMount, tunnelDrawing, arrow, arrowShafts} from './tunnel-model.js';
const mount = tunnelMount('grip');
let source = null, gain = null, soundKey = '', soundTime = 0;
export function stopGripSound() { source?.stop(); source?.disconnect(); gain?.disconnect(); source = gain = null; }
export function gripSound(view, audio) {
  if (!audio?.context || audio.muted || view.paused) { stopGripSound(); return; }
  const key = `${view.stage}:${view.index}:${view.animation}:${view.running}`;
  if (key !== soundKey || view.time < soundTime) { soundKey = key; stopGripSound(); }
  const first = soundTime < .15 || view.time < soundTime;
  soundTime = view.time;
  const input = view.stage === 3 ? view.input : {slideDeg: view.index === 2 ? 9 : 4};
  const result = gripBench.run(input);
  if (!first || view.time < .15 || !(view.stage === 2 || view.stage === 3 && view.running)) return;
  const buffer = audio.samples?.squeal?.source?.buffer;
  if (!buffer) return;
  const now = audio.context.currentTime, seconds = result.grip < 1 ? 1.2 : .18;
  source = audio.context.createBufferSource(); gain = audio.context.createGain(); source.buffer = buffer;
  gain.gain.setValueAtTime(Math.max(.08, result.squeal * .4), now);
  gain.gain.setTargetAtTime(0, now + seconds - .04, .015);
  source.connect(gain); gain.connect(audio.buses?.vehicle ?? audio.master);
  const voice = source, volume = gain;
  voice.onended = () => { voice.disconnect(); volume.disconnect(); if (source === voice) source = gain = null; };
  voice.start(); voice.stop(now + seconds);
}
export function mountGrip(args) {
  const view = mount(args); return {...view, dispose() { stopGripSound(); soundKey = ''; soundTime = 0; view.dispose(); }};
}
export function gripDrawing(result, time, mode) {
  const d = tunnelDrawing(result), angle = result.settings.slideDeg;
  d.parts = [{name: 'tyre', position: [0, .9, 0], rotation: [Math.PI / 2, -angle * Math.PI / 180, 0]}];
  if (mode === 'wonder') d.cars = [0, 1].map(i => ({position: [-1 + Math.sin(time) * .8, .18, -.8 - i], rotation: [0, -Math.PI / 2 + (i ? time * .3 : .15), 0]}));
  d.labels = [{text: `Tyre · ${Math.round(result.grip * 100)}% grip`, position: [0, 1.65, .25], width: 1.8, colour: '#619dff'},
    {text: `Slide dial · ${angle.toFixed(1)} degrees`, position: [.8, .75, .85], width: 2}];
  d.objects.push({id: 'tyre-dial', shape: 'sphere', control: 'slideDeg', position: [.95, 1.1, 1], size: [.32, .32, .32], colour: '#c8b665'});
  d.forces = [arrow('grip', result.grip, [-.7, .45, .85], [1, 0, 0])];
  if (mode === 'watch') d.graph = {position: [-1.8, 1.6, -.35], size: [1.65, .94, 1], xLabel: 'Slide in degrees', yLabel: 'Grip percent', maxX: 12, maxY: 100, revealX: time * 4,
    points: Array.from({length: 25}, (_, i) => [i / 2, gripBench.run({slideDeg: i / 2}).grip * 100])};
  return arrowShafts(d, 1.5);
}
