// G-force as a classroom lesson. The meter always uses the G-force bench rule.
import {lateralG} from '../benches/gforce.js';

const GRAVITY = 9.81, KMH_PER_BENCH_SPEED = 0.44704 * 3.6;
const BASE = Object.freeze({speed: 40, radius: 50});
const speedKmh = speed => speed * KMH_PER_BENCH_SPEED;
const meter = (speed, radius) => lateralG(speed, radius);
const shown = value => value.toFixed(2);
export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why does the cord lean? '},
  {id: 'word-speed', part: 1, title: 'Speed and metres per second', word: 'gforce-speed'},
  {id: 'word-radius', part: 1, title: 'Radius and the centre of a turn', word: 'radius'},
  {id: 'watch', part: 2, title: 'Speed and radius change the meter'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-speed', part: 3, title: 'Predict the faster turn'},
  {id: 'try-radius', part: 3, title: 'Predict the tighter turn'},
  {id: 'alone', part: 4, title: 'Brian’s 2 g test'},
  {id: 'check-speed', part: 5, title: 'Question 1 of 3'},
  {id: 'check-radius', part: 5, title: 'Question 2 of 3'},
  {id: 'check-rule', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.gforce.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'speed', text: 'The game squares speed, so twice the speed gives four times the G-force at the same radius.'},
  {id: 'radius', text: 'The game divides by radius, so half the radius gives twice the G-force at the same speed.'},
  {id: 'challenge', text: 'The G-force lap counts three different corners that reach at least 2 g while the car stays on the road.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Reach 2 g in three different corners.', text: 'Drive a lap on a course you own. Reach at least 2 g in three different corners without leaving the road.'});
export const WORDS = Object.freeze([
  {id: 'gforce', word: 'G-force', meaning: 'G-force is the sideways acceleration a driver feels while a car turns.'},
  {id: 'one-g', word: 'One g', meaning: 'One g is the acceleration caused by Earth’s gravity near the ground, 9.81 m/s².'},
  {id: 'radius', word: 'Radius', meaning: 'Radius is the distance from the centre of a circular turn to the car, measured in metres, written m.'},
  {id: 'gforce-speed', word: 'Speed', meaning: 'Speed is the distance travelled during a set time. This lesson shows speed in kilometres per hour, written km/h, and uses metres per second, written m/s, in its formula.'},
].map(Object.freeze));

const FORMULA = 'G-force (g) = speed (m/s)² ÷ radius (m) ÷ 9.81 m/s²';
function formulas(speed, radius) {
  const ms = speed * 0.44704, square = Number((ms * ms).toFixed(2));
  return [{title: "The game's turning rule", formula: FORMULA,
    worked: `(${ms.toFixed(2)} m/s)² ÷ ${radius} m ÷ ${GRAVITY} m/s² = ${shown(meter(speed, radius))} g`,
    note: 'The meter uses the G-force bench function. The speed conversion and meter reading follow the bench settings.'}];
}
const checks = {
  'check-speed': {question: 'At the same 50 m radius, which speed gives the larger reading: half of 64.4 km/h or 64.4 km/h?', correct: 0,
    answers: ['64.4 km/h gives the larger reading.', 'Half of 64.4 km/h gives the larger reading.', 'Both speeds give the same reading.'],
    right: `At 64.4 km/h the meter reads ${shown(meter(40, 50))} g. At half speed it reads ${shown(meter(20, 50))} g, because the game squares speed.`,
    wrong: `The meter reads ${shown(meter(40, 50))} g at 64.4 km/h and ${shown(meter(20, 50))} g at half that speed. Halving speed quarters the reading because speed is squared.`},
  'check-radius': {question: 'At 64.4 km/h, which radius gives the larger reading: 25 m or 100 m?', correct: 0,
    answers: ['25 m gives the larger reading.', '100 m gives the larger reading.', 'Both radii give the same reading.'],
    right: `At 25 m the meter reads ${shown(meter(40, 25))} g. At 100 m it reads ${shown(meter(40, 100))} g, because the rule divides by radius.`,
    wrong: `At 25 m the meter reads ${shown(meter(40, 25))} g, and at 100 m it reads ${shown(meter(40, 100))} g. The larger radius is the larger divisor, so its reading is lower.`},
  'check-rule': {question: "Which statement matches the game's G-force rule?", correct: 0,
    answers: ['The reading rises with the square of speed and falls as radius grows.', 'The reading rises in direct proportion to speed and radius.', 'The reading falls as speed rises and radius shrinks.'],
    right: 'That is the rule: the game squares speed and divides by radius.',
    wrong: 'The game squares speed and divides by radius. Faster speed raises the squared value, and a smaller radius reduces the divisor, so both changes raise the reading.'},
};

export function createModel() {
  let index = 0, time = 0, speed = BASE.speed, radius = BASE.radius, phase = 'ready', count = 0, answer = null, say = '';
  const rows = [], distinct = new Set();
  const step = () => STEPS[index], result = () => meter(speed, radius);
  function enter(i) {
    index = i; time = 0; answer = null; phase = 'ready'; say = '';
    const id = step().id;
    if (id === 'wonder') { speed = BASE.speed; radius = BASE.radius; phase = 'watch'; }
    if (id === 'word-speed') { speed = 20; radius = BASE.radius; phase = 'adjust-speed'; }
    if (id === 'word-radius') { speed = BASE.speed; radius = 100; phase = 'adjust-radius'; }
    if (id === 'watch') { speed = BASE.speed; radius = BASE.radius; phase = 'watch'; }
    if (id === 'try-free') { speed = BASE.speed; radius = BASE.radius; phase = 'set'; }
    if (id === 'try-speed') { speed = BASE.speed; radius = BASE.radius; phase = 'guess'; }
    if (id === 'try-radius') { speed = BASE.speed; radius = BASE.radius; phase = 'guess'; }
    if (id === 'alone') { speed = BASE.speed; radius = BASE.radius; phase = 'set'; }
  }
  function press(kind, dir) {
    if (kind === 'speed' && (['adjust-speed', 'set'].includes(phase) || step().id === 'word-speed' && phase === 'done')) speed = Math.max(10, Math.min(150, speed + dir * 20));
    if (kind === 'radius' && (['adjust-radius', 'set'].includes(phase) || step().id === 'word-radius' && phase === 'done')) radius = Math.max(10, Math.min(200, radius + dir * 25));
    if (step().id === 'word-speed' && speed === BASE.speed && phase !== 'done') { phase = 'done'; say = 'The speed dial is now at 64.4 km/h, which is about 17.88 m/s. The game uses the metres-per-second value in its G-force formula.'; return {kind:'right', say}; }
    if (step().id === 'word-radius' && radius === BASE.radius && phase !== 'done') { phase = 'done'; say = 'The radius is now 50 m, measured from the middle of the turn to the car. A wider turn has a larger radius.'; return {kind:'right', say}; }
    say = `The speed is ${speedKmh(speed).toFixed(1)} km/h and the radius is ${radius} m. The meter reads ${shown(result())} g.`;
    return {kind: 'progress', say};
  }
  function run() {
    const key = `${speed}/${radius}`;
    if (step().id === 'try-free') {
      if (speed === BASE.speed && radius === BASE.radius || distinct.has(key)) return {kind:'note', say:'Change the speed or radius before you run a different comparison.'};
      distinct.add(key); rows.push({speed: speedKmh(speed), radius, g: shown(result())});
      if (distinct.size >= 3) phase = 'done';
      say = `At ${speedKmh(speed).toFixed(1)} km/h around ${radius} m, the meter reads ${shown(result())} g. Change at least one setting and test another different turn.`;
      return {kind: 'right', say};
    }
    if (step().id === 'try-speed') {
      if (speed !== 80) return {kind:'note',say:`Change the speed from ${speedKmh(speed).toFixed(1)} km/h to ${speedKmh(80).toFixed(1)} km/h before you run the turn.`};
      phase='done'; const correct=answer===0;
      say=correct?`Correct. The meter reads ${shown(meter(80,50))} g, four times the ${shown(meter(40,50))} g reference because the game squares speed.`:`The meter reads ${shown(meter(80,50))} g, four times the ${shown(meter(40,50))} g reference. Doubling speed multiplies the squared speed term by four.`;
      return {kind:correct?'right':'wrong',say};
    }
    if (step().id === 'try-radius') {
      if (radius !== 25) return {kind:'note',say:`Change the radius from ${radius} m to 25 m before you run the turn.`};
      phase='done'; const correct=answer===0;
      say=correct?`Correct. The meter reads ${shown(meter(40,25))} g, twice the ${shown(meter(40,50))} g reference because the radius halves.`:`The meter reads ${shown(meter(40,25))} g, twice the ${shown(meter(40,50))} g reference. Halving radius halves the divisor and doubles the result.`;
      return {kind:correct?'right':'wrong',say};
    }
    if (step().id === 'alone') {
      if (speed === BASE.speed && radius === BASE.radius) return {kind:'fail',say:`The starting turn reads ${shown(result())} g, which is below 2 g. Change the speed or radius before you run again.`};
      if (result() < 2) return {kind:'fail',say:`This turn reads ${shown(result())} g, which is below the 2 g target. Raise speed or shorten the radius, then try again.`};
      phase='done'; say=`The turn reads ${shown(result())} g, which reaches the target of at least 2 g. The speed and radius changes are shown in the formula.`;
      return {kind:'pass',say};
    }
    return null;
  }
  function act(action) {
    const [kind, raw] = action.split(':');
    if (kind === 'speed') return press('speed', raw === 'up' ? 1 : -1);
    if (kind === 'radius') return press('radius', raw === 'up' ? 1 : -1);
    if (kind === 'run' && phase === 'set') return run();
    if (kind === 'answer' && phase === 'guess') {
      const check = step().id === 'try-speed' ? 0 : 1, correct = raw === String(check);
      answer=Number(raw); phase='set';
      say=check===0?'Your prediction is recorded. Raise the speed to 128.7 km/h, keep the radius at 50 m, and run the turn.':'Your prediction is recorded. Shorten the radius to 25 m, keep the speed at 64.4 km/h, and run the turn.';
      return {kind:'progress',say};
    }
    if (kind === 'answer' && checks[step().id]) {
      const q = checks[step().id], picked = Number(raw); if (!q.answers[picked]) return null;
      answer = picked; phase = 'done'; say = picked === q.correct ? q.right : q.wrong;
      return {kind: picked === q.correct ? 'right' : 'wrong', say};
    }
    return null;
  }
  function tick(dt) {
    time += dt;
    if (step().id === 'watch' && phase === 'watch') {
      if (time < 2) { speed=80; radius=50; } else { speed=40; radius=100; }
      if (time >= 3) { phase = 'done'; say = 'The same car turns around the same 50 m radius. When speed doubles from 64.4 to 128.7 km/h, the meter rises from 0.65 g to 2.61 g. When radius doubles from 50 to 100 m, the meter falls from 0.65 g to 0.33 g.'; return {kind:'right', say}; }
    }
  }
  function view() {
    const id = step().id, q = checks[id], done = phase === 'done';
    const live = !q && !['wonder','try-speed','try-radius'].includes(id) && (id !== 'word-speed' || done);
    const formulasForView = live && !['wonder'].includes(id) ? formulas(speed, radius) : [];
    const controls = ['word-speed','word-radius','try-free','try-speed','try-radius','alone'].includes(id);
    const keys = {};
    if (controls && (phase === 'set' || phase.startsWith('adjust') || phase === 'done' && ['word-speed','word-radius'].includes(id))) {
      if (id !== 'word-radius') { keys.ArrowLeft='speed:down'; keys.ArrowRight='speed:up'; }
      if (id !== 'word-speed') { keys.ArrowUp='radius:up'; keys.ArrowDown='radius:down'; }
      if (['try-free','try-speed','try-radius'].includes(id)) keys.Space = id === 'try-free' ? 'run' : 'run';
    }
    if (q && !done) { keys['1']='answer:0'; keys['2']='answer:1'; keys['3']='answer:2'; }
    const base = {scene: id, time, speedKmh: speedKmh(speed), radiusM: radius, g: result(), formulas: formulasForView,
      rows: rows.map(row => ({...row})), keys, repeat: Object.keys(keys).filter(k => k.startsWith('Arrow')), buttons: [], cards: [], target: null, glow: null,
      waiting: !done && (controls || id === 'wonder' || id === 'watch'), ready: done || id === 'recap', say: say || '', prompt: '', hints: [],
      meterBaseline: shown(meter(BASE.speed, BASE.radius))};
    if (id === 'wonder') return {...base, ready: true, waiting:false, say:'A car turns on an arm while a cord hangs from the car. The meter reads 0.65 g. What makes the reading larger: faster speed, a wider turn, or both?', prompt:'Press Enter to look at speed and radius.', hints:['Watch the cord as the car turns.','The meter measures sideways acceleration.','Press Enter to continue.']};
    if (id === 'word-speed') return {...base, say: done ? say : 'Speed is distance travelled during a set time. This dial shows kilometres per hour, written km/h. The formula uses metres per second, written m/s; divide km/h by 3.6 to convert because an hour has 3,600 seconds and a kilometre has 1,000 metres.', prompt:done?'Press Enter to continue, or change the speed.':`The dial shows ${speedKmh(speed).toFixed(1)} km/h. Press Right to raise speed or Left to lower it until it reads 64.4 km/h.`, hints:['The speed dial changes the car’s speed.','Press Right until the dial reads 64.4 km/h.','Brian will point to the speed dial.'], target:done?null:'speed:up', ready:done};
    if (id === 'word-radius') return {...base, say: done ? say : 'Radius is the distance from the centre of a circular turn to the car. The arm labels that distance in metres, written m. Acceleration is how quickly velocity changes. The formula measures acceleration in metres per second squared, written m/s², and one g is 9.81 m/s². Move the car inward until the arm measures 50 m.', prompt:done?'Press Enter to continue, or change the radius.':`The radius is ${radius} m. Press Down to shorten it or Up to lengthen it.`, hints:['Follow the arm from its centre to the car.','Press Down until the radius is 50 m.','Brian will point to the radius control.'], target:done?null:'radius:down', ready:done};
    if (id === 'watch') return {...base, formulas: formulas(speed,radius), waiting: !done, ready: done, say: done ? say : 'Brian changes one setting at a time. Watch the cord and meter as he changes speed, then radius.', prompt:done?'Press Enter to continue.':'Watch the meter.', hints:['The faster car gives a larger reading.','The wider turn gives a smaller reading.','Wait for Brian to finish.']};
    if (id === 'try-free') return {...base, waiting: !done, ready: done, say: say || 'Choose a speed and a radius. Read the meter, predict the result, and press Space to record a turn. Change at least one setting before each of two more runs.', prompt:done?'Press Enter to continue, or keep testing.':`Speed ${speedKmh(speed).toFixed(1)} km/h; radius ${radius} m. Change speed or radius, then press Space to record a different setting. Different settings tested: ${distinct.size} of 3.`, hints:['The formula follows both controls.','Change the speed or the radius before the next run.','Brian will point to the run control.'], target:done?null:'run'};
    if (id === 'try-speed' || id === 'try-radius') return {...base, formulas: [], waiting:!done, ready:done,
      say: done ? say : phase === 'guess' ? (id==='try-speed'?'The reference is 64.4 km/h around 50 m, which reads 0.65 g. Predict the meter if speed doubles and the radius stays fixed.':'The reference is 64.4 km/h around 50 m, which reads 0.65 g. Predict the meter if the radius halves and speed stays fixed.') : say,
      prompt:done?'Press Enter to continue.':phase==='guess'?'Choose your prediction before changing the control.':say,
      ...(phase==='guess'?{asking:true,target:'answer:0',keys:{1:'answer:0',2:'answer:1',3:'answer:2'},cards:(id==='try-speed'?['Four times as large.','Twice as large.','The same.']:['Twice as large.','Half as large.','The same.']).map((label,i)=>({id:`answer:${i}`,key:String(i+1),label,picture:{kind:'meter',g:meter(BASE.speed,BASE.radius)},state:null})),prompt:'Pick a card, or press 1, 2 or 3.'}:{target:id==='try-speed'?(speed===80?'run':'speed:up'):(radius===25?'run':'radius:down'),keys:{ArrowLeft:'speed:down',ArrowRight:'speed:up',ArrowUp:'radius:up',ArrowDown:'radius:down',Space:'run'},meterReference:shown(meter(BASE.speed,BASE.radius))}), hints:['Compare the squared speed or the radius divisor.','Keep one setting fixed and change the other.','Brian will point to the next control or prediction.']};
    if (id === 'alone') return {...base, formulas:done?formulas(speed,radius):formulas(speed,radius), waiting:!done, ready:done,
      say:done?say:'Brian’s test starts at 64.4 km/h around 50 m, which reads 0.65 g. Change at least one control, then run a turn that reaches 2 g or more.',
      prompt:done?'Press Enter to continue.':`The meter reads ${shown(result())} g. Change speed or radius, then press Space to test.`,
      target:done?null:(speed===BASE.speed&&radius===BASE.radius?'speed:up':'run'), glow:done?null:'speed', hints:['A higher speed or a shorter radius raises the reading.','Try 128.7 km/h around 50 m, then run the turn.','Brian will point to the next control.']};
    if (q) return {...base, formulas: [], waiting:!done, ready:done, asking:!done, say:q.question, prompt:done?'Press Enter to continue.':'Pick an answer, or press 1, 2 or 3.', keys:done?{}:{1:'answer:0',2:'answer:1',3:'answer:2'}, cards:q.answers.map((label,i)=>({id:`answer:${i}`,key:String(i+1),label,picture:{kind:'meter',g:meter(BASE.speed,BASE.radius)},state:answer===null?null:(i===q.correct?'right':answer===i?'wrong':null)})), hints:['Read the formula and compare the settings.','Speed is squared and radius is the divisor.','Pick the answer that matches the rule.']};
    if (id === 'recap') return {...base,ready:true, waiting:false, ideas:KEY_IDEAS, formulas:formulas(BASE.speed,BASE.radius), say:'The game squares speed and divides by turn radius and Earth’s gravitational acceleration. Doubling speed gives four times the reading, while doubling radius halves it. The G-force lap still asks for three different corners at 2 g without leaving the road.', prompt:'Enter finishes the lesson and opens the existing G-force lap challenge.', hints:KEY_IDEAS.map(item=>item.text)};
    return base;
  }
  return {enter, act, tick, view, state: () => ({speed, radius, rows})};
}

export const PASS_SAY = 'You have passed G-force. Drive a lap on a course you own and reach 2 g in three different corners without leaving the road.';
export const lesson = Object.freeze({id:'gforce', steps:STEPS, createModel, keyIdeas:KEY_IDEAS, challengeCard:CHALLENGE_CARD, words:WORDS, finishLabel:'Finish the lesson', passSay:PASS_SAY});
