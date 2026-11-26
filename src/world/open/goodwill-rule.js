import {isTrue} from './facts.js';
import {SITE_NEEDS, mendedMark} from './content/needs.js';

const word = (person, by) => ({type: 'word', person, by});

const changes = {
  mend(world, person) {
    const alreadyMended = SITE_NEEDS.some(need => need.site === person && need.kind === 'mend'
      && isTrue({fact: 'mark', id: mendedMark(need.id)}, world));
    return [
      ...(!alreadyMended && isTrue({fact: 'word', of: person, is: 'Strangers'}, world) ? [word(person, 1)] : []),
      {type: 'favour', person, by: 1},
    ];
  },
  kept(world, person) {
    return isTrue({fact: 'word', of: person, is: 'Friendly'}, world) ? [word(person, 1)] : [];
  },
  helped: (world, person) => [word(person, 1)],
  broken: (world, person) => [word(person, -1)],
  attacked: (world, person) => [word(person, -2), {type: 'roadWord', by: -1}],
  left: (world, person) => [word(person, -1), {type: 'mark', id: 'left/' + person}],
  away: () => [],
};

export function goodwillEffects(world, person, deed) {
  if (!Object.hasOwn(changes, deed)) throw new RangeError('Unknown deed: ' + deed);
  return changes[deed](world, person);
}
