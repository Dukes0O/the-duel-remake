import {suspensionBench, CORNER} from '../benches/tunnel.js';
import {GRAVITY} from '../../heli/heli-flight.js';

const SETUPS = Object.freeze([
  {spring: 'soft', road: 'bumpy'}, {spring: 'stiff', road: 'bumpy'},
  {spring: 'soft', road: 'smooth'}, {spring: 'stiff', road: 'smooth'},
]);
export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'The shaker rig'},
  {id: 'word-spring', part: 1, title: 'The spring between wheel and body', word: 'suspension-word-0'},
  {id: 'word-shake', part: 1, title: 'Measuring body shake', word: 'suspension-body-shake'},
  {id: 'word-roll', part: 1, title: 'Measuring body roll', word: 'suspension-word-3'},
  {id: 'watch', part: 2, title: 'One spring, two road surfaces'},
  {id: 'guess-bumps', part: 3, title: 'Predict body shake on bumps'},
  {id: 'guess-roll', part: 3, title: 'Predict body roll in a bend'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'recap', part: 4, title: 'What the rig showed'},
].map(Object.freeze));
const KEY_IDEAS = Object.freeze([
  {id: 'spring', text: 'A soft spring lets the car body move less over bumps, while a stiff spring sends more bump motion into the body.'},
  {id: 'shake', text: 'The rig measures body shake as the root mean square of vertical acceleration during a 20-second run.'},
  {id: 'roll', text: 'In this model bend, the soft spring allows 6.5° of body roll and the stiff spring allows 2.2°.'},
].map(Object.freeze));
export const WORDS = Object.freeze([
  {id: 'suspension-word-0', word: 'Spring', meaning: 'A spring is a coil between a wheel and the car body. A soft spring compresses more easily than a stiff spring.'},
  {id: 'suspension-word-1', word: 'Soft', meaning: 'Soft means the spring compresses more easily under the same force.'},
  {id: 'suspension-word-2', word: 'Stiff', meaning: 'Stiff means the spring resists compression more strongly.'},
  {id: 'suspension-word-3', word: 'Body roll', meaning: 'Body roll is the angle through which the car body tilts sideways in a bend, measured in degrees (°).'},
  {id: 'suspension-body-shake', word: 'Body shake', meaning: 'Body shake is the root mean square of the car body’s vertical acceleration during the rig’s 20-second run, measured in metres per second squared (m/s²).'},
].map(Object.freeze));
const CHALLENGE_CARD = Object.freeze({title: 'Compare both springs on both roads.', text: 'Run the suspension rig with soft and stiff springs on the bumpy and smooth roads. Complete all four setting pairs.'});
const titles = Object.freeze({wonder: 'The shaker rig', 'word-spring': 'The spring', 'word-shake': 'Body shake', 'word-roll': 'Body roll', watch: 'The measured trade-off', 'guess-bumps': 'Predict body shake', 'guess-roll': 'Predict body roll', 'try-free': 'Your own tests', recap: 'What the rig showed'});
const resultFor = (spring, road) => suspensionBench.run({spring, road});
const show = (value, digits = 2) => Number(value).toFixed(digits);
const readings = Object.freeze(Object.fromEntries(SETUPS.map(({spring, road}) => [`${spring}/${road}`, resultFor(spring, road)])));
const resultLabel = (spring, road) => readings[`${spring}/${road}`];
const shakeRule = 'body shake = √(Σ(body acceleration²) ÷ number of time samples)';
const rollRule = 'roll angle = atan(mass × 0.8 g × centre height ÷ (spring stiffness × track²))';
const values = result => `${show(result.bodyShake)} m/s² body shake and ${show(result.leanDeg, 1)}° body roll`;
const CHECKS = Object.freeze({
  'guess-bumps': Object.freeze({question: 'On the same bumps, which spring gives the smaller body-shake reading?', correct: 0,
    labels: ['Soft spring: 4.09 m/s².', 'Stiff spring: 4.77 m/s².', 'Both springs: the same reading.'],
    feedback: 'On these bumps, the soft spring gives 4.09 m/s² of body shake and the stiff spring gives 4.77 m/s². The soft spring has the smaller reading.'}),
  'guess-roll': Object.freeze({question: 'In this model bend, which spring gives the smaller body-roll angle?', correct: 1,
    labels: ['Soft spring: 6.5°.', 'Stiff spring: 2.2°.', 'Both springs: the same angle.'],
    feedback: 'In this model bend, the soft spring gives 6.5° of body roll and the stiff spring gives 2.2°. The stiff spring has the smaller angle.'}),
});

export function createModel() {
  let index = 0, time = 0, phase = 'ready', answer = null, setup = {spring: 'soft', road: 'bumpy'}, say = '', auto = null, lastPress = -1;
  const tested = new Set(), rows = [];
  const step = () => STEPS[index], id = () => step().id;
  const keyOf = s => `${s.spring}/${s.road}`;
  function enter(next) { index = next; time = 0; answer = null; say = ''; auto = null; lastPress = -1; phase = ['guess-bumps', 'guess-roll'].includes(id()) ? 'guess' : 'ready';
    if (id() === 'try-free') { tested.clear(); rows.splice(0); setup = {...SETUPS[0]}; }
    if (id() === 'wonder' || id() === 'watch') setup = {...SETUPS[0]};
  }
  function set(which, value) { setup = {...setup, [which]: value}; if (phase !== 'setup') phase = 'ready'; say = `${setup.spring === 'soft' ? 'Soft' : 'Stiff'} spring and ${setup.road} road are selected. Run the rig to read its measurements.`; return {kind: 'progress', say}; }
  function runRig() {
    const key = keyOf(setup), result = resultFor(setup.spring, setup.road);
    if (id() === 'try-free' && tested.has(key)) { say = 'That setting pair is already in the table. Choose a different spring or road before recording another comparison.'; return {kind: 'note', say}; }
    rows.push({spring: setup.spring, road: setup.road, shake: show(result.bodyShake), roll: show(result.leanDeg, 1), contact: show(result.contactShare * 100, 1)});
    if (id() === 'try-free') tested.add(key);
    say = `With the ${setup.spring} spring on the ${setup.road} road, the rig measures ${values(result)}.`;
    if (id() === 'try-free' && tested.size >= 3) phase = 'done';
    return {kind: 'right', say};
  }
  function act(action) {
    if (action === 'replay' && ['wonder', 'watch'].includes(id())) { enter(index); return null; }
    if (action.startsWith('spring:')) return set('spring', action.endsWith('soft') ? 'soft' : 'stiff');
    if (action.startsWith('road:')) return set('road', action.endsWith('smooth') ? 'smooth' : 'bumpy');
    if (action === 'show' && id() === 'try-free') {
      const next = SETUPS.find(choice => !tested.has(keyOf(choice)) && keyOf(choice) !== keyOf(setup)) ?? SETUPS.find(choice => !tested.has(keyOf(choice)));
      if (!next) return null;
      setup = {...next};
      return runRig();
    }
    if (action === 'run' && id() === 'try-free') return runRig();
    if (action.startsWith('answer:') && CHECKS[id()] && phase === 'guess') {
      answer = Number(action.slice(7)); phase = 'setup';
      say = 'Your prediction is recorded. Set the spring and road named in the prompt, then press Space to run the rig.';
      return {kind: 'progress', say};
    }
    if (action === 'run' && CHECKS[id()] && phase === 'setup') {
      const target = id() === 'guess-bumps' ? {spring: 'soft', road: 'bumpy'} : {spring: 'stiff', road: 'smooth'};
      if (keyOf(setup) !== keyOf(target)) { say = 'Set both controls to the requested comparison before running the rig.'; return {kind: 'note', say}; }
      const wasRight = answer === CHECKS[id()].correct;
      const observed = runRig(); phase = 'done';
      say = wasRight ? `Your prediction was right. ${CHECKS[id()].feedback}` : `${CHECKS[id()].feedback} This run measured ${values(resultFor(target.spring, target.road))}.`;
      return {kind: wasRight ? 'right' : 'wrong', say};
    }
    return null;
  }
  function tick(dt) { time += dt; if (auto && time - lastPress >= .14) { const action = auto.shift(); lastPress = time; const result = act(action); if (!auto.length) auto = null; return result; }
    if (id() === 'wonder' && phase !== 'done' && time >= 1.8) { phase = 'done'; say = 'The soft spring moves less on the bumps, while the stiff spring keeps the car flatter in a bend. We will measure both effects.'; return {kind: 'right', say}; }
    if (id() === 'watch' && phase !== 'done' && time >= 3) { phase = 'done'; say = `On bumps, the soft spring gives ${values(resultLabel('soft','bumpy'))}; the stiff spring gives ${values(resultLabel('stiff','bumpy'))}. In the model bend, their body-roll angles are 6.5° and 2.2°.`; return {kind: 'right', say}; }
    return null;
  }
  function formulaRows() {
    const rows = [];
    if (index >= 2 && id() !== 'wonder') rows.push({title: 'The rig measures body shake', formula: shakeRule, worked: phase === 'guess' ? '' : `${values(resultFor(setup.spring, setup.road))}; measured across 20 s`, note: 'The rig calculates root mean square acceleration from its time samples.'});
    if (index >= 3 && id() !== 'wonder') {
      const springK = CORNER.springs[setup.spring];
      const numerator = CORNER.carMassKg * CORNER.cornerG * GRAVITY * CORNER.centreHeightM;
      const denom = springK * CORNER.trackM ** 2;
      const degrees = Math.atan(numerator / denom) * 180 / Math.PI;
      rows.push({title: 'The model calculates body roll', formula: rollRule,
        worked: phase === 'guess' ? '' : `atan(${CORNER.carMassKg} kg × ${CORNER.cornerG} × ${GRAVITY} m/s² × ${CORNER.centreHeightM} m ÷ (${springK} N/m × ${CORNER.trackM}² m²)) = ${degrees.toFixed(1)}°`,
        note: phase === 'guess' ? 'This game models a 0.8 g corner using the car and suspension settings.' : 'This game models a 0.8 g corner. Spring stiffness changes the calculated roll angle.'});
    }
    return rows;
  }
  function view() {
    const current = id(), check = CHECKS[current], asking = Boolean(check && phase === 'guess');
    const keys = {};
    if (current === 'word-spring' || current === 'try-free' || phase === 'setup') Object.assign(keys, {1: 'spring:soft', 2: 'spring:stiff', 3: 'road:bumpy', 4: 'road:smooth'});
    if (current === 'try-free' || phase === 'setup') keys.Space = 'run';
    if (asking) Object.assign(keys, {1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
    const common = {scene: current, time, setup: {...setup}, result: asking ? null : resultFor(setup.spring, setup.road), rows: rows.map(row => ({...row})), tested: [...tested], actions: current === 'wonder' || current === 'watch' ? ['replay'] : [], buttons: [], cards: [], keys, repeat: [], formulas: formulaRows(), target: null, glow: null, waiting: false, ready: ['word-spring','word-shake','word-roll','recap'].includes(current) || phase === 'done', asking, say, prompt: '', hints: [], focus: null, pointOnly: asking};
    if (current === 'wonder') return {...common, waiting: phase !== 'done', say: say || 'A shaker rig moves the wheel over a rough road while the car body rides above it. Watch how soft and stiff springs move.', prompt: phase === 'done' ? 'Press Enter to continue.' : 'Watch the body and the tyre-contact light.', hints: ['Watch the car body as the wheel crosses the bumps.', 'The two springs move the body by different amounts.', 'Wait for Brian to finish the demonstration.']};
    if (current === 'word-spring') return {...common, keys: {'1':'spring:soft','2':'spring:stiff'}, buttons: [{action:'spring:soft',label:'Select soft spring',key:'1'},{action:'spring:stiff',label:'Select stiff spring',key:'2'}], say: 'A spring is a coil between the wheel and the car body. A soft spring compresses more under the same force, while a stiff spring resists that movement.', prompt: 'Select a spring with 1 or 2, then continue.', hints: ['The spring connects the wheel to the car body.', 'Press 1 for soft or 2 for stiff.', 'Select either spring to continue.']};
    if (current === 'word-shake') return {...common, say: 'Body shake is the root mean square of the car body’s up-and-down acceleration during this 20-second run. Acceleration is a change in speed or direction over time; metres per second squared, written m/s², measures that change.', prompt: 'Press Enter to continue to body roll.', hints: ['The rig measures body movement during the full run.', 'The unit m/s² means metres per second squared.', 'Press Enter to continue.']};
    if (current === 'word-roll') return {...common, say: 'Body roll is how far the car body tilts sideways in a bend. A bend is a turn in the road, and degrees (°) measure the roll angle.', prompt: 'Press Enter to watch the two measurements.', hints: ['Body roll measures a sideways tilt.', 'A degree is a unit for an angle.', 'Press Enter to continue.']};
    if (current === 'watch') return {...common, waiting: phase !== 'done', say: say || 'I will run the soft and stiff springs over the same bumps, then show their roll angles in the model bend. Watch the readings change.', prompt: phase === 'done' ? 'Press Enter to continue.' : 'Watch the measured comparisons.', hints: ['The road stays the same for the first comparison.', 'The soft spring shakes less on these bumps.', 'Wait for Brian to finish the comparisons.']};
    if (check) return {...common, waiting: asking || phase === 'setup', ready: phase === 'done', asking, cards: asking ? check.labels.map((label,i)=>({id:`answer:${i}`,key:String(i+1),label,picture:{kind:'result',shake:null,roll:null},state:null})) : [], target: asking ? 'answer:0' : phase === 'setup' ? 'run' : null, setup: {...setup}, say: asking ? check.question : phase === 'setup' ? (current === 'guess-bumps' ? 'Your prediction is recorded. Select the soft spring and bumpy road, then run the rig.' : 'Your prediction is recorded. Select the stiff spring and smooth road, then run the rig.') : say, prompt: asking ? 'Pick a card by clicking it, or press 1, 2 or 3.' : phase === 'setup' ? 'Press 1 or 2 for a spring and 3 or 4 for a road, then press Space.' : 'Press Enter to continue.', hints: ['Compare the two measured outcomes.', 'The spring changes body motion and roll stiffness.', 'Choose a card that answers Brian’s question.']};
    if (current === 'try-free') return {...common, waiting: phase !== 'done', keys: {'1':'spring:soft','2':'spring:stiff','3':'road:bumpy','4':'road:smooth',Space:'run'}, buttons: [{action:'spring:soft',label:'Soft spring',key:'1'},{action:'spring:stiff',label:'Stiff spring',key:'2'},{action:'road:bumpy',label:'Bumpy road',key:'3'},{action:'road:smooth',label:'Smooth road',key:'4'},{action:'run',label:'Run the rig',key:'Sp'}], target: phase === 'done' ? null : 'show', glow: 'settings', say: say || 'Choose either spring and either road, then run the rig. The table keeps three different setting pairs so you can compare their measurements.', prompt: phase === 'done' ? 'Press Enter to continue, or keep testing different settings.' : `Select a spring and road, then press Space. Different settings tested: ${tested.size} of 3.`, hints: ['Choose a spring and a road before running.', 'A repeated pair does not count as a new comparison.', 'I will choose a new setting pair and run the rig.']};
    return {...common, ready:true, ideas:KEY_IDEAS, say:'The soft spring gives less body shake on bumps, while the stiff spring gives less body roll in the model bend. The challenge asks you to compare both springs on both road surfaces.', prompt:'Press Enter to finish the lesson and open the suspension challenge.', hints:KEY_IDEAS.map(row=>row.text)};
  }
  return {enter, act, tick, view, state: () => ({index,time,phase,setup:{...setup},rows:rows.map(r=>({...r})),tested:[...tested]})};
}

export const PASS_SAY = 'You have completed the Suspension lesson. Compare both springs on both roads in the suspension challenge.';
export const lesson = Object.freeze({id:'suspension',steps:STEPS,createModel,keyIdeas:KEY_IDEAS,challengeCard:CHALLENGE_CARD,words:WORDS,finishLabel:'Try the suspension challenge',passSay:PASS_SAY,challenging:true,
  benchAttempts: () => SETUPS.map(input => ({input:{...input},controls:[{id:'spring',setting:'spring'},{id:'road',setting:'road'}]})),
});
