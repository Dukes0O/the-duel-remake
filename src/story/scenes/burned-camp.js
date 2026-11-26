import {validateTalkScene} from '../talk.js';
import {GLASSHOUSE_LAYOUT} from '../../world/open/looks/glasshouse-look.js';
import {LAND} from '../../world/scablands-names.js';
import {NAMES} from '../../world/open/register.js';
import {resolveRoles} from '../../world/open/roles.js';

// OPEN-SITES supplies the live site's position. This fixed fallback is its first approved position and the sample's.
const ships = LAND.at('ships-in-sand');
const sampleGlasshouse = LAND.at('ships-in-sand', 2000, 700);
const onLand = (x, z) => LAND.at('ships-in-sand', x - ships.x, z - ships.z);

export function placeForThread(place, cast, view = {}) {
  if (!place) return null;
  if (place.checkpoint) return view.checkpointPlaces?.[place.checkpoint.who] ?? null;
  const [id, spot] = [resolveRoles(place, cast)].flat();
  const site = view.sitePositions?.[id];
  const center = site?.position ?? site ?? (id === 'glasshouse' ? sampleGlasshouse : null);
  if (!center) {
    if (spot) return null;
    const fixed = [...LAND.table, ...LAND.named, LAND.yard].find(row => row.id === id);
    return fixed ? LAND.at(id) : null;
  }
  if (!spot) return center;
  if (spot === 'parked-car') return view.carPosition ?? null;
  if (spot === 'road-home') {
    const home = LAND.at('tin-town');
    const scale = 120 / Math.hypot(home.x - center.x, home.z - center.z);
    return onLand(center.x + (home.x - center.x) * scale, center.z + (home.z - center.z) * scale);
  }
  const offset = site?.spots?.[spot] ?? (id === 'glasshouse' ? GLASSHOUSE_LAYOUT.spots[spot] : null);
  return offset ? onLand(center.x + offset.x, center.z + offset.z) : null;
}

export function radioScene(thread, beat, rule) {
  const questions = (beat.questions ?? []).filter(question => rule.ask(question.when) && !rule.has('asked', question.id))
    .map(({id, words, lines}) => ({id, words: rule.line(words), lines: lines.filter(line => rule.ask(line.when))
      .map(line => ({speaker: NAMES.find(row => row.name === rule.line(line.speaker))?.id ?? line.speaker, words: rule.line(line.words), radio: line.radio}))}));
  if (!questions.length) return null;
  const scene = {id: `${thread.id}/radio`, questions, choices: [{id: `${thread.id}/radio-done`, words: 'I will call again if I need you.'}]};
  validateTalkScene(scene);
  return scene;
}
