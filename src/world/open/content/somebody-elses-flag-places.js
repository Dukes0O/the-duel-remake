// Mechanical staging for the unchanged storyline. All dialogue remains in its authored file.
import story from '../../../story/threads/content/somebody-elses-flag.js';
import {LAND} from '../../scablands-names.js';
import {nameRow} from '../register.js';
import {isTrue} from '../facts.js';

export const FLAG_ID = story.id;
export const FLAG_WELL = 'sweet-seep';
export const FLAG_WHERE = ['dead-mall', -850, -450];
export const FLAG_SPOTS = Object.freeze({
  table: {x: 0, z: 28}, pell: {x: 0, z: 24}, rope: {x: -8, z: 24}, finch: {x: -11, z: 25},
  peg: {x: -18, z: 12}, reeds: {x: -13, z: -7}, board: {x: 8, z: 21}, stakes: {x: 20, z: 5},
  'pickup-left': {x: -18, z: 0}, 'pickup-right': {x: 18, z: 0},
});
export const FLAG_SCENES = Object.freeze({
  site: {at: [FLAG_WELL, 'table'], within: 4, foot: true},
  schedule: {at: [FLAG_WELL, 'table'], within: 4, foot: true},
  price: {at: [FLAG_WELL, 'table'], within: 4, foot: true},
  hearth: {at: ['tin-town', 'hearth'], within: 12, foot: true},
  table: {at: [FLAG_WELL, 'table'], within: 4, foot: true},
  sold: {at: [FLAG_WELL, 'table'], within: 8, foot: true},
  fight: {at: FLAG_WELL, within: 100, foot: false},
});

const costCondition = (value, extra) => {
  if (Array.isArray(value)) return value.map(item => costCondition(item, extra));
  if (!value || typeof value !== 'object') return value;
  if (value.fact === 'scrap') return {...value, atLeast: value.atLeast + extra(value.atLeast)};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, costCondition(item, extra)]));
};

// Supply staging data without changing a word or the shape counts of the source.
export function stagedFlag(world) {
  const atOdds = isTrue({fact: 'feud', of: 'water-men', atLeast: 'Raiding'}, world);
  const beats = {...story.beats};
  beats.site = {...beats.site, explore: beats.site.explore.map(row => ({...row,
    when: {all: [row.when ?? {reach: FLAG_WELL}, {reach: [FLAG_WELL, row.id], within: 2.5}]}}))};
  beats.carry = {...beats.carry, mission: {...beats.carry.mission,
    rule: {destination: FLAG_WELL, within: 40}, outcomes: {unseen: {next: 'table'}}}};
  beats.fight = {...beats.fight, mission: {...beats.fight.mission, rule: {...beats.fight.mission.rule,
    at: FLAG_WELL, riderStarts: [[FLAG_WELL, 'pickup-left'], [FLAG_WELL, 'pickup-right']],
    winWrecks: 1, mass: 3000, recoveryShare: .5}}};
  if (atOdds) beats.table = {...beats.table, choices: beats.table.choices.map(row => {
    if (!row.id.startsWith('pay-')) return row;
    const extra = amount => (amount < 160 ? amount + 100 : amount) / 4;
    return {...row, when: costCondition(row.when, extra), effects: row.effects.map(effect =>
      effect.type === 'scrap' ? {...effect, by: effect.by - extra(-effect.by)} : effect)};
  })};
  return {...story, beats};
}

export function flagCompanyPresent(world) {
  const record = world.open.threads[FLAG_ID];
  return !!record && !['bought', 'driven-off'].includes(record.end);
}

export function flagPeople(world) {
  if (!flagCompanyPresent(world)) return [];
  const record = world.open.threads[FLAG_ID], origin = LAND.at(...FLAG_WHERE);
  const row = (id, figure, spot) => {
    const offset = FLAG_SPOTS[spot];
    const at = [FLAG_WHERE[0], origin.x - LAND.at(FLAG_WHERE[0]).x + offset.x,
      origin.z - LAND.at(FLAG_WHERE[0]).z + offset.z];
    const post = {kind: 'post', at, action: 'stand'};
    return {id, figure, home: FLAG_WELL, talk: null, routine: {day: post, dusk: post, dark: post}};
  };
  const leader = nameRow(record.cast.camp)?.leader;
  return [row('miss-pell', 'hetty', 'pell'),
    row('flag-crew-1', 'road-rat-lookout', 'pickup-left'), row('flag-crew-2', 'road-rat-lamp', 'pickup-right'),
    row('flag-crew-3', 'grower-1', 'stakes'),
    ...(!record.end ? leader ? [row(leader, leader === 'gasket' ? 'sump' : leader, 'rope')] : [row('traveller', 'rell', 'rope')] : []),
    ...(!record.end && record.cast.camp === 'glasshouse' ? [row('finch', 'finch', 'finch')] : [])];
}

export const FLAG_LATER_PLACES = Object.freeze({
  trader: ['tin-town', 'gate'], 'printed-card': ['tin-town', 'board'], dot: ['tin-town', 'hearth'],
});
export const FLAG_TALK_ROWS = Object.freeze(story.later.map(row => ({...row,
  afterNights: row.id.endsWith('-fee') ? 0 : 2,
})));
export function flagSolids(world, heightAt) {
  if (!flagCompanyPresent(world)) return [];
  const at = LAND.at(...FLAG_WHERE);
  return [{id: 'flag-drill', x: at.x, z: at.z, halfX: 2, halfZ: 2, height: 24},
    {id: 'flag-table', x: at.x, z: at.z + 22, halfX: 1.5, halfZ: .7, height: 1}]
    .map(row => ({...row, kind: 'prop', shape: 'box', heading: 0, base: heightAt(row.x, row.z)}));
}
export {story as flagStory};
