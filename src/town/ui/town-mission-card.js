// TOWN-HAUL-JOB: the mission card. When a town job is open (src/world/jobs/town-jobs.js), the town screen shows one card with who
// is asking, what the job is, what to know before setting out, and two buttons: GO YOURSELF, or NOT NOW, which loses nothing.
// The model reads the town and never writes it; the markup is plain HTML for town-entry to put on the screen.
import {openTownJobs} from '../../world/jobs/town-jobs.js';
import {TOWN_CAPTIONS, townCaptionText} from '../content/lines.js';

const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

// Every line on the card is a whole sentence with one job.
export const TOWN_MISSION_CARD_TEXT = Object.freeze({
  'town-haul-salvage':Object.freeze({title:'What We Can Find', lineId:'town.3.nothing'}),
  'town-salvage-run':Object.freeze({title:'The Salvage Run', lineId:'town.haul.card.run'}),
  'town-steel-run':Object.freeze({title:'The Steel Run', lineId:'town.steel.card'}),
});
export const TOWN_MISSION_CARD_FACTS = Object.freeze({
  salvage:Object.freeze([
    'Drive the flatbed to the Boneyard. The gang is waiting there with salvage.',
  ]),
  steel:Object.freeze([
    "Drive the flatbed to Tin Town. The steel is stacked beside the road into town.",
  ]),
  all:Object.freeze([
    'At the pile, hold still and the gang keeps loading. Drive off when you have enough.',
    'The flatbed carries up to 9,000 kg. Every piece makes it slower to pull away and longer to stop.',
    'A tall stack falls off more easily. A hard knock throws pieces off, and so does rough ground taken fast.',
    'Anything that falls off is lost, and the town only gets what you bring home.',
  ]),
  later:'If you leave it for now, nothing is lost and the job stays open.',
});

/** The card for the first open job, or null when no town job is open. */
export function townMissionCardModel(town, {readOnly = false} = {}) {
  const job = openTownJobs(town)[0];
  if (!job) return null;
  const text = TOWN_MISSION_CARD_TEXT[job.id], line = TOWN_CAPTIONS[text.lineId];
  const yard = (town?.buildings ?? []).some(building => building?.buildingId === 'salvage-yard' && building.state === 'finished');
  const bring = yard ? 'Bring it home to the Salvage Yard and stop there to unload.'
    : 'Bring it home to the salvage pile by the truck bay and stop there to unload.';
  return Object.freeze({jobId:job.id, title:text.title, who:line.who, line:townCaptionText(text.lineId, town),
    facts:Object.freeze([...TOWN_MISSION_CARD_FACTS[job.kind], bring, ...TOWN_MISSION_CARD_FACTS.all]),
    later:TOWN_MISSION_CARD_FACTS.later, readOnly});
}

export function townMissionCardMarkup(model) {
  if (!model) return '';
  const buttons = model.readOnly ? '<p>This job belongs to the town you are visiting.</p><button type="button" data-town-mission-later>CLOSE</button>'
    : `<button type="button" data-town-mission-go="${safe(model.jobId)}">GO YOURSELF</button>` +
      `<button type="button" data-town-mission-later>NOT NOW</button>`;
  return `<section class="town-mission-card town-onboard" role="dialog" aria-label="${safe(model.title)}">` +
    `<h2>${safe(model.title.toUpperCase())}</h2><p><b>${safe(model.who)}:</b> ${safe(model.line)}</p>` +
    `<ul>${model.facts.map(fact => `<li>${safe(fact)}</li>`).join('')}</ul><p>${safe(model.later)}</p>${buttons}</section>`;
}
