// Data and teaching state only. A lesson cannot write saves or race state.
export const LESSON_STAGES = Object.freeze(['Wonder', 'New words', 'Watch it work', 'Predict, then try', 'Check, then the challenge']);
export const FORCE_COLOURS = Object.freeze({lift: '#56d683', push: '#56d683', weight: '#f06464', drag: '#f0a148', grip: '#619dff'});
const registry = new Map();
const sentences = text => String(text).split(/[.!?]+(?=\s|$)/).filter(part => part.trim());
const includesWord = (text, word) => new RegExp(`(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(text);

// All displayed prose is plain text. Picture hooks draw into a supplied canvas.
export function validateLesson(def, hooks) {
  const fail = message => { throw new Error(`Lesson ${def?.id ?? '?'}: ${message}`); };
  if (!/^[a-z0-9-]{1,40}$/.test(def?.id) || !Array.isArray(def.words) || !def.words.length || !Array.isArray(def.vocabulary)) fail('needs id, words and vocabulary');
  const ids = new Set();
  for (const w of def.words) {
    if (!/^[a-z0-9-]{1,40}$/.test(w.id) || ids.has(w.id) || !w.word || sentences(w.meaning).length !== 1) fail('each word needs a unique id and one-sentence meaning');
    ids.add(w.id);
  }
  if (def.vocabulary.some(w => !def.words.some(row => row.word.toLowerCase() === w.toLowerCase()))) fail('vocabulary is missing a words step');
  const shown = new Set();
  const prose = (text, max = 2) => {
    if (typeof text !== 'string' || !text.trim() || sentences(text).length > max || /not quite/i.test(text)) fail('use one or two short sentences');
    for (const w of def.words) if (!shown.has(w.id) && includesWord(text, w.word)) fail(`word used before shown: ${w.word}`);
  };
  const animation = id => { if (typeof hooks?.animations?.[id] !== 'function') fail(`missing animation ${id}`); };
  const moment = row => {
    if (!row || !Number.isFinite(row.seconds) || row.seconds <= 0) fail('animation needs a positive duration');
    prose(row.text); animation(row.animation);
    if (row.voice && typeof row.voice !== 'string') fail('invalid voice cue');
  };
  const pictures = q => {
    prose(q.text);
    if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 3) fail('questions need two or three pictures');
    const answerIds = new Set();
    for (const a of q.answers) {
      if (!a.id || answerIds.has(a.id)) fail('picture ids must be unique');
      answerIds.add(a.id); prose(a.label);
      if (typeof hooks?.pictures?.[a.picture] !== 'function') fail(`missing picture ${a.picture}`);
      animation(a.animation);
    }
    if (!answerIds.has(q.correct)) fail('question needs a correct picture');
  };
  moment(def.wonder);
  for (const w of def.words) { shown.add(w.id); prose(w.meaning, 1); animation(w.animation); }
  if (!Array.isArray(def.worked) || !def.worked.length) fail('needs named worked steps');
  for (const step of def.worked) { prose(step.name); moment(step); }
  if (!Array.isArray(def.tries) || def.tries.length !== 3) fail('needs guided, prompted and alone tries');
  def.tries.forEach((row, i) => {
    if (row.support !== ['guided', 'prompted', 'alone'][i]) fail('tries must remove help in order');
    pictures(row.prediction); prose(row.prompt); prose(row.success); animation(row.animation);
    if (!Number.isFinite(row.seconds) || row.seconds <= 0 || !row.controls?.length) fail('try needs duration and machine controls');
    for (const c of row.controls) { prose(c.label); if (!c.id || !(Number.isFinite(c.value) || typeof c.value === 'string')) fail('invalid machine control'); }
  });
  if (typeof hooks?.evaluate !== 'function') fail('needs a try evaluator');
  if (!Array.isArray(def.checks) || def.checks.length < 2 || def.checks.length > 3) fail('needs two or three checks');
  def.checks.forEach(pictures);
  prose(def.challenge.text, 1);
  // During an inline challenge the key card uses one of the two sentences.
  const trialText = def.challenge.try ?? def.tries[2];
  for (const text of [trialText.prompt, trialText.success, trialText.prediction.text]) prose(text, 1);
  if (def.challenge.try) {
    const trial = {...def, tries: [...def.tries.slice(0, 2), {...def.challenge.try, support: 'alone'}], challenge: {text: def.challenge.text}};
    validateLesson(trial, hooks);
  }
  if (!def.hints || !Object.keys(def.hints).length) fail('needs a hint ladder');
  for (const hint of Object.values(def.hints)) { prose(hint.what); prose(hint.plainer); prose(hint.worked); }
  return def;
}

export function registerLesson(definition, hooks) {
  validateLesson(definition, hooks);
  if (registry.has(definition.id)) throw Error(`Lesson already registered: ${definition.id}`);
  // Own the data: a caller cannot mutate an already validated definition.
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const entry = {definition: freeze(structuredClone(definition)), hooks};
  registry.set(definition.id, entry);
  return () => { if (registry.get(definition.id) === entry) registry.delete(definition.id); };
}
export const lessonDefinition = id => registry.get(id) ?? null;
export const registeredWords = () => [...registry.values()].flatMap(e => e.definition.words);
export const entryForWord = id => [...registry.values()].find(e => e.definition.words.some(w => w.id === id)) ?? null;

export function createLessonSession(entry) {
  const {definition: d, hooks} = entry;
  let stage = 0, index = 0, time = 0, paused = false, selected = null, result = null;
  let failures = 0, hint = null, showing = false, returnToTry = false, previous = null, input = {}, running = false, checkAnswer = null, challenging = false;
  const attempts = [];
  const reset = () => { time = 0; paused = false; };
  const row = () => stage === 0 ? d.wonder : stage === 1 ? d.words[index] : stage === 2 ? d.worked[index] : stage === 3 ? challenging ? d.challenge.try ?? d.tries[2] : d.tries[index] : d.checks[index];
  const duration = () => stage === 1 ? 4 : stage === 4 ? 3 : row()?.seconds ?? 4;
  function next() {
    if (showing) {
      if (time < duration()) return false;
      if (++index < d.worked.length) { reset(); return true; }
      stage = 3; index = returnToTry; showing = false; result = null; hint = null; running = false; selected = null; reset(); return true;
    }
    if (challenging) return false;
    if (stage === 4 && index >= d.checks.length) return false;
    if (stage === 2 && time < duration() || stage === 3 && !result?.passed || stage === 4 && index < d.checks.length && !checkAnswer) return false;
    if (stage === 3) previous = {input: {...input}, time, animation: row().animation};
    if (stage === 0) { stage = 1; index = 0; }
    else if (stage === 1 && index + 1 < d.words.length || stage === 2 && index + 1 < d.worked.length || stage === 3 && index < 2 || stage === 4 && index < d.checks.length) index++;
    else { stage++; index = 0; }
    selected = null; result = null; hint = null; checkAnswer = null; input = {}; running = false; reset();
    return true;
  }
  function finishRun() {
    const outcome = hooks.evaluate({tryIndex: index, input: {...input}, prediction: selected});
    if (!outcome || typeof outcome.passed !== 'boolean' || !row().prediction.answers.some(a => a.id === outcome.actual)) throw Error('Invalid lesson outcome');
    if (!outcome.passed && !d.hints[outcome.failure]) throw Error('Missing failure hint');
    result = {...outcome}; running = false;
    attempts.push({input: {...input}, controls: row().controls.map(c => ({...c}))});
    if (!result.passed) { failures++; hint = d.hints[result.failure]; }
  }
  return {
    next,
    startChallenge() {
      if (stage !== 4 || index !== d.checks.length) return false;
      challenging = true; stage = 3; index = 2; input = {}; result = null; selected = null; running = false; hint = null; reset(); return true;
    },
    challengeRetry() { if (challenging && result) { previous = {input: {...input}, time, animation: row().animation}; result = null; hint = null; selected = null; reset(); } },
    tick(dt) {
      if (paused || stage === 3 && !running || stage === 4 && !checkAnswer) return;
      time = Math.min(duration(), time + Math.max(0, Math.min(dt, .1)) * .5);
      if (stage === 3 && running && time >= duration()) finishRun();
    },
    pause() { paused = !paused; },
    step() { paused = true; time = Math.min(duration(), time + .25); if (stage === 3 && running && time >= duration()) finishRun(); },
    replay() { reset(); },
    predict(id) { if (stage === 3 && !running && !result && row().prediction.answers.some(a => a.id === id)) selected = id; },
    control(id) { if (stage !== 3 || running || result) return; const c = row().controls.find(c => c.id === id); if (c) input[c.id] = c.value; },
    run() {
      if (stage !== 3 || !selected || running || result) return false;
      if (previous) previous = {...previous};
      running = true; reset(); return true;
    },
    retry() {
      if (stage !== 3 || !result || result.passed) return;
      previous = {input: {...input}, time, animation: row().animation};
      result = null; selected = null; hint = null; reset();
    },
    showMe() {
      if (stage !== 3 || failures < 3 || !result || result.passed) return false;
      returnToTry = index; showing = true; stage = 2; index = 0; reset(); return true;
    },
    answer(id) { if (stage === 4 && index < d.checks.length && !checkAnswer && row().answers.some(a => a.id === id)) { checkAnswer = id; reset(); } },
    view() {
      const r = row(), challenge = stage === 4 && index === d.checks.length;
      const words = d.words.slice(0, stage > 1 ? d.words.length : stage === 1 ? index + 1 : 0);
      const question = stage === 3 ? r.prediction : stage === 4 && !challenge ? r : null;
      const correct = checkAnswer && question.answers.find(a => a.id === question.correct);
      const text = showing ? d.hints[result.failure].worked : challenge ? d.challenge.text :
        stage === 1 ? r.meaning : stage === 4 ? (checkAnswer ? (checkAnswer === question.correct ? 'You saw it.' : 'Watch the highlighted picture.') : r.text) :
          stage === 3 ? result ? result.passed ? r.success : failures >= 2 ? hint.plainer : hint.what :
            running ? r.prompt : selected ? (r.support === 'alone' ? 'Your turn.' : r.prompt) : question.text : r.text;
      return {stage, index, title: challenging && !showing ? 'Challenge' : LESSON_STAGES[stage], text, words, time, paused, duration: duration(), showing, challenge, challenging,
        keyIdea: challenging && !showing && !hint ? d.challenge.text : null, attempts: attempts.map(a => ({input: {...a.input}, controls: a.controls.map(c => ({...c}))})),
        name: stage === 2 ? r.name : stage === 1 ? r.word : null,
        animation: correct?.animation ?? r?.animation, question, selected, result, running, input: {...input}, previous,
        controls: stage === 3 && selected && !running && !result ? r.controls : [], support: stage === 3 ? r.support : null,
        showMe: stage === 3 && failures >= 3 && result && !result.passed,
        retry: stage === 3 && result && !result.passed, checkAnswer,
        canNext: showing ? time >= duration() : stage === 2 ? time >= duration() : stage === 3 ? result?.passed === true : stage === 4 ? Boolean(checkAnswer) : true};
    },
  };
}

// The same metres-per-newton scale is used for every arrow in a drawing.
export function forceArrow(force, metresPerNewton) {
  if (!Object.hasOwn(FORCE_COLOURS, force.kind) || !Number.isFinite(force.newtons) || force.newtons < 0 || !Number.isFinite(metresPerNewton) || metresPerNewton <= 0) throw Error('Invalid force arrow');
  return {...force, colour: FORCE_COLOURS[force.kind], length: force.newtons * metresPerNewton, label: `${force.newtons} N`};
}
