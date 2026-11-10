// Suspension lesson: the shaker rig, its simplified corner model, and the
// unchanged four-run suspension challenge.
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
const ARROW_ACTIONS = Object.freeze({'←': 'spring:soft', '→': 'spring:stiff', '↓': 'road:bumpy', '↑': 'road:smooth'});

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why does the car lean?'},
  {id: 'word-spring', part: 1, title: 'The spring between wheel and body', word: 'suspension-word-0'},
  {id: 'word-stiffness', part: 1, title: 'Spring stiffness', word: 'suspension-word-1'},
  {id: 'word-weight', part: 1, title: 'Weight transfer in a corner', word: 'suspension-word-2'},
  {id: 'word-roll', part: 1, title: 'Body roll', word: 'suspension-word-3'},
  {id: 'word-shake', part: 1, title: 'Body shake', word: 'suspension-body-shake'},
  {id: 'guess-bumps', part: 2, title: 'Predict body shake on bumps'},
  {id: 'guess-roll', part: 2, title: 'Predict body roll in a bend'},
  {id: 'watch', part: 2, title: 'Watch the rig change'},
  {id: 'formula', part: 3, title: 'The roll sum'},
  {id: 'try-free', part: 3, title: 'Test three setting pairs'},
  {id: 'alone', part: 4, title: 'Find a flatter cornering setup'},
  {id: 'check-spring', part: 5, title: 'Question 1 of 3'},
  {id: 'check-transfer', part: 5, title: 'Question 2 of 3'},
  {id: 'check-formula', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'spring', text: 'A spring connects each wheel to the car body. A stiffer spring compresses less under the same force.'},
  {
    id: 'transfer',
    text: 'A turn pushes the car sideways at the road. The car’s weight sits above the road, so the car wants to tip outward. That is why it leans.',
  },
  {
    id: 'tradeoff',
    text: 'A soft spring suits a rough road because it soaks up bumps. A stiff spring suits a smooth road '
      + 'and keeps the body flatter in a bend, but it can pass bumps into the body and briefly lift a tyre.',
  },
].map(Object.freeze));

// Keep existing word ids so notebook entries already saved still match.
export const WORDS = Object.freeze([
  {
    id: 'suspension-word-0', word: 'Spring',
    meaning: 'A spring is a coil between a wheel and the car body. It compresses when the wheel and body move closer and stretches when they move apart.',
  },
  {
    id: 'suspension-word-1', word: 'Spring stiffness',
    meaning: 'Spring stiffness describes how strongly a spring resists being compressed or stretched. A stiffer spring moves less under the same force.',
  },
  {
    id: 'suspension-word-2', word: 'Weight transfer',
    meaning: 'Weight transfer is a change in how the car’s weight presses on its tyres. In a corner, the outside tyres carry more and the inside tyres carry less.',
  },
  {id: 'suspension-word-3', word: 'Body roll', meaning: 'Body roll is the sideways angle of the car body as the car turns, measured in degrees (°).'},
  {
    id: 'suspension-body-shake', word: 'Body shake',
    meaning: 'Body shake tells how hard the body shakes up and down during the test. Its unit, m/s², means how quickly the body’s speed changes.',
  },
].map(Object.freeze));

// This card and the four required runs are the existing challenge contract.
const CHALLENGE_CARD = Object.freeze({
  title: 'Compare both springs on both roads.',
  text: 'Run the suspension rig with soft and stiff springs on the bumpy and smooth roads. Complete all four setting pairs.',
});

const CHECKS = Object.freeze({
  'guess-bumps': Object.freeze({
    question: 'On the same bumps, which spring gives the smaller body-shake reading?',
    correct: 0,
    right: 'Right. 4.09 m/s² is lower than 4.77 m/s², so the soft spring shakes less on these bumps.',
    wrong: 'That prediction is not right. 4.77 m/s² is higher than 4.09 m/s². The stiff spring shakes more in this test.',
    answers: ['The soft spring.', 'The stiff spring.', 'Both springs give the same reading.'],
    feedback: 'The soft spring gives 4.09 m/s² here. The stiff spring gives 4.77 m/s², so the soft spring has less body shake on these bumps.',
  }),
  'guess-roll': Object.freeze({
    question: 'In this bend, which spring gives the smaller body-roll angle?',
    correct: 1,
    right: 'Right. In this bend, the soft spring leans 6.5 degrees and the stiff spring leans 2.2 degrees.',
    wrong: 'That prediction is not right. The soft spring gives 6.5 degrees of body roll, greater than the stiff spring’s 2.2 degrees.',
    answers: ['The soft spring.', 'The stiff spring.', 'Both springs lean the same.'],
    feedback: 'The numbers come from this test: 6.5° ÷ 2.2° is about 3, so the stiff spring leans about a third as much.',
  }),
  'check-spring': Object.freeze({
    question: 'What does a stiffer spring do under the same force?',
    answers: ['It compresses less.', 'It compresses more.', 'It transfers no weight in a corner.'],
    correct: 0,
    right: 'Correct. A stiffer spring resists compression more strongly.',
    wrong: 'Spring stiffness describes resistance to movement. Under the same force, the stiffer spring compresses less.',
  }),
  'check-transfer': Object.freeze({
    question: 'As the car turns, where does weight transfer?',
    answers: [
      'More load goes to the outside tyres and less to the inside tyres.',
      'All the car’s weight moves to the front tyres.',
      'The car’s total weight becomes greater.',
    ],
    correct: 0,
    right: 'Correct. Weight transfer changes how the load is shared across the tyres; it does not change the car’s total weight.',
    wrong: 'In a corner, the outside tyres carry more load and the inside tyres carry less. The car’s total weight stays the same.',
  }),
  'check-formula': Object.freeze({
    question: 'In this bend, what happens to body roll when spring stiffness increases?',
    answers: ['The calculated roll angle gets smaller.', 'The calculated roll angle gets larger.', 'Spring stiffness does not appear in the roll rule.'],
    correct: 0,
    right: 'Correct. A stiffer spring pushes back harder, so the body leans less.',
    wrong: 'A stiffer spring pushes back harder, so the body leans less.',
  }),
});

const resultFor = (spring, road) => suspensionBench.run({spring, road});
const resultBySetup = Object.freeze(Object.fromEntries(SETUPS.map(({spring, road}) => [`${spring}/${road}`, resultFor(spring, road)])));
const setupKey = setup => `${setup.spring}/${setup.road}`;
const shown = (value, digits = 2) => Number(value).toFixed(digits);
const values = result => `${shown(result.bodyShake)} m/s² body shake and ${shown(result.leanDeg, 1)}° body roll`;
const formulaTitles = Object.freeze({
  wonder: 'The shaker rig', 'word-spring': 'The spring', 'word-stiffness': 'Spring stiffness',
  'word-weight': 'Weight transfer', 'word-roll': 'Body roll', 'word-shake': 'Body shake',
  formula: 'Compare body roll', 'guess-bumps': 'Predict body shake', 'guess-roll': 'Predict body roll',
  watch: 'Live readings', 'try-free': 'Your recorded runs', alone: 'Your recorded runs', recap: 'What the rig showed',
});

function rollDegrees(stiffness) {
  const numerator = CORNER.carMassKg * CORNER.cornerG * GRAVITY * CORNER.centreHeightM;
  const denominator = stiffness * CORNER.trackM ** 2;
  return Math.atan(numerator / denominator) * 180 / Math.PI;
}

function formulaRows(id, setup, {asking = false} = {}) {
  const rows = [];
  if (['formula', 'watch', 'try-free', 'alone', 'check-spring', 'check-transfer', 'check-formula', 'recap'].includes(id)) {
    const soft = resultBySetup['soft/smooth'].leanDeg;
    const stiff = resultBySetup['stiff/smooth'].leanDeg;
    const worked = asking ? '' : `${shown(soft, 1)}° ÷ ${shown(stiff, 1)}° ≈ 3. The numbers come from this test, so the stiff spring leans about a third as much.`;
    rows.push({title: 'What this bend showed', formula: '', worked,
      note: 'A stiffer spring pushes back harder, so the body leans less.'});
  }
  return rows.map(row => ({...row, title: row.title || formulaTitles[id]}));
}

export function createModel() {
  let index = 0;
  let time = 0;
  let phase = 'ready';
  let setup = {...SETUPS[0]};
  let guess = null;
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
    guess = null; say = ''; lastHeldAt = -Infinity; quizAnswer = null;
    if (['wonder', 'formula', 'watch'].includes(id())) setup = {...SETUPS[0]};
    if (id() === 'guess-bumps') setup = {...SETUPS[0]};
    if (id() === 'guess-roll') setup = {...SETUPS[0]};
    if (id() === 'try-free') { rows.splice(0); tested.clear(); setup = {...SETUPS[0]}; }
    if (id() === 'alone') setup = {...SETUPS[0]};
  }

  function recordRun() {
    const key = setupKey(setup);
    if ((id() === 'try-free' || id() === 'alone') && tested.has(key)) {
      say = 'That setting pair is already in the results table. Change the spring or road before the next run.';
      return {kind: 'note', say};
    }
    const result = settingResult();
    rows.push({spring: setup.spring, road: setup.road, shake: shown(result.bodyShake), roll: shown(result.leanDeg, 1), contact: shown(result.contactShare * 100, 2)});
    if (['try-free', 'alone'].includes(id())) tested.add(key);
    say = `The ${setup.spring} spring on the ${setup.road} road measured ${values(result)}. `
      + `Tyre contact shows how much of the test the tyre touched the road: `
      + `${(result.contactShare * 100).toFixed(2)}%.`;
    if (id() === 'try-free' && tested.size >= FREE_RUNS) phase = 'done';
    if (id() === 'alone' && setup.spring === 'stiff' && result.leanDeg < 3) {
      phase = 'done';
      say += ' You reached the target: less than 3° of body roll in this bend.';
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
    if (action === 'show' && ['try-free', 'alone'].includes(id())) return doShowMe();
    if (action.startsWith('spring:')) return setControl('spring', action.endsWith('soft') ? 'soft' : 'stiff');
    if (action.startsWith('road:')) return setControl('road', action.endsWith('bumpy') ? 'bumpy' : 'smooth');
    if (action === 'run' && ['try-free', 'alone'].includes(id())) return recordRun();
    if (action.startsWith('answer:') && CHECKS[id()] && phase === 'guess') {
      guess = Number(action.slice(7)); phase = 'done';
      const check = CHECKS[id()];
      say = guess === check.correct ? check.right : check.wrong;
      return {kind: guess === check.correct ? 'right' : 'wrong', say};
    }
    if (action.startsWith('answer:') && CHECKS[id()] && phase === 'quiz') {
      quizAnswer = Number(action.slice(7)); phase = 'done';
      const check = CHECKS[id()];
      say = quizAnswer === check.correct ? check.right : check.wrong;
      return {kind: quizAnswer === check.correct ? 'right' : 'wrong', say};
    }
    return null;
  }

  function tick(dt) {
    time += dt;
    if (id() === 'wonder' && phase !== 'done' && time >= 2) {
      phase = 'done';
      say = 'The wheel moves over the bumps, but the body above it moves less. In a bend the body leans outward. We will look at the spring and the forces next.';
      return {kind: 'right', say};
    }
    if (id() === 'watch' && phase !== 'done') {
      const stage = time >= 3.2 ? 3 : Math.floor(time / 1.2);
      if (stage !== watchStage) {
        setup = {...SETUPS[stage]};
        watchStage = stage;
        recordRun();
      }
      if (time >= 3.2) {
        phase = 'done'; setup = {...SETUPS[3]};
        say = `The readings changed with the settings. On bumps, soft gives `
          + `${shown(resultBySetup['soft/bumpy'].bodyShake)} m/s² and stiff gives `
          + `${shown(resultBySetup['stiff/bumpy'].bodyShake)} m/s². In this bend, `
          + `their roll angles are ${shown(resultBySetup['soft/smooth'].leanDeg, 1)}° `
          + `and ${shown(resultBySetup['stiff/smooth'].leanDeg, 1)}°.`;
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
        + 'When a bump pushes a wheel up, the spring compresses. '
        + `When the wheel drops, the spring stretches again.${MORE}The body rides above it.`;
      prompt = 'Press Enter to learn what spring stiffness means.';
    } else if (current === 'word-stiffness') {
      waiting = false;
      localSay = 'Spring stiffness tells us how strongly a spring resists being compressed or stretched. '
        + 'A stiffer spring moves less under the same force. It sends more bump motion into the body, '
        + 'so it can make this car less comfortable on a rough road.';
      prompt = 'Press Enter to learn what changes in a corner.';
    } else if (current === 'word-weight') {
      waiting = false;
      localSay = 'A turning car pushes sideways at the road. Its weight sits above the road, '
        + 'so the car wants to tip outward. The outside tyres carry more load and the inside tyres carry less.'
        + `${MORE}That is why the body leans.`;
      prompt = 'Press Enter to learn the name for this sideways lean.';
    } else if (current === 'word-roll') {
      waiting = false;
      localSay = 'Body roll is the sideways angle of the car body in a turn. '
        + 'The outside tyre pushes the spring in more, while the inside spring stretches. '
        + 'The body leans until the forces balance.';
      prompt = 'Press Enter to learn how the rig measures body shake.';
    } else if (current === 'word-shake') {
      waiting = false;
      localSay = 'The rig gives one body-shake reading for this test. A higher reading means harder shaking.';
      prompt = 'Press Enter to compare body roll in a bend.';
    } else if (current === 'formula') {
      waiting = false;
      localSay = 'A stiffer spring pushes back harder, so the body leans less. '
        + 'In this bend, the soft spring leans 6.5° and the stiff spring leans 2.2°. '
        + 'The numbers come from this test: 6.5 ÷ 2.2 is about 3, '
        + 'so the stiff spring leans about a third as much.';
      prompt = 'Check the worked sum, then press Enter to make your first prediction.';
    } else if (current === 'wonder') {
      waiting = phase !== 'done'; ready = phase === 'done';
      localSay = say || 'This shaker rig moves a wheel over a rough road while the car body rides above it. '
        + 'Watch the wheel and body move.';
      prompt = ready ? 'Press Enter to begin.' : 'Watch the wheel and the body move.';
      hints = ['Watch the wheel move over the rough surface.', 'The body above it moves too.', 'Wait for Brian to finish the demonstration.'];
    } else if (current === 'guess-bumps' || current === 'guess-roll') {
      waiting = asking; ready = !asking; result = asking ? null : settingResult();
      if (asking) {
        localSay = check.question; prompt = 'Pick a card by clicking it, or press 1, 2 or 3.';
        hints = current === 'guess-bumps'
          ? [
            'Compare what the two springs do on the same road.',
            'A spring that compresses more can soften bumps for the body.',
            'Choose the body-shake reading that is smaller.',
          ]
          : ['A stiffer spring pushes back harder.', 'In this bend, the numbers come from this test.', 'Choose the smaller angle.'];
      } else {
        localSay = say; prompt = 'Press Enter to continue.';
      }
    } else if (current === 'watch') {
      waiting = phase !== 'done'; ready = phase === 'done';
      localSay = say || 'I am changing the spring and road settings. Watch the wheel, body, spring and readings as the rig moves.';
      prompt = ready ? 'Press Enter to try your own settings.' : 'Watch the readings change.';
      hints = ['Watch the spring compress and extend as the wheel moves.', 'The panel follows each change in setting.', 'Wait for Brian to finish the demonstration.'];
    } else if (current === 'try-free') {
      waiting = phase !== 'done'; ready = phase === 'done'; target = ready ? null : 'show'; glow = 'settings';
      localSay = say || 'Choose a spring and a road, then run the rig. The results table keeps your measurements so you can compare three different setting pairs.';
      prompt = ready
        ? 'You tested three setting pairs. Press Enter to continue.'
        : `Choose settings and press Space to run. Different pairs tested: ${tested.size} of ${FREE_RUNS}.`;
      hints = ['Use the arrows to choose a spring and road.', 'A repeated setting pair does not count twice.', 'I will select a new pair and run it.'];
    } else if (current === 'alone') {
      const reached = phase === 'done'; waiting = !reached; ready = reached; target = reached ? null : 'show'; glow = 'settings';
      localSay = say || 'On your own, find a setup with less than 3° of body roll. '
        + 'Choose a spring and road, then run the rig.';
      prompt = reached
        ? 'You reached the target. Press Enter to continue.'
        : `Target: less than 3° of body roll. Current reading: ${shown(settingResult().leanDeg, 1)}°. `
          + 'Change the setup and press Space.';
      hints = [
        'A stiffer spring pushes back harder, so the body leans less.',
        'Set the stiff spring and run the rig.',
        'I will set the stiff spring on the smooth road and run the rig.',
      ];
    } else if (check && current.startsWith('check-')) {
      waiting = asking; ready = !asking;
      if (asking) {
        localSay = check.question; prompt = 'Pick a card by clicking it, or press 1, 2 or 3.';
        hints = ['Use the lesson words and the formula.', 'Think through what changes in this case.', 'Choose the sentence that answers the question.'];
      } else { localSay = say; prompt = 'Press Enter to continue.'; }
    } else if (current === 'recap') {
      waiting = false; ready = true;
      localSay = 'A turn pushes the car sideways at the road, while its weight sits above it, '
        + 'so the car wants to tip outward. A soft spring suits a rough road because it soaks up bumps. '
        + 'A stiff spring suits a smooth road and keeps the body flatter, but a rough road can shake '
        + 'the driver and briefly lift a tyre.';
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
    return {
      scene: current, time, setup: {...setup}, result,
      rollDeg: current === 'formula' ? rollDegrees(40000) : Number(result?.leanDeg ?? 0),
      rows: rows.map(row => ({...row})), tested: [...tested],
      actions: ['wonder', 'watch'].includes(current) ? ['replay'] : [], buttons, cards, keys,
      repeat: Object.keys(ARROW_ACTIONS).filter(key => keys[key]), hints, formulas: formulaRows(current, setup, {asking}),
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
