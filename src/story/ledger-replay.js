import {extraHeatTonight, ledgerCause, recordedTellCause} from './ledger.js';

const own = Object.hasOwn;
const equal = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const slots = {
  stock: 'stocks', word: 'words', met: 'encounters',
  mark: 'marks', made: 'made', debt: 'obligations', promise: 'obligations', settle: 'obligations',
  feud: 'feud', roadWord: 'roadWord', shareHearth: 'extraHeatFrom',
};

function factOf(change) {
  const slot = slots[change.type];
  return slot ? {slot, key: change.key} : null;
}

const factId = ({slot, key}) => slot + '/' + key;
const sameFact = (fact, id) => fact && factId(fact) === id;

function valueOf(ledger, {slot, key}) {
  switch (slot) {
    case 'marks':
    case 'made': return ledger[slot].includes(key);
    case 'obligations': return ledger.obligations.find(item => item.id === key) ?? null;
    case 'stocks':
    case 'words':
    case 'encounters': return ledger[slot][key] ?? null;
    default: return ledger[slot];
  }
}

function put(ledger, {slot, key}, value) {
  switch (slot) {
    case 'marks':
    case 'made':
      ledger[slot] = ledger[slot].filter(id => id !== key);
      if (value) ledger[slot].push(key);
      break;
    case 'obligations':
      ledger.obligations = ledger.obligations.filter(item => item.id !== key);
      if (value) ledger.obligations.push(value);
      break;
    case 'stocks':
    case 'words':
    case 'encounters':
      if (value === null) delete ledger[slot][key];
      else ledger[slot][key] = value;
      break;
    default:
      ledger[slot] = value;
  }
}

function beforeOf(change) {
  if (change.type === 'mark' || change.type === 'made') return false;
  if (change.type === 'shareHearth' || change.type === 'debt' || change.type === 'promise') return null;
  return change.before;
}

function afterOf(change, fallback) {
  if (change.type === 'mark' || change.type === 'made') return true;
  if (change.type === 'shareHearth') return change.night;
  if (change.type === 'settle') return null;
  return own(change, 'after') ? change.after : fallback;
}

function indexedChanges(history) {
  const facts = new Map();
  for (const change of history) {
    const fact = factOf(change);
    if (!fact) continue;
    const id = factId(fact);
    if (!facts.has(id)) facts.set(id, {fact, changes: []});
    facts.get(id).changes.push(change);
  }
  return facts;
}

function follow(value, change, fallback) {
  // Carry forward the amounts a later night actually gained or spent.
  if (change.type === 'stock' || change.type === 'roadWord') {
    const max = change.type === 'stock' ? Number.MAX_SAFE_INTEGER : 5;
    return Math.max(0, Math.min(max, value + (change.after - change.before)));
  }
  return afterOf(change, fallback);
}

function banked(ledger, night) {
  return ledger.night > night && ledger.history.some(change =>
    change.type === 'night' && change.night === night && change.choiceId === 'bank/' + night);
}

export function hasTelling(ledger, night) {
  return Boolean(ledger && banked(ledger, night));
}

// The later telling keeps its actual decisions, narration and bank. Its dependency
// note is on the ledger itself and appears until that later night is played again.
export function replayTelling(saved, played, night, legacyValue) {
  if (!hasTelling(saved, night) || !banked(played, night)) return null;
  const earlier = saved.history.filter(change => change.night < night);
  const later = saved.history.filter(change => change.night > night);
  const oldNight = saved.history.filter(change => change.night === night);
  const newNight = played.history.filter(change => change.night === night);
  const oldFacts = indexedChanges(oldNight);
  const newFacts = indexedChanges(newNight);
  const laterFacts = indexedChanges(later);
  const bankedLater = new Set(later.filter(change => change.type === 'night' &&
    change.choiceId === 'bank/' + change.night).map(change => change.night));
  const next = structuredClone(saved);
  const priorWarnings = Array.isArray(saved.toldBeforeChange) ? saved.toldBeforeChange : [];
  const warnings = new Set(priorWarnings.filter(value => Number.isSafeInteger(value) && value !== night));
  const replacement = new Map();
  const differences = [];

  for (const [id, {fact}] of new Map([...oldFacts, ...newFacts])) {
    const oldChanges = oldFacts.get(id)?.changes ?? [];
    const newChanges = newFacts.get(id)?.changes ?? [];
    const following = laterFacts.get(id)?.changes ?? [];
    const current = valueOf(saved, fact);
    // The first banked Night 2 build shipped key-only encounter and debt changes.
    // Their values are still in the stock ledger or in the next effect's before field.
    const laterOpening = following.length ? beforeOf(following[0]) : current;
    let opening = oldChanges.length ? beforeOf(oldChanges[0]) ?? null
      : laterOpening === undefined ? beforeOf(newChanges[0]) ?? null : laterOpening;
    // Original v1 used the display default even when no word had been saved.
    if (fact.slot === 'words' && opening === 'Strangers' &&
        !earlier.some(change => change.type === 'word' && change.key === fact.key)) opening = null;
    const oldEnd = oldChanges.at(-1);
    const matching = oldEnd && newChanges.find(change =>
      change.type === oldEnd.type && change.choiceId === oldEnd.choiceId);
    const recovered = oldEnd && (legacyValue?.(oldEnd) ?? matching?.after);
    let oldValue = oldEnd ? afterOf(oldEnd, recovered ?? laterOpening ?? current) : opening;
    let newValue = opening;
    for (const change of newChanges) {
      const before = newValue;
      newValue = follow(before, change, valueOf(played, fact));
      // A replay's opening can differ from the original shared ledger. Store the
      // actual counts on the replacement facts for any subsequent replay.
      if (change.type === 'stock' || change.type === 'roadWord') {
        replacement.set(change, {...change, before, after: newValue});
      } else if (own(change, 'before')) {
        replacement.set(change, {...change, before});
      }
    }
    if (equal(oldValue, newValue)) continue;
    differences.push({...fact, kept: oldValue, played: newValue});
    let laterIndex = 0;
    for (const change of later) {
      const cause = change.type === 'tell' ? recordedTellCause(saved, change) : null;
      const read = change.type === 'read' ? factOf({type: change.fact, key: change.key}) : factOf(cause ?? {});
      const writesFact = sameFact(factOf(change), id);
      const heatChanged = fact.slot === 'extraHeatFrom' &&
        extraHeatTonight(oldValue, change.night) !== extraHeatTonight(newValue, change.night);
      const bank = change.choiceId === 'bank/' + change.night &&
        (id === 'stocks/embers' || heatChanged ||
          fact.slot === 'obligations' && (oldValue?.due === change.night || newValue?.due === change.night));
      const usesValue = writesFact && (['stock', 'roadWord', 'feud', 'settle'].includes(change.type) || change.relative);
      if (!equal(oldValue, newValue) && (bank || usesValue || sameFact(read, id)) &&
          bankedLater.has(change.night)) warnings.add(change.night);
      if (!writesFact) continue;
      // Key-only v1 writes belong to the existing aggregate or the next transition.
      const followingChange = following[++laterIndex];
      const fallback = followingChange ? beforeOf(followingChange) : current;
      oldValue = follow(oldValue, change, fallback);
      newValue = follow(newValue, change, fallback);
    }
    if (!equal(current, newValue)) put(next, fact, newValue);
  }

  next.history = [...earlier, ...newNight.map(change => replacement.get(change) ?? change), ...later];
  // Old tells used array offsets. Save their stable links alongside the journal
  // so later written records stay byte-for-byte even when a source is removed.
  const legacyTellCauses = [...earlier, ...later].filter(change => change.type === 'tell' && !change.cause)
    .map(change => ({tell: ledgerCause(saved.history, saved.history.indexOf(change)), cause: recordedTellCause(saved, change)}));
  if (legacyTellCauses.length || own(saved, 'legacyTellCauses')) next.legacyTellCauses = legacyTellCauses;
  if (warnings.size || own(saved, 'toldBeforeChange')) next.toldBeforeChange = [...warnings].sort((a, b) => a - b);
  return {ledger: next, differences};
}
