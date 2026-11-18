// A scene is authored as lines, thoughts, questions and choices. Its question ids also
// become facts, so asking about Dace can open a second question. Only talkScreen's
// projection goes to the bubbles. Effects are delivered to the job on the final choice.
function checkWords(words) {
  if (typeof words !== 'string' || !words.trim() || words.length > 260)
    throw new TypeError('Story dialogue needs 1 to 260 characters per line.');
}

export function validateTalkScene(scene) {
  if (!scene?.choices?.length) throw new TypeError('A talk scene needs a choice.');
  const ids = new Set();
  for (const option of [...(scene.questions ?? []), ...scene.choices]) {
    if (!option.id || ids.has(option.id)) throw new TypeError('Talk option ids must be unique.');
    ids.add(option.id);
    checkWords(option.words);
    if (option.thought != null) checkWords(option.thought);
  }
  for (const line of [...(scene.lines ?? []), ...(scene.questions ?? []).flatMap(question => question.lines ?? [])]) {
    if (typeof line.speaker !== 'string' || !line.speaker) throw new TypeError('A spoken line needs a speaker.');
    checkWords(line.words);
  }
  for (const thought of scene.thoughts ?? []) checkWords(thought);
}

function publicLine({speaker, words, radio, low}) {
  return {speaker, words, radio: radio === true, low: low === true};
}

function enter(scene, state, phase, index = 0) {
  if (phase === 'lines' || phase === 'answer') {
    const lines = phase === 'lines' ? scene.lines : scene.questions.find(q => q.id === state.asked.at(-1)).lines;
    const line = lines?.[index];
    if (line) return {...state, phase, index, history: [...state.history, publicLine(line)]};
    return enter(scene, state, phase === 'lines' ? 'thoughts' : 'options');
  }
  if (phase === 'thoughts' && !scene.thoughts?.[index]) phase = 'options';
  return {...state, phase, index};
}

export function startTalk(scene) {
  validateTalkScene(scene);
  return enter(scene, {history: [], asked: []}, 'lines');
}

function options(scene, state, facts) {
  const known = new Set([...facts, ...state.asked]);
  const available = option => (option.needs ?? []).every(key => known.has(key));
  const questions = (scene.questions ?? []).filter(q => !state.asked.includes(q.id) && available(q));
  return [...questions.map(option => ({kind: 'ask', option})),
    ...scene.choices.filter(available).map(option => ({kind: 'say', option}))];
}

// The scene writer assigns choice.plain from the ledger's plainStockChange. Rebuild the
// small shape here: an accidental author-only property must never enter the screen model.
function plainChange(change) {
  if (!['embers', 'gas'].includes(change?.stock) || !Number.isFinite(change.before) || !Number.isFinite(change.after)) return null;
  return {stock: change.stock, before: change.before, after: change.after};
}

export function talkScreen(scene, state, facts = []) {
  const line = ['lines', 'answer'].includes(state.phase) ? state.history.at(-1) : null;
  const choices = state.phase === 'options' ? options(scene, state, facts).map(({kind, option}) => ({
    kind, words: option.words, thought: option.thought ?? null, plain: plainChange(option.plain),
  })) : [];
  return {phase: state.phase, line, history: state.history.map(publicLine), options: choices,
    thoughts: state.phase === 'thoughts' ? scene.thoughts.slice(0, state.index + 1) : [],
    stocks: Object.fromEntries(['embers', 'gas'].filter(key => Number.isFinite(scene.stocks?.[key])).map(key => [key, scene.stocks[key]]))};
}

export function actOnTalk(scene, state, action, facts = []) {
  if (action?.type === 'advance' && ['lines', 'answer', 'thoughts'].includes(state.phase))
    return {state: enter(scene, state, state.phase, state.index + 1)};
  if (state.phase !== 'options' || action?.type !== 'select' || !Number.isInteger(action.index)) return {state};
  const selected = options(scene, state, facts)[action.index];
  if (!selected) return {state};
  const {kind, option} = selected;
  if (kind === 'ask') {
    const history = [...state.history, publicLine({speaker: 'you', words: option.words})];
    return {state: enter(scene, {...state, history, asked: [...state.asked, option.id]}, 'answer')};
  }
  return {state: {...state, phase: 'done'}, choice: {id: option.id, effects: option.effects ?? [],
    asked: [...state.asked], questionEffects: state.asked.flatMap(id => scene.questions.find(q => q.id === id).effects ?? [])}};
}
