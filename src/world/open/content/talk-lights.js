import story from '../../../story/threads/content/lights-on-the-whites.js';
import {scablandsDriveAt} from '../../scablands-regions.js';
import {isTrue} from '../facts.js';
import {LIGHTS_ID, LIGHTS_LADDER_MARK, lightsMark} from './lights-on-the-whites-places.js';

const aboard = story.beats.aboard.lines;
const id = key => LIGHTS_ID + '/' + key;
const deck = {fact: 'made', id: LIGHTS_LADDER_MARK};
export const LIGHTS_TALK = Object.freeze({
  wick: [{scene: id('galley'), once: true, needs: deck}],
  fathom: [{scene: id('chart-table'), once: true, needs: deck}],
  'captain-imre': [{scene: id('later/logged-without-comment'), once: true,
    needs: {fact: 'mark', id: id('heard-and-left')}}],
  traders: [{scene: id('later/walked-in-at-dawn'), once: true, needs: {fact: 'mark', id: id('drove-on')}}],
});

export function lightsTalkScene(scene, {world, view}) {
  if (!view.checkpointsEnabled || !world.open.threads[LIGHTS_ID]) return null;
  const lines = scene === id('galley') ? aboard.slice(1, 3) :
    scene === id('chart-table') ? aboard.slice(3, 4) : null;
  if (!lines) return null;
  const effects = scene === id('chart-table') ? story.beats.aboard.explore[0].effects : [];
  return {id: scene, lines: lines.filter(row => !row.when || isTrue(row.when, world)),
    choices: [{id: scene, words: 'I hear you.', effects}]};
}

export function lightsLater(world, point, view, signs, distance, placeAt) {
  const record = world.open.threads[LIGHTS_ID];
  if (!record) return null;
  const later = story.later;
  const said = name => lightsMark(world, 'later/' + name);
  const report = name => later.find(row => row.id === name);
  const ship = placeAt('whites-ship-side', {});
  const gate = placeAt(['tin-town', 'gate'], {});
  if (record.end === 'passed-by' && !view.onFoot && distance(point, ship) <= 55 && !said('logged-without-comment') &&
      lightsMark(world, 'heard-and-left')) return report('logged-without-comment');
  const trader = view.road?.external?.group === 'traders' && view.road?.cars?.some(row => distance(point, row) <= 60);
  if (record.end === 'passed-by' && (distance(point, gate) <= 35 || trader) && !said('walked-in-at-dawn') &&
      lightsMark(world, 'drove-on') && world.ledger.night >= record.began + 2) return report('walked-in-at-dawn');
  const sign = world.ledger.made.includes('watch/ships-salt-pan') && signs.find(entry => entry.at &&
    scablandsDriveAt(entry.at.x, entry.at.z).id === 'salt-pan' && entry.id !== LIGHTS_ID);
  const seen = sign && 'something-on-the-salt/' + sign.id + '/' + world.ledger.night;
  if (sign && !said(seen)) return {...report('something-on-the-salt'), id: seen};
  return null;
}
