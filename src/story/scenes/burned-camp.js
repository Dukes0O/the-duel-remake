import {validateTalkScene} from '../talk.js';
import {GLASSHOUSE_LAYOUT} from '../../world/open/looks/glasshouse-look.js';
import {LAND} from '../../world/scablands-names.js';
import {ROAD_NET} from '../../world/scablands-road.js';
import {nearestOnLine} from '../../world/scablands-ways.js';
import {NAMES} from '../../world/open/register.js';
import {resolveRoles} from '../../world/open/roles.js';
import {NIGHT_2_SITES} from '../../world/jobs/night-2-sites.js';
import {sitePosition, siteSpot} from '../../world/open/site-rule.js';

// OPEN-SITES supplies the live site's position. This fixed fallback is its first approved position and the sample's.
const ships = LAND.at('ships-in-sand');
const sampleGlasshouse = LAND.at('ships-in-sand', 2000, 700);
const onLand = (x, z) => LAND.at('ships-in-sand', x - ships.x, z - ships.z);
function roadward(center) {
  const nearest = ROAD_NET.roads.map(road => nearestOnLine(road.points, center.x, center.z))
    .reduce((best, point) => point.distance < best.distance ? point : best);
  const scale = nearest.distance ? Math.min(1, 120 / nearest.distance) : 0;
  return onLand(center.x + (nearest.x - center.x) * scale, center.z + (nearest.z - center.z) * scale);
}
const sampleRoadHome = roadward(sampleGlasshouse);

export function placeForThread(place, cast, view = {}) {
  if (!place) return null;
  if (place.checkpoint) return view.checkpointPlaces?.[place.checkpoint.who] ?? null;
  const [id, spot] = [resolveRoles(place, cast)].flat();
  if (id === 'tin-town' && spot) {
    const townSpots = {hearth: NIGHT_2_SITES.hearthFront.position, gate: NIGHT_2_SITES.gate,
      board: LAND.at('tin-town', -12, 18)};
    if (townSpots[spot]) return townSpots[spot];
  }
  const site = view.sitePositions?.[id];
  const center = site?.position ?? site ?? (id === 'glasshouse' ? sampleGlasshouse :
    view.landSeed !== undefined ? sitePosition(id, view.landSeed) : null);
  if (!center) {
    if (spot) return null;
    const fixed = [...LAND.table, ...LAND.named, LAND.yard].find(row => row.id === id);
    return fixed ? LAND.at(id) : null;
  }
  if (!spot) return center;
  if (spot === 'parked-car') return view.carPosition ?? null;
  if (spot === 'road-home') return center === sampleGlasshouse ? sampleRoadHome : roadward(center);
  const offset = site?.spots?.[spot] ?? (id === 'glasshouse' ? GLASSHOUSE_LAYOUT.spots[spot] : null);
  return offset ? onLand(center.x + offset.x, center.z + offset.z) :
    view.landSeed !== undefined ? siteSpot(id, view.landSeed, spot) : null;
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
