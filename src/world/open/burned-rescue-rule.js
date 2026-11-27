// Saved consequences are ordinary ledger effects. Cancelling a drive changes none of them.
import {namedThrow} from '../../story/ledger.js';
import {favoursOf} from './open-record.js';
import {daceIsAway} from './content/dace-goes-looking-places.js';
import {RESCUE_HELPERS} from '../../story/scenes/burned-camp-home.js';

const id = 'burned-camp';
const known = (world, key) => world.ledger.marks.includes(id + '/' + key);
const mark = (key, text) => ({type: 'mark', id: id + '/' + key, ...(text ? {text} : {})});
const partyPrefix = id + '/party/';
export const GROWERS = ['finch', ...Array.from({length: 7}, (_, i) => 'grower-' + (i + 1)), 'marigold'];

export function heldGrowers(world) {
  if (['took-them-alone', 'bought-back-in-fire', 'bought-back', 'rode-out'].some(key => known(world, key))) return [];
  const earlier = new Set();
  if (known(world, 'drain-out') || known(world, 'creep-out')) {
    ['finch', 'grower-1', 'grower-2'].forEach(person => earlier.add(person));
  }
  if (known(world, 'broke-out')) {
    earlier.add('finch');
    for (let i = 1; i <= 3; i++) if (known(world, 'waved-along-' + i)) earlier.add('grower-' + i);
  }
  return GROWERS.filter(person => !earlier.has(person) && !known(world, 'home/' + person));
}

export function growersHome(world, count = GROWERS.length) {
  return heldGrowers(world).slice(0, count).map(person => mark('home/' + person));
}

export function buyBackPrice(world) {
  // namedThrow compares the same seeded draw to each boundary. Find its one bucket in the inclusive range.
  let low = 0, high = 80;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (namedThrow(world.ledger, 'burned-camp/buy-back-price', (middle + 1) / 81)) high = middle;
    else low = middle + 1;
  }
  const held = heldGrowers(world).length;
  if (!held) return 0;
  const price = 260 + low;
  return held === GROWERS.length ? price : Math.max(60, Math.round(price * held / GROWERS.length / 10) * 10);
}

export function partyAttempt(world) {
  return world.ledger.marks.filter(key => key.startsWith(partyPrefix) && /^\d+$/.test(key.slice(partyPrefix.length))).length;
}

function costOf(world, helper, debts = new Set(), spent = {}) {
  const debt = world.ledger.obligations.find(row => row.type === 'debt' && row.owedBy !== 'player' &&
    !debts.has(row.id) && (helper.debts?.includes(row.id) || row.person === helper.person));
  if (debt) return {type: 'settle', id: debt.id};
  if (helper.people && favoursOf(world, helper.people) > (spent[helper.people] ?? 0))
    return {type: 'favour', person: helper.people, by: -1};
  return null;
}

export function availableRescueHelpers(world, cast, ask) {
  const fresh = partyAttempt(world) === 0;
  return RESCUE_HELPERS.filter(helper => {
    if (helper.id === 'dace' && daceIsAway(world)) return false;
    if (helper.ashOnly && cast.enemy !== 'ash-men' || helper.id === 'tally' && cast.enemy !== 'road-rats') return false;
    return ask(helper.when) && (fresh || costOf(world, helper));
  });
}

export function commitParty(world, available, selected) {
  const attempt = partyAttempt(world) + 1;
  if (new Set(selected).size !== selected.length || selected.length > 3) return null;
  const helpers = selected.map(id => available.find(helper => helper.id === id));
  if (helpers.some(helper => !helper)) return null;
  const effects = [mark('party/' + attempt)];
  const debts = new Set(), spentFavours = {};
  // Give each debt or shared favour to at most one helper.
  for (const helper of helpers) {
    const cost = costOf(world, helper, debts, spentFavours);
    if (!cost && (attempt > 1 || costOf(world, helper))) return null;
    if (cost?.type === 'settle') debts.add(cost.id);
    if (cost?.type === 'favour') spentFavours[cost.person] = (spentFavours[cost.person] ?? 0) + 1;
    if (cost) effects.push(cost);
    const name = {rell: 'Rell', dace: 'Dace', moss: 'Moss', keeper: 'The keeper', tally: 'Tally', nat: 'Nat'}[helper.id];
    const rode = helper.job === 'watch' ? name + ' kept watch for your rescue party.' : name + ' joined your rescue party.';
    const paid = cost?.type === 'settle' ? ' This settled a debt.' : cost ? ' You spent a favour.' : '';
    effects.push(mark('party/' + attempt + '/' + helper.id, rode + paid));
  }
  return effects;
}

export function currentParty(world) {
  const attempt = partyAttempt(world);
  return RESCUE_HELPERS.filter(row => known(world, 'party/' + attempt + '/' + row.id));
}

export function rescueMission(mission, world, cast, ask) {
  const party = currentParty(world);
  const hasJob = job => party.some(row => row.job === job);
  const opening = party.find(row => row.id === 'rell')?.id ?? party.find(row => row.job === 'pen')?.id;
  const guarded = known(world, 'seen') || known(world, 'caught-breaking-out') || known(world, 'grey-seen');
  const twice = known(world, 'some-home') || known(world, 'rescue-failed');
  const ash = cast.enemy === 'ash-men';
  const rule = {...mission.rule, guide: hasJob('guide'), opening, carries: hasJob('carry'), watches: hasJob('watch'), blocks: hasJob('block'),
    knowsWay: known(world, ash ? 'knows-ash-tip' : 'knows-drain') || known(world, 'drain-out') || known(world, 'broke-out') || hasJob('guide'),
    counted: known(world, 'counted-six'), opensAfter: hasJob('guide') ? 90 : 110, guards: (guarded ? 2 : 1) * (twice ? 2 : 1), people: heldGrowers(world).length};
  if (ash) {
    Object.assign(rule, {entrance: 'grey-camp', lookout: ['grey-camp', 'rescue-lookout'], pen: ['grey-camp', 'rescue-pen'],
      drain: ['grey-camp', 'rescue-tip'], exitVia: undefined, chaseTo: 'furnace-watch',
      riders: [['grey-camp', 'rescue-riders'], ['grey-camp', 'rescue-lookout']],
      returnRiders: [['grey-camp', 'rescue-riders'], ['grey-camp', 'rescue-lookout']]});
  }
  return {...mission, enemy: cast.enemy, rule, lines: mission.lines.filter(line => ask(line.when) &&
    (line.moment !== 'whistle' || opening === 'rell') && (line.moment !== 'guided' || rule.guide))};
}

export function rescueEffects(world, outcome, result) {
  if (outcome === 'some-home') {
    const maximum = Math.max(0, heldGrowers(world).length - 1);
    return growersHome(world, Math.min(maximum, Math.max(0, result?.rescued ?? 0)));
  }
  if (outcome === 'none-home') {
    const people = [...new Set(currentParty(world).map(row => row.people).filter(Boolean))];
    return people.map(person => ({type: 'word', person, by: -1}));
  }
  if (['all-home', 'bess-holed'].includes(outcome)) return growersHome(world);
  return [];
}

// The dated mark applies to tomorrow only, including an apprentice's delivery at its bank.
export function damagedBessLoad(world, load) {
  const damage = world.ledger.history.findLast(change => change.type === 'mark' && change.key === id + '/bess-holed');
  return damage?.night === world.ledger.night - 1 ? Math.floor(load * 2 / 3) : load;
}

export function rescuePage(effects) {
  return effects.flatMap(row => row.type === 'mark' && row.text
    ? [row, {type: 'tell', sourceMark: row.id, text: row.text}] : [row]);
}
