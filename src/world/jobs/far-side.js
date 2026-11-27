// FAR-JOBS-1. Pure definitions for the first three jobs. No profile or town is changed here.
import {LAND} from '../scablands-names.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {FAR_CAPTIONS} from '../../story/far-lines.js';
import {OUTPOSTS_WORLD} from '../../town/content/outposts-world.js';
import {townOutpostWorld} from '../../town/town-outpost-world.js';
import {createTownWorld} from '../../town/town-world.js';
import {TOWN_CELL_METRES} from '../../town/town-world-data.js';

const freeze = Object.freeze;
const step = (kind, fields) => freeze({kind, waitForCaptions:true, ...fields});
export const FAR_WORK = freeze([freeze({id:'build-borer', kind:'machine-parts', at:'scrapyard',
  parts:freeze(['propeller-shaft', 'cutter-gears', 'landing-rams']), startLineId:'far.b.odessa',
  partLineIds:freeze({'propeller-shaft':'far.b.imre', 'cutter-gears':'far.b.auntie', 'landing-rams':'far.b.rams'}),
  nameLineId:'far.b.name', namedLineId:'far.b.named', defaultName:'Mabel'})]);

export function buildFarJobs(land = LAND, heightAt = scablandsSurfaceHeightAt) {
  const place = (id, point = land.at(id), radius = 14) => freeze({id, radius,
    position:freeze({...point, y:heightAt(point.x, point.z)})});
  const finds = ['goat-mud', 'goat-thorn', 'teeth-lookout'].map((id, index) => freeze({
    ...place(id), hint:`far.1.hint${index + 1}`, lineId:['far.1.found1', 'far.1.found2', 'far.1.won'][index],
  }));
  const deck = OUTPOSTS_WORLD.find(row => row.id === 'deck-town');
  const deckTown = place('deck-town', land.at(...deck.at), 20);
  const northGate = place('town-north-gate', land.at('yard', 0, -205));
  return freeze([
    freeze({id:'far-whose-goat', storyId:'far', number:1, name:'Whose Goat Is This?', kind:'exploring',
      opensWhen:freeze({chapterDone:15}), vehicle:freeze({oneOf:freeze(['titan_monster', 'dusthawk_rally']),
        lendIfNone:'titan_monster', lendLineId:'far.1.lent'}),
      lineId:'far.1.report', resultLineId:'far.1.won', easy:freeze({findCount:3, markerRadius:14}),
      steps:freeze([step('explore', {what:"Follow the goat's wet tracks up the south Ridge.", inOrder:true,
        sayFinds:true, startLineId:'far.1.start', finds:freeze(finds),
        closing:freeze(['far.1.bell', 'far.1.brian', 'far.1.brian2'])})]), nextVisit:freeze(['far.1.bo'])}),
    freeze({id:'far-too-high', storyId:'far', number:2, name:'Too High', kind:'flying',
      opensWhen:freeze({jobDone:'far-whose-goat'}),
      noPilot:freeze({dispatch:'dune', days:5, startLineId:'far.2.dune',
        logLineIds:freeze(['far.2.dune.log1', 'far.2.dune.log2', 'far.2.dune.log3'])}),
      lineId:'far.2.start', resultLineId:'far.2.odessa', easy:freeze({}),
      steps:freeze([step('heliceiling', {what:'Take Kestrel One as high as she will go.', from:finds[2],
        startLineId:'far.2.start', halfwayLineId:'far.2.halfway', topLineId:'far.2.top', wonLineId:'far.2.won',
        closing:freeze(['far.2.odessa'])})])}),
    freeze({id:'far-long-shaft', storyId:'far', number:3, name:'The Long Shaft', kind:'haul',
      opensWhen:freeze({jobDone:'far-too-high', buildingBuilt:'scrapyard', standingAtLeast:freeze({'deck-town':10})}),
      vehicle:'flatbed', lineId:'far.3.start', resultLineId:'far.3.won', easy:freeze({shedLimit:10}),
      steps:freeze([step('haul', {what:'Carry the shaft from Deck Town to the Scrapyard. Take the corners wide.',
        load:'propeller-shaft', loadTonnes:12, loadLengthMetres:18, origin:deckTown, loadSeconds:6,
        toBuilding:'scrapyard', radius:14, shedLimit:10, shedLineId:'far.3.shed',
        startLineId:'far.3.start', sayNear:freeze([{place:northGate, lineId:'far.3.gate'}]),
        cornerLineId:'far.3.corner', closing:freeze(['far.3.won']),
      })])}),
  ]);
}
export const FAR_JOBS = buildFarJobs();

// These are inputs from the story, not a second progress store. Off is always empty.
export function openFarJobs({enabled = false, chapterDone = 0, jobsDone = [], buildingBuilt = [], standing = {}} = {}) {
  if (!enabled) return [];
  return FAR_JOBS.filter(job => !jobsDone.includes(job.id) &&
    (job.opensWhen.chapterDone == null || chapterDone >= job.opensWhen.chapterDone) &&
    (!job.opensWhen.jobDone || jobsDone.includes(job.opensWhen.jobDone)) &&
    (!job.opensWhen.buildingBuilt || buildingBuilt.includes(job.opensWhen.buildingBuilt)) &&
    Object.entries(job.opensWhen.standingAtLeast ?? {}).every(([id, value]) => (standing[id] ?? 0) >= value));
}

// Use the outpost's existing animal placement and existing goat model. No separate animal simulation.
export function farOutposts(town, {land = LAND, heightAt = scablandsSurfaceHeightAt} = {}) {
  const rows = OUTPOSTS_WORLD.map(row => row.id !== 'hermit-camp' ? row : {...row,
    animals:[...row.animals, {kind:'goat', who:'Fourteen', pace:.45, wander:[[8, -4], [10, 0], [8, 4]], cue:'far.bell'}],
  });
  const placed = townOutpostWorld(town, {land, heightAt, rows});
  return {...placed, outposts:placed.outposts.map(row => row.id !== 'hermit-camp' ? row : {...row,
    animals:row.animals.map(animal => animal.who !== 'Fourteen' ? animal : {...animal, id:'fourteen', cue:'far.bell'}),
  })};
}

// A generic world-job definition; the caller passes the actual Scrapyard and the pilot decision at run start.
export function farJobDefinition(id, {enabled = false, pilot = false, town = null, land = LAND,
  heightAt = scablandsSurfaceHeightAt, scrapyard = null} = {}) {
  if (!enabled) return null;
  const job = buildFarJobs(land, heightAt).find(row => row.id === id);
  if (!job) return null;
  let steps = job.steps;
  if (job.noPilot && !pilot) steps = [step('dispatch', {what:FAR_CAPTIONS['far.2.dune'].text, days:job.noPilot.days,
    startLineId:job.noPilot.startLineId, logs:[2, 4, 5].map((day, index) => ({day, lineId:job.noPilot.logLineIds[index]})),
    closing:['far.2.odessa']})];
  if (id === 'far-long-shaft') {
    const building = town?.buildings?.find(row => row.buildingId === 'scrapyard' && row.state === 'finished');
    const point = scrapyard ?? (building ? {x:(building.x + (building.width ?? 1) / 2) * TOWN_CELL_METRES,
      z:(building.z + (building.depth ?? 1) + 1) * TOWN_CELL_METRES} : null);
    if (!point) return null;
    steps = [{...steps[0], destination:{id:'scrapyard', position:point, radius:14}}];
  }
  const outposts = farOutposts(town, {land, heightAt});
  return {...job, steps, flag:'far-jobs', outposts,
    ...(town ? {layout:{...createTownWorld(town), outposts}} : {}),
    captions:Object.fromEntries(Object.entries(FAR_CAPTIONS).map(([key, row]) => [key, `${row.who}: ${row.text}`]))};
}

// The existing Scrapyard route accepts this only after a successful delivery. No inventory is changed by viewing it.
export function farJobParts(job) {
  return job?.id === 'far-long-shaft' && job.done
    ? [{partId:'propeller-shaft', source:'job', reference:'far-long-shaft', workId:'build-borer'}] : [];
}
