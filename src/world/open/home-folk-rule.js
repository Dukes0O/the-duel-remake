import {HOME_FOLK, HOME_MARANS, homeFolkOffer, hasHomeFolk} from './content/home-folk.js';
import {buildInLand, buildingDoor, gateOf, groundCentre, pieceInLand, wellInLand} from './home-rule.js';
import {LAND} from '../scablands-names.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';

const same = (a, b) => a.i === b.i && a.j === b.j;
export function folkInvitation(world, home) {
  return HOME_FOLK.find(row => !home.folk.some(kept => kept.id === row.id) && homeFolkOffer(world, row.id)) ?? null;
}
export function spareHomeHut(home) {
  return home.builds.find(row => row.kind === 'hut' && row.stage === 4 && !home.folk.some(person => same(person.hut, row))) ?? null;
}
export function inviteHomeFolk(world, home, id, hut) {
  if (!homeFolkOffer(world, id) || home.folk.some(row => row.id === id) || !hut || hut !== spareHomeHut(home)) return home;
  return {...home, folk: [...home.folk, {id, hut: {i: hut.i, j: hut.j}, arrived: false}]};
}
export function arriveHomeFolk(home, id) {
  const row = home.folk.find(row => row.id === id && !row.arrived);
  if (!row) return home;
  return {...home, folk: home.folk.map(person => person === row ? {...row, arrived: true} : person),
    hens: id === 'growers' ? [...home.hens, ...HOME_MARANS.map(hen => ({...hen}))] : home.hens};
}
export function homeFolkWork(home, id) {
  const kind = {slack: 'coop', finch: 'tower', dace: 'shed', growers: 'greenhouse'}[id];
  const row = home.builds.find(row => row.kind === kind && row.stage === 4);
  if (row) {
    const at = buildInLand(row);
    return id === 'dace' ? {...at, x: at.x + at.width / 2 + 2.1} : id === 'finch' ? at : buildingDoor(row);
  }
  if (id === 'mr-penny' && home.well?.pump) return {...wellInLand(home.well), x: wellInLand(home.well).x + 1.5};
  const folk = home.folk.find(row => row.id === id);
  const hut = folk && home.builds.find(row => row.kind === 'hut' && same(row, folk.hut));
  return hut ? buildingDoor(hut) : groundCentre();
}
export function slackSawEggs(home, people, player) {
  const slack = people?.find(row => row.id === 'slack');
  return home.shown || !!(hasHomeFolk(home, 'slack') && slack && player &&
    Math.hypot(slack.position.x - player.x, slack.position.z - player.z) <= 6);
}
const asPlace = point => {
  const town = LAND.at('tin-town');
  return ['tin-town', point.x - town.x, point.z - town.z];
};
// The people part keeps its mover, figures and talk. A home row only changes their destination.
export function homeFolkRows(world, view, rows) {
  const home = view.homeGround && world.open.home;
  if (!home?.folk?.length) return rows;
  const moving = home.folk;
  const owner = id => ['marigold', 'rescued/marigold'].includes(id) || /^(rescued\/)?grower-/.test(id) ? 'growers' : id.replace('rescued/', '');
  const kept = rows.filter(row => !moving.some(person => person.id === owner(row.id)));
  for (const person of moving) {
    const hut = home.builds.find(row => row.kind === 'hut' && same(row, person.hut));
    if (!hut) continue;
    const ids = person.id === 'growers' ? ['marigold', ...Array.from({length: 7}, (_, n) => 'grower-' + (n + 1))] : [person.id];
    const gate = gateOf(home), centre = groundCentre(), at = gate ? pieceInLand(gate) : centre;
    const dx = centre.x - at.x, dz = centre.z - at.z, length = Math.hypot(dx, dz) || 1;
    for (const [index, id] of ids.entries()) {
      const old = rows.find(row => row.id === id || row.id === 'rescued/' + id);
      const sourceAt = old?.routine?.day?.at ?? old?.routine?.day?.around;
      const source = old?.position ?? (sourceAt?.length === 3 ? LAND.at(...sourceAt) : null) ?? LAND.at(id === 'hetty' ? 'radio-hill' : id === 'mr-penny' ? 'dead-mall' : 'tin-town');
      const door = buildingDoor(hut), inside = buildInLand(hut);
      const work = homeFolkWork(home, person.id);
      const target = view.partOfDay === 'dark' ? inside : {...work, x: work.x + index % 3 * .65, z: work.z + Math.floor(index / 3) * .65};
      if (person.id === 'finch' && view.fighter?.position && Math.hypot(view.fighter.position.x - work.x, view.fighter.position.z - work.z) < 3 &&
          view.fighter.position.y > 3 + scablandsSurfaceHeightAt(work.x, work.z)) Object.assign(target, buildingDoor(home.builds.find(row => row.kind === 'tower' && row.stage === 4) ?? hut));
      kept.push({id, figure: id === 'slack' ? 'tin-child' : id === 'mr-penny' ? 'walker-3' : id.startsWith('grower-') ? 'grower-' + (1 + index % 3) : id,
        talk: 'home-folk/' + person.id, homeFolk: person.id, homeArrived: person.arrived,
        homeRoute: [{x: at.x - dx / length * 3, z: at.z - dz / length * 3},
          {x: at.x + dx / length * 3, z: at.z + dz / length * 3}, door],
        homeSource: source, routine: {day: {kind: 'post', at: asPlace(target), task: 'stand'}}});
    }
  }
  return kept;
}
export function homeFolkTalk(id) {
  const row = HOME_FOLK.find(row => id === 'home-folk/' + row.id);
  return row ? {id, scene: {id, title: row.name, lines: [{speaker: row.id === 'growers' ? 'marigold' : row.id, words: row.greet}], choices: [{id: 'thanks', words: "I'll leave you to it."}]}} : null;
}
