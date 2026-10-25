// The Kelp Coast story in a dive (DEEP-SIRENA-VIEW; docs/THE_DEEP.md 6.2 to 6.7):
// steps DEEP-SIRENA's sonar and lift bags and DEEP-LOG's sea-life log each
// underwater frame, and says which of Ana's story lines are due. Pure game rules
// with no graphics, called by the Duel after its dive step. It reads the car's
// picture and the save snapshot handed to startCampaign, never changes race
// state, and uses no randomness. Events go out through duel.emit; the App pays
// and saves them (raiseFind, recordLogged, recordPearl) and the view draws them.
import {deepWorldPose} from './deep-journey.js';
import {createSirena, pingSonar, stepLift, SIRENA_FINDS} from './deep-sirena.js';
import {createLog, stepLog} from './deep-log.js';
import {normalizeDeep} from './deep-discovery.js';

export const ANA_NEAR = 10;   // metres: close enough for Ana's "bag" and "car" lines
const BADGE = 'sirena-badge', CAR = 'sirena-car';
const PARTS = SIRENA_FINDS.filter(id => id !== BADGE && id !== CAR);

const phone = line => ({deepPhone: {line}});
const enabled = duel => duel.featureFlags.enabled('the-deep') === true;

function begin(duel) {
  const zone = duel.deepRuntime.zone, save = normalizeDeep(duel._deepSave), on = {enabled: enabled(duel)};
  const sirena = createSirena(zone, save, on);
  let distance = 0;
  const segments = zone.trail.map((point, i) => {
    const start = distance, next = zone.trail[(i + 1) % zone.trail.length];
    distance += Math.hypot(next.x - point.x, next.z - point.z);
    return start;
  });
  return {journeyId: duel.state.deepJourney.id, zoneId: zone.id, sirena, log: createLog(zone, save, on), seconds: 0,
    segments, places: new Set(save.places || []), placeId: null,
    partsAtStart: sirena.raised.filter(id => PARTS.includes(id)).length,
    pinged: false, saidBag: false, saidCar: false, saidNorseman: false};
}
const parts = story => story.sirena.raised.filter(id => PARTS.includes(id)).length;
const available = (story, id) => {
  const raised = story.sirena.raised;
  if (raised.includes(id) || !story.sirena.sonar) return false;
  return id !== CAR || PARTS.every(part => raised.includes(part)) && raised.includes(BADGE);
};

// Ana's lines that follow from a raise.
function raisedLines(story, find) {
  if (find === BADGE) return [phone('deep.ana.badge')];
  if (find === CAR) return [phone('deep.ana.raised'), phone('deep.ana.lab')];
  const lines = [phone('deep.ana.part')];
  if (parts(story) === PARTS.length && story.sirena.raised.includes(BADGE)) lines.push(phone('deep.ana.deep'));
  return lines;
}

// Called by the Duel after stepDeepJourney each frame. Emits the frame's events.
export function stepDeepStory(duel, dt) {
  const journey = duel.state.deepJourney;
  if (!journey || !duel.deepRuntime || !enabled(duel)) { duel.deepStory = null; return; }
  if (journey.phase === 'ascending' && duel.deepStory) {
    const story = duel.deepStory;
    if (!story.saidNorseman && story.partsAtStart === 0 && parts(story) > 0) {
      story.saidNorseman = true;
      duel.emit(phone('deep.ana.norseman'));
    }
    return;
  }
  if (journey.phase !== 'underwater' || duel.state.paused) return;
  // A new story for each dive, from the save snapshot handed to startCampaign.
  if (duel.deepStory?.journeyId !== journey.id) {
    duel.deepStory = begin(duel);
    if (!duel._deepFound.includes(duel.deepStory.zoneId))
      for (const line of ['deep.ana.hello', 'deep.ana.legend']) duel.emit(phone(line));
  }
  const story = duel.deepStory, car = deepWorldPose(duel);
  if (!car || !Number.isFinite(dt) || dt < 0) return;
  story.seconds += dt;
  const zone = duel.deepRuntime.zone, along = duel.course.phase(duel.state.s);
  const index = story.segments.findLastIndex(start => start <= along);
  const place = zone.places.find(row => row.fromIndex <= row.toIndex
    ? index >= row.fromIndex && index <= row.toIndex
    : index >= row.fromIndex || index <= row.toIndex);
  if ((place?.id ?? null) !== story.placeId) {
    story.placeId = place?.id ?? null;
    const title = !!place && !story.places.has(place.id);
    if (title) story.places.add(place.id);
    duel.emit({deepPlace: {place: place ?? null, title}});
  }
  const events = [...stepLift(story.sirena, car, {lift: duel._deepLift === true}, dt),
    ...stepLog(story.log, car, dt)];
  for (const event of events) {
    duel.emit(event);
    if (event.deepRaised) for (const line of raisedLines(story, event.deepRaised.find)) duel.emit(line);
  }
  // "Stop right beside it and press F" once, the first time near a part, and
  // "That's her" the first time near the Sirena once she can be bagged.
  for (const find of story.sirena.finds) {
    if (Math.hypot(find.x - car.x, find.z - car.z) > ANA_NEAR || !available(story, find.id)) continue;
    if (find.id === CAR && !story.saidCar) { story.saidCar = true; duel.emit(phone('deep.ana.car')); }
    else if (PARTS.includes(find.id) && !story.saidBag && parts(story) === 0) { story.saidBag = true; duel.emit(phone('deep.ana.bag')); }
  }
}

// R under water: one ping. Ana gives the 1,500 m figure on the dive's first ping
// while no part is raised yet.
export function pingDeepStory(duel) {
  const story = duel.deepStory;
  if (!story || duel.state.deepJourney?.phase !== 'underwater' || duel.state.paused) return false;
  const events = pingSonar(story.sirena, deepWorldPose(duel), story.seconds);
  if (!events.length) return false;
  for (const event of events) duel.emit(event);
  if (!story.pinged && parts(story) === 0) duel.emit(phone('deep.ana.sonar'));
  story.pinged = true;
  return true;
}

// What the view draws: the finds still down, the lift under way and the last ping.
export function deepStoryView(duel) {
  const story = duel?.deepStory;
  if (!story) return null;
  return {finds: story.sirena.finds.filter(find => !story.sirena.raised.includes(find.id)),
    raised: [...story.sirena.raised], lift: story.sirena.lift ? {...story.sirena.lift} : null,
    sonar: story.sirena.sonar, seconds: story.seconds};
}
