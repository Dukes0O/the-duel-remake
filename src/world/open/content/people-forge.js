import {checkPerson, requireSound} from '../check-tables.js';
import {BUILDINGS} from './buildings.js';
import {pointInBuilding} from '../building-rule.js';

const resident = (id, house, work, task, bed) => {
  const post = (spot, task) => ({kind: 'post', at: [house, spot], task});
  return {id, figure: id, home: 'tin-town', talk: id,
    routine: {day: post(work, task), dusk: post(work, task), dark: post(bed, 'sleep')}};
};
export const FORGE_PEOPLE = Object.freeze(requireSound([
  resident('odessa', 'forge-shed', 'work', 'weld', 'cot'),
  resident('moss', 'bess-shed', 'work', 'scrub', 'bench'),
], checkPerson, 'The people in the sheds'));

export function forgePosts(partOfDay, heightAt) {
  return FORGE_PEOPLE.map(person => {
    const {at: [house, spot], task} = person.routine[partOfDay] ?? person.routine.day;
    const row = BUILDINGS.find(row => row.id === house);
    const point = pointInBuilding(row, row.room.spots[spot]);
    return {id: person.id, action: task, position: {...point, y: heightAt(point.x, point.z)}};
  });
}
