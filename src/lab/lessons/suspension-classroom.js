// Suspension lesson: the shaker rig, the bump test and the bend test, and the unchanged four-run suspension challenge.
import {suspensionBench, CORNER} from '../benches/tunnel.js';
import {MORE} from '../classroom/brian-text.js';

const GRAVITY = 9.81;

const SETUPS = Object.freeze([
  {spring: 'soft', road: 'bumpy'},
  {spring: 'stiff', road: 'bumpy'},
  {spring: 'soft', road: 'smooth'},
  {spring: 'stiff', road: 'smooth'},
]);
const FREE_RUNS = 3;
const HELD_GAP_S = .14;
// The wonder and the watch have several things moving together (the wheel, the springs, the body and the table), so each lasts
// about ten seconds, and R plays it again (Kyle, 19 November 2026). The wonder drives over bumps for half of it, then takes a bend.
export const WATCH_S = 10;
const WONDER_BUMPS_S = 5;
const WONDER_LEAN_S = 2;
const ARROW_ACTIONS = Object.freeze({'←': 'spring:soft', '→': 'spring:stiff', '↓': 'road:bumpy', '↑': 'road:smooth'});
// What the picture shows: the wheel crossing bumps with the body level, the car in a bend with the body leaning, or both tests at once.
const TEST_OF = Object.freeze({
  wonder: 'bumps', 'word-spring': 'bumps', 'word-stiffness': 'bumps', 'word-weight': 'bend', 'word-roll': 'bend', 'word-shake': 'bumps',
  'guess-bumps': 'bumps', 'guess-roll': 'bend', watch: 'both', formula: 'bend', 'try-free': 'both', alone: 'both',
  'check-spring': 'bumps', 'check-transfer': 'bend', 'check-formula': 'bend', recap: 'both',
});

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why does the body shake and lean?'},
  {id: 'word-spring', part: 1, title: 'The spring between wheel and body', word: 'suspension-word-0'},
  {id: 'word-stiffness', part: 1, title: 'Spring stiffness', word: 'suspension-word-1'},
  {id: 'word-weight', part: 1, title: 'Weight transfer in a corner', word: 'suspension-word-2'},
  {id: 'word-roll', part: 1, title: 'Body roll', word: 'suspension-word-3'},
  {id: 'word-shake', part: 1, title: 'Body shake', word: 'suspension-body-shake'},
  {id: 'guess-bumps', part: 2, title: 'Predict body shake on bumps'},
  {id: 'guess-roll', part: 2, title: 'Predict body roll in a bend'},
  {id: 'watch', part: 2, title: 'Watch the rig change'},
  {id: 'formula', part: 3, title: 'The roll rule'},
  {id: 'try-free', part: 3, title: 'Test three setting pairs'},
  {id: 'alone', part: 4, title: 'Find a flatter cornering setup'},
  {id: 'check-spring', part: 5, title: 'Question 1 of 3'},
  {id: 'check-transfer', part: 5, title: 'Question 2 of 3'},
  {id: 'check-formula', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'spring', text: 'A spring connects each wheel to the car body. A stiffer spring is squeezed less by the same force.'},
  {
    id: 'transfer',
    text: 'A turn pushes the car sideways at the road. The car’s weight sits above the road, so the body tips outward. That is why it leans.',
  },
  {
    id: 'tradeoff',
    text: 'A soft spring shakes the body less on bumps, but lets it lean more in a bend. A stiff spring keeps the body flatter in a bend '
      + 'and keeps the tyre on the road for more of the bumpy test, but shakes the body harder.',
  },
].map(Object.freeze));

// Keep existing word ids so notebook entries already saved still match.
export const WORDS = Object.freeze([
  {
    id: 'suspension-word-0', word: 'Spring',
    meaning: 'A spring is a coil between a wheel and the car body. It is squeezed when the wheel and body move closer and stretches when they move apart.',
  },
  {
    id: 'suspension-word-1', word: 'Spring stiffness',
    meaning: 'Spring stiffness is how strongly a spring resists being squeezed or stretched. A stiffer spring moves less under the same force.',
  },
  {
    id: 'suspension-word-2', word: 'Weight transfer',
    meaning: 'Weight transfer is a change in how the car’s weight presses on its tyres. In a corner, the outside tyres carry more and the inside tyres carry less.',
  },
  {id: 'suspension-word-3', word: 'Body roll', meaning: 'Body roll is the sideways angle of the car body as the car turns, measured in degrees (°).'},
  {
    id: 'suspension-body-shake', word: 'Body shake',
    meaning: 'Body shake is how hard the body shakes up and down during the test. Its unit, m/s², means how quickly the body’s speed changes.',
  },
].map(Object.freeze));

// This card and the four required runs are the existing challenge contract.
const CHALLENGE_CARD = Object.freeze({
  title: 'Compare both springs on both roads.',
  text: 'Run the suspension rig with soft and stiff springs on the bumpy and smooth roads. Complete all four setting pairs.',
});

const resultFor = (spring, road) => suspensionBench.run({spring, road});
const resultBySetup = Object.freeze(Object.fromEntries(SETUPS.map(({spring, road}) => [`${spring}/${road}`, resultFor(spring, road)])));
const setupKey = setup => `${setup.spring}/${setup.road}`;
const shown = (value, digits = 2) => Number(value).toFixed(digits);
const thousands = value => value.toLocaleString('en-US');
const SOFT_BUMPS = resultBySetup['soft/bumpy'], STIFF_BUMPS = resultBySetup['stiff/bumpy'];
const SOFT_ROLL = shown(resultBySetup['soft/smooth'].leanDeg, 1), STIFF_ROLL = shown(resultBySetup['stiff/smooth'].leanDeg, 1);
const SOFT_SHAKE = shown(SOFT_BUMPS.bodyShake), STIFF_SHAKE = shown(STIFF_BUMPS.bodyShake);
const values = result => `${shown(result.bodyShake)} m/s² of body shake, ${shown(result.leanDeg, 1)}° of body roll and ${shown(result.contactShare * 100, 2)}% tyre contact`;

// One check per question: three cards, the right one, and a reason for each pick.
const CHECKS = Object.freeze({
  'guess-bumps': Object.freeze({
    question: 'On the same bumps, which spring gives the smaller body-shake reading?',
    correct: 0,
    answers: ['The soft spring.', 'The stiff spring.', 'Both springs give the same reading.'],
    reasons: [
      `Right. The soft spring reads ${SOFT_SHAKE} m/s² and the stiff spring reads ${STIFF_SHAKE} m/s², so the soft spring shakes the body less on bumps.`,
      `The stiff spring reads ${STIFF_SHAKE} m/s², which is higher than the soft spring’s ${SOFT_SHAKE} m/s². The stiff spring passes more of each bump into the body.`,
      `The readings are different: ${SOFT_SHAKE} m/s² for the soft spring and ${STIFF_SHAKE} m/s² for the stiff spring. The stiff spring shakes the body harder.`,
    ],
  }),
  'guess-roll': Object.freeze({
    question: 'In a bend, which spring gives the smaller body-roll angle?',
    correct: 1,
    answers: ['The soft spring.', 'The stiff spring.', 'Both springs lean the same.'],
    reasons: [
      `The soft spring leans ${SOFT_ROLL} degrees, which is more than the stiff spring’s ${STIFF_ROLL} degrees. A stiffer spring pushes back harder, so the body leans less.`,
      `Right. In the bend the soft spring leans ${SOFT_ROLL} degrees and the stiff spring leans ${STIFF_ROLL} degrees.`,
      `The springs do not lean the same: the soft spring leans ${SOFT_ROLL} degrees and the stiff spring leans ${STIFF_ROLL} degrees.`,
    ],
  }),
  'check-spring': Object.freeze({
    question: 'What does a stiffer spring do under the same force?',
    answers: ['It is squeezed less.', 'It is squeezed more.', 'It transfers no weight in a corner.'],
    correct: 0,
    reasons: [
      'Correct. A stiffer spring resists being squeezed more strongly.',
      'A stiffer spring resists more, so under the same force it is squeezed less.',
      'Stiffness changes how far the body leans, but weight still transfers in every corner.',
    ],
  }),
  'check-transfer': Object.freeze({
    question: 'As the car turns, where does weight transfer?',
    answers: [
      'More load goes to the outside tyres and less to the inside tyres.',
      'All the car’s weight moves to the front tyres.',
      'The car’s total weight becomes greater.',
    ],
    correct: 0,
    reasons: [
      'Correct. Weight transfer changes how the load is shared across the tyres; it does not change the car’s total weight.',
      'In a corner the load moves sideways, from the inside tyres to the outside tyres. It does not all move to the front.',
      'Weight transfer only moves load between the tyres. The car’s total weight stays the same.',
    ],
  }),
  'check-formula': Object.freeze({
    question: 'In the same bend, what happens to body roll when spring stiffness increases?',
    answers: ['The roll angle gets smaller.', 'The roll angle gets larger.', 'Spring stiffness does not appear in the roll rule.'],
    correct: 0,
    reasons: [
      `Correct. Stiffness divides the tipping push in the roll rule, so a stiffer spring leans less: ${STIFF_ROLL}° instead of ${SOFT_ROLL}°.`,
      'Stiffness divides the tipping push in the roll rule, so more stiffness gives a smaller roll angle, not a larger one.',
      'Spring stiffness is in the roll rule, under the line: it divides the tipping push, so it sets the roll angle.',
    ],
  }),
});

// The roll rule worked for one spring, from the numbers the bench uses. The tipping push is the car's weight force
// at the bend's sideways pull, acting at the height of the centre of mass.
const TIPPING_PUSH = CORNER.carMassKg * CORNER.cornerG * GRAVITY * CORNER.centreHeightM;
function rollRow(spring, asking) {
  const stiffness = CORNER.springs[spring], radians = TIPPING_PUSH / (stiffness * CORNER.trackM ** 2);
  return {
    title: `The roll rule, ${spring} spring`,
    formula: 'body roll (radians) = tipping push ÷ (spring stiffness × track × track)',
    worked: asking ? ''
      : `${thousands(Math.round(TIPPING_PUSH))} N·m ÷ (${thousands(stiffness)} N/m × ${CORNER.trackM} m × ${CORNER.trackM} m) = ${shown(radians, 3)} rad = ${shown(resultFor(spring, 'smooth').leanDeg, 1)}°`,
    note: `The tipping push is ${thousands(CORNER.carMassKg)} kg × ${CORNER.cornerG} × ${GRAVITY} m/s² × ${CORNER.centreHeightM} m = ${thousands(Math.round(TIPPING_PUSH))} N·m.`,
  };
}

function formulaRows(id, {asking = false} = {}) {
  const rows = [];
  if (['formula', 'watch', 'try-free', 'alone', 'check-spring', 'check-transfer', 'check-formula', 'recap'].includes(id)) {
    rows.push(rollRow('soft', asking), rollRow('stiff', asking));
    rows.push({
      title: 'What this bend showed', formula: 'stiff spring ÷ soft spring = stiffness ratio',
      worked: asking ? '' : `${thousands(CORNER.springs.stiff)} ÷ ${thousands(CORNER.springs.soft)} = ${CORNER.springs.stiff / CORNER.springs.soft}. The stiff spring leans ${STIFF_ROLL}° where the soft spring leans ${SOFT_ROLL}°.`,
      note: 'A stiffer spring pushes back harder, so the body leans less.',
    });
  }
  return rows;
}

export function createModel() {
  let index = 0;
  let time = 0;
  let phase = 'ready';
  let setup = {...SETUPS[0]};
  let say = '';
  let lastHeldAt = -Infinity;
  let quizAnswer = null;
  let watchStage = -1;
  const rows = [];
  const tested = new Set();
  const step = () => STEPS[index];
  const id = () => step().id;
  const settingResult = () => resultFor(setup.spring, setup.road);
  const setControl = (field, value) => {
    lastHeldAt = time;
    setup = {...setup, [field]: value};
    say = `The ${setup.spring} spring is on the ${setup.road} road. Run the rig to read its measurements.`;
    return {kind: 'progress', say};
  };

  function enter(next) {
    index = next;
    time = 0;
    watchStage = -1;
    phase = ['guess-bumps', 'guess-roll'].includes(id()) ? 'guess'
      : id().startsWith('check-') ? 'quiz' : 'ready';
    say = ''; lastHeldAt = -Infinity; quizAnswer = null;
    if (['wonder', 'formula', 'watch', 'guess-bumps', 'guess-roll'].includes(id())) setup = {...SETUPS[0]};
    if (id() === 'watch') { rows.splice(0); tested.clear(); }
    if (id() === 'try-free' || id() === 'alone') { rows.splice(0); tested.clear(); setup = {...SETUPS[0]}; }
  }

  function recordRun(quiet = false) {
    const key = setupKey(setup);
    if ((id() === 'try-free' || id() === 'alone') && tested.has(key)) {
      say = 'That setting pair is already in the results table. Change the spring or road before the next run.';
      return {kind: 'note', say};
    }
    const result = settingResult();
    rows.push({spring: setup.spring, road: setup.road, shake: shown(result.bodyShake), roll: shown(result.leanDeg, 1), contact: shown(result.contactShare * 100, 2)});
    if (['try-free', 'alone'].includes(id())) tested.add(key);
    if (quiet) return null;
    say = `The ${setup.spring} spring on the ${setup.road} road gave ${values(result)}.`;
    if (id() === 'try-free' && tested.size >= FREE_RUNS) phase = 'done';
    if (id() === 'alone') {
      if (result.leanDeg < 3 && result.bodyShake < 1) {
        phase = 'done';
        say += ' That is the setup: the body roll is under 3° and the body shake is the smallest.';
      } else if (result.leanDeg < 3) {
        say += ' The body roll is under 3°, but the body shake is high. Try the other road.';
      } else {
        say += ' The body roll is 3° or more. Try the other spring.';
      }
    }
    return {kind: 'right', say};
  }

  function doShowMe() {
    if (id() === 'try-free') {
      const next = SETUPS.find(choice => !tested.has(setupKey(choice)) && setupKey(choice) !== setupKey(setup))
        ?? SETUPS.find(choice => !tested.has(setupKey(choice)));
      if (!next) return null;
      setup = {...next};
      return recordRun();
    }
    if (id() === 'alone') {
      setup = {spring: 'stiff', road: 'smooth'};
      return recordRun();
    }
    return null;
  }

  function act(action) {
    if (action.endsWith(':held')) {
      const now = time;
      if (now - lastHeldAt < HELD_GAP_S) return null;
      lastHeldAt = now;
      action = action.slice(0, -5);
    }
    // Watch again: the step starts over, with the rig back on its first setting and the readings cleared.
    if (action === 'replay' && ['wonder', 'watch'].includes(id())) { enter(index); return null; }
    if (action === 'show' && ['try-free', 'alone'].includes(id())) return doShowMe();
    if (action.startsWith('spring:')) return setControl('spring', action.endsWith('soft') ? 'soft' : 'stiff');
    if (action.startsWith('road:')) return setControl('road', action.endsWith('bumpy') ? 'bumpy' : 'smooth');
    if (action === 'run' && ['try-free', 'alone'].includes(id())) return recordRun();
    if (action.startsWith('answer:') && CHECKS[id()] && (phase === 'guess' || phase === 'quiz')) {
      const picked = Number(action.slice(7));
      if (!Number.isInteger(picked) || picked < 0 || picked > 2) return null;
      quizAnswer = picked; phase = 'done';
      const check = CHECKS[id()];
      say = check.reasons[picked];
      return {kind: picked === check.correct ? 'right' : 'wrong', say};
    }
    return null;
  }

  function tick(dt) {
    time += dt;
    if (id() === 'wonder' && phase !== 'done' && time >= WATCH_S) {
      phase = 'done';
      say = 'The wheel jumped over each bump, and the body above it moved less. In the bend the body leaned outward. What makes the body shake, and what makes it lean?';
      return {kind: 'right', say};
    }
    if (id() === 'watch' && phase !== 'done') {
      // Each setting pair is held for a quarter of the run, and its readings join the table as the rig reaches it.
      const stage = Math.min(SETUPS.length - 1, Math.floor(time / (WATCH_S / SETUPS.length)));
      if (stage !== watchStage) {
        setup = {...SETUPS[stage]};
        watchStage = stage;
        recordRun(true);
      }
      if (time >= WATCH_S) {
        phase = 'done'; setup = {...SETUPS[3]};
        say = `On bumps, the soft spring gives ${SOFT_SHAKE} m/s² of body shake and the stiff spring gives ${STIFF_SHAKE} m/s². `
          + `In the bend, the soft spring leans ${SOFT_ROLL}° and the stiff spring leans ${STIFF_ROLL}°.`;
        return {kind: 'right', say};
      }
    }
    return null;
  }

  function view() {
    const current = id();
    const check = CHECKS[current];
    const asking = Boolean(check && ['guess', 'quiz'].includes(phase));
    const answerLabels = check?.answers ?? [];
    const keys = {};
    const buttons = [];
    let result = asking ? null : settingResult();
    let target = null, glow = null, waiting = false, ready = true, prompt = 'Press Enter to continue.', localSay = say;
    let hints = ['Read the words and look at the rig.', 'Use the panel to compare the settings.', 'Press Enter when you are ready.'];
    if (['word-spring', 'word-stiffness', 'word-weight', 'word-roll', 'word-shake', 'try-free', 'alone'].includes(current)) {
      Object.assign(keys, ARROW_ACTIONS);
      const controls = [
        ['←', 'spring:soft', 'Soft spring'], ['→', 'spring:stiff', 'Stiff spring'],
        ['↓', 'road:bumpy', 'Bumpy road'], ['↑', 'road:smooth', 'Smooth road'],
      ];
      for (const [key, action, label] of controls) {
        buttons.push({action, label, key});
      }
    }
    if (['try-free', 'alone'].includes(current)) {
      keys.Space = 'run'; buttons.push({action: 'run', label: 'Run the rig', key: 'Sp'});
    }
    if (asking) {
      Object.assign(keys, {1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
      target = 'answer:0';
    }
    if (current === 'word-spring') {
      waiting = false;
      localSay = 'A spring is a coil between the wheel and the car body. '
        + 'When a bump pushes the wheel up, the spring is squeezed, and when the wheel drops, the spring stretches again. '
        + 'Watch the springs squeeze and stretch as the wheel crosses the bumps.';
      prompt = 'Press Enter to learn what spring stiffness means.';
    } else if (current === 'word-stiffness') {
      waiting = false;
      localSay = 'Spring stiffness is how strongly a spring resists being squeezed or stretched. '
        + 'A stiffer spring moves less under the same force. '
        + `Choose the soft spring, then the stiff spring, and watch how far the wheel moves.${MORE}`
        + 'A stiffer spring also sends more of each bump up into the body.';
      prompt = 'Press Enter to learn what changes in a corner.';
    } else if (current === 'word-weight') {
      waiting = false;
      localSay = 'In a bend the road pushes the car sideways, and the car’s weight sits above the road, so the body tips outward. '
        + 'The outside tyres carry more load and the inside tyres carry less.';
      prompt = 'Press Enter to learn the name for this sideways lean.';
    } else if (current === 'word-roll') {
      waiting = false;
      localSay = 'Body roll is the sideways angle of the car body in a bend, measured in degrees. '
        + 'The outside spring is squeezed and the inside spring stretches, and the body leans until the springs push back as hard as the weight tips it.';
      prompt = 'Press Enter to learn how the rig measures body shake.';
    } else if (current === 'word-shake') {
      waiting = false;
      localSay = 'Body shake is how hard the body shakes up and down during a test. A higher reading means harder shaking. '
        + `The rig also reports tyre contact, the share of the test during which the tyre touches the road.${MORE}`
        + 'The unit of body shake, m/s², means how quickly the body’s speed changes.';
      prompt = 'Press Enter to make your first prediction.';
    } else if (current === 'formula') {
      waiting = false;
      localSay = 'The body leans because the tipping push of the bend works against the springs. '
        + 'The roll rule divides that push by the spring stiffness, so a spring 3 times as stiff leans a third as far.';
      prompt = 'Press Enter to test your own settings.';
      hints = ['The panel beside the picture shows the roll rule for each spring.', 'Stiffness is on the bottom of the rule.', 'Press Enter when you are ready.'];
    } else if (current === 'wonder') {
      waiting = phase !== 'done'; ready = phase === 'done';
      localSay = say || 'This rig drives a wheel over bumps, and then through a bend. Watch the wheel, the springs and the body.';
      prompt = ready ? 'Press Enter to begin.' : 'Watch the wheel, the springs and the body move.';
      hints = ['Watch the wheel move over the bumps.', 'The body above it moves too.', 'Wait for Brian to finish the demonstration.'];
    } else if (current === 'guess-bumps' || current === 'guess-roll') {
      waiting = asking; ready = !asking; result = asking ? null : settingResult();
      if (asking) {
        localSay = check.question; prompt = 'Pick the card with your answer.';
        hints = current === 'guess-bumps'
          ? [
            'Compare what the two springs do on the same road.',
            'A spring that is squeezed more can soften bumps for the body.',
            'Choose the body-shake reading that is smaller.',
          ]
          : ['A stiffer spring pushes back harder.', 'The body leans until the springs push back as hard as the weight tips it.', 'Choose the smaller angle.'];
      } else {
        localSay = say; prompt = 'Press Enter to continue.';
      }
    } else if (current === 'watch') {
      waiting = phase !== 'done'; ready = phase === 'done';
      localSay = phase === 'done' ? say : 'Which setting gives the smallest body shake, and which gives the smallest body roll? Watch the table as I run all four spring and road pairs.';
      prompt = ready ? 'Press Enter to see the roll rule.' : 'Watch the table fill with readings.';
      hints = ['Watch the spring and the wheel as each pair runs.', 'The table adds one line for each pair.', 'Wait for Brian to finish the demonstration.'];
    } else if (current === 'try-free') {
      waiting = phase !== 'done'; ready = phase === 'done'; target = ready ? null : 'show'; glow = 'settings';
      localSay = say || 'Which pair of spring and road shakes the body least, and which leans least? Test three different pairs and compare the table.';
      prompt = ready
        ? 'You tested three setting pairs. Press Enter to continue.'
        : `Test three different pairs. Tested so far: ${tested.size} of ${FREE_RUNS}.`;
      hints = ['Change the spring or the road before each run.', 'A repeated setting pair does not count twice.', 'I will select a new pair and run it.'];
    } else if (current === 'alone') {
      const reached = phase === 'done'; waiting = !reached; ready = reached; target = reached ? null : 'show'; glow = 'settings';
      localSay = say || 'Find the setup with the smallest body shake that also keeps the body roll under 3°. Test settings until you find it.';
      prompt = reached
        ? 'You found the setup. Press Enter to continue.'
        : `The target is less than 3° of body roll with the smallest body shake. The current setting rolls ${shown(settingResult().leanDeg, 1)}°.`;
      hints = [
        'A stiffer spring pushes back harder, so the body leans less.',
        'The smooth road gives the smallest body shake.',
        'I will set the stiff spring on the smooth road and run the rig.',
      ];
    } else if (check && current.startsWith('check-')) {
      waiting = asking; ready = !asking;
      if (asking) {
        localSay = check.question; prompt = 'Pick the card with your answer.';
        hints = ['Use the lesson words and the roll rule in the panel.', 'Think through what changes in this case.', 'Choose the sentence that answers the question.'];
      } else { localSay = say; prompt = 'Press Enter to continue.'; }
    } else if (current === 'recap') {
      waiting = false; ready = true;
      localSay = 'A soft spring shakes the body less on bumps, but lets it lean more in a bend. '
        + `A stiff spring keeps the body flatter in a bend, but shakes the body harder on bumps.${MORE}`
        + `The stiff spring also keeps the tyre on the road for more of the bumpy test: ${shown(STIFF_BUMPS.contactShare * 100, 2)}% against ${shown(SOFT_BUMPS.contactShare * 100, 2)}%.`;
      prompt = 'Press Enter to finish the lesson and open the suspension challenge.';
    }
    const cards = asking ? answerLabels.map((label, answerIndex) => ({
      id: `answer:${answerIndex}`, key: String(answerIndex + 1), label,
      picture: {kind: 'result', shake: null, roll: null}, state: null,
    })) : [];
    if (current.startsWith('check-') && !asking && check) {
      cards.push(...answerLabels.map((label, answerIndex) => ({
        id: `answer:${answerIndex}`, key: String(answerIndex + 1), label,
        picture: {kind: 'result', shake: null, roll: null},
        state: answerIndex === check.correct ? 'right' : answerIndex === quizAnswer ? 'wrong' : null,
      })));
    }
    // The picture: bumps keep the body level, a bend leans it. An open prediction shows the test without its answer.
    const test = current === 'wonder' ? (time < WONDER_BUMPS_S ? 'bumps' : 'bend') : TEST_OF[current];
    const lean = Number(result?.leanDeg ?? 0);
    const rollDeg = test === 'bumps' ? 0
      : current === 'wonder' ? lean * Math.min(1, Math.max(0, (time - WONDER_BUMPS_S) / WONDER_LEAN_S))
        : result ? lean : null;
    return {
      scene: current, time, setup: {...setup}, result, test, rollDeg,
      rows: rows.map(row => ({...row})), tested: [...tested],
      actions: ['wonder', 'watch'].includes(current) ? ['replay'] : [], buttons, cards, keys,
      repeat: Object.keys(ARROW_ACTIONS).filter(key => keys[key]), hints, formulas: formulaRows(current, {asking}),
      target, glow, waiting, ready, asking, say: localSay, prompt, focus: 'spring', pointOnly: asking,
      ideas: KEY_IDEAS, helpActions: current === 'try-free' || current === 'alone' ? ['show'] : [],
    };
  }

  return {
    enter,
    act,
    tick,
    view,
    state: () => ({index, time, phase, setup: {...setup}, rows: rows.map(row => ({...row})), tested: [...tested]}),
    targetOf: action => action === 'show' ? 'show' : action,
    helpActions: () => ['show'],
  };
}

export const PASS_SAY = 'You have completed the Suspension lesson. Compare both springs on both roads in the suspension challenge.';
export const lesson = Object.freeze({
  id: 'suspension', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD,
  words: WORDS, finishLabel: 'Try the suspension challenge', passSay: PASS_SAY, challenging: true,
  benchAttempts: () => SETUPS.map(input => ({input: {...input}, controls: [{id: 'spring', setting: 'spring'}, {id: 'road', setting: 'road'}]})),
});
