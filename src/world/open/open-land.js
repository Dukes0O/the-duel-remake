// The open land's host (docs/story/open-scablands.md, sections 10 and 15): the one place where the open land's parts
// meet a world job. src/arena/modes/world-job.js calls `beginOpenLand` when a job whose definition has `open` starts,
// and `stepOpenLand` on each tick of that job in which the world moves. It is not stepped while a talk is on the
// screen, or while a job's ending is being shown: the land stands still then, as the rest of the world does. A card
// adds to the open land by filling in its part under src/world/open/parts/, and edits neither this file nor
// world-job.js. A part's file must not import world-job.js or anything that does: world-job.js loads the parts.
//
// THE OPEN STATE, kept on `worldJob.open`:
//   {world, holds, parts, seconds, events, eventCount}
//   world   {seed, ledger, open, scrap, town} (src/world/open/open-record.js); replaced, never changed in place
//   holds   the list of holds (src/world/open/holds.js); the job's own hold is taken at the start
//   parts   each part's own state, by the part's id
//   events  the last 32 events the parts raised, each with a rising `seq`, for a view or a caption to notice
//
// A PART is plain data and plain functions:
//   {id,
//    begin(world, view)          -> the part's first state (optional; {} without it)
//    step(state, context, dt)    -> {state, choices, events, requests, leave} (all optional)}
//   context   {world, holds, view, seconds, seed, changes}
//     view      the job step's view (player, onFoot, fighter, carPosition, interact, actors, ...) with two things
//               added: `clockSec`, and `jobEvents`, the events the job's own step raised since the open land was last
//               stepped. A talk's result is there as {type: 'talkChoice', id, effects, questionEffects}, and a
//               fight's as {type: 'riderFight', ...}.
//     changes   what this part's own choices changed on the tick before (see open-effects.js). A price that could
//               not be paid in full is there as a scrap change with `owed`.
//   choices   [{id, effects}], applied in order through `applyEffects`; a part changes the world in no other way.
//             A choice is applied once a night: one that may happen again carries a count in its id.
//   events    [{type, ...}], kept in `events` above
//   requests  carried out by world-job.js as a job step's are. A line on the screen is
//             {type: 'say', lineId: 'open/site-found/glasshouse', text: 'The Glasshouse is on your map.'}; the
//             `text` is the caption. {type: 'marker', place} sets the marker. A request raised on the tick the job
//             ends is not carried out.
//             Four more, each carried out by one card's handler in world-job.js (decided 25 November 2026):
//               {type: 'talk', id, scene, speaker, asked}   open a talk inside roam: `scene` is a talk scene object
//                                                       (src/story/talk.js), `asked` the questions already asked; the
//                                                       choice returns in jobEvents as talkChoice, the questions as
//                                                       openTalkQuestion, the close as openTalkClosed (OPEN-ROAM)
//               {type: 'repair', armour, scrap}, {type: 'wash'}   mend or wash the car; view.car holds
//                                                       {armour, maxArmour, dirt} (OPEN-DOORS)
//               {type: 'solids', id, solids}            stand a site's or a building's solids; [] takes them away (OPEN-SITES)
//               {type: 'riders', ...}                   start a rider fight inside roam (OPEN-CHECKPOINTS)
//   hold      {holder, systems} takes a hold in the open land's list; `release: holder` lets it go. A storyline's
//             beat that holds the checkpoints inside a roam job does it this way. A holder beginning 'job:' is the
//             job's own and is refused.
//   leave     {to: ...} ends a job of the one step `roam`, with the event {type: 'roamLeft', to}
// Parts run in the order of src/world/open/parts.js, and a later part sees what an earlier part's choices changed.
// A part must keep its state small: the job engine copies step state freely, and this state is copied each tick.
import {applyEffects} from './open-effects.js';
import {NO_HOLDS, dropHold, holdsOfJob, takeHold} from './holds.js';
import {OPEN_PARTS} from './parts.js';

const KEPT_EVENTS = 32;
const holderOf = definition => 'job:' + (definition?.id ?? 'unnamed');

// `definition.open` is {world}. The job takes its hold: nothing for a job of the one step `roam`, the checkpoints and
// the signs for every other job, or what the definition's `holds` says.
export function beginOpenLand(definition) {
  const world = definition?.open?.world;
  if (!world?.ledger || !world?.open) throw new TypeError('A job in the open land needs definition.open.world.');
  return {world: structuredClone(world), holds: takeHold(NO_HOLDS, holderOf(definition), holdsOfJob(definition)),
    parts: {}, seconds: 0, events: [], eventCount: 0, changes: {}};
}

export function stepOpenLand(open, view, dt, partList = OPEN_PARTS) {
  let {world, holds} = open, leave = null;
  const parts = {...open.parts}, raised = [], requests = [], changes = [], byPart = {};
  const seconds = open.seconds + dt;
  for (const part of partList) {
    const state = parts[part.id] ?? part.begin?.(world, view) ?? {};
    parts[part.id] = state;
    if (!part.step) continue;
    const out = part.step(state, {world, holds, view, seconds, seed: world.seed, changes: open.changes[part.id] ?? []}, dt) ?? {};
    if (out.state !== undefined) parts[part.id] = out.state;
    for (const choice of out.choices ?? []) {
      const applied = applyEffects(world, choice);
      world = applied.world;
      changes.push(...applied.changes);
      if (applied.changes.length) byPart[part.id] = [...(byPart[part.id] ?? []), ...applied.changes];
    }
    for (const holder of [out.hold?.holder, out.release]) if (typeof holder === 'string' && holder.startsWith('job:'))
      throw new TypeError('The part "' + part.id + '" may not take or drop the job\'s own hold.');
    if (out.hold) holds = takeHold(holds, out.hold.holder, out.hold.systems);
    if (out.release) holds = dropHold(holds, out.release);
    for (const event of out.events ?? []) raised.push({...event, part: part.id});
    requests.push(...(out.requests ?? []));
    leave ??= out.leave ?? null;
  }
  let {eventCount} = open;
  const events = raised.length
    ? [...open.events, ...raised.map(event => ({...event, seq: ++eventCount}))].slice(-KEPT_EVENTS) : open.events;
  return {open: {...open, world, holds, parts, seconds, events, eventCount, changes: byPart}, events: raised, requests, changes, leave};
}

// A mission that begins inside the open land takes a hold, and lets go when it ends, fails or is left.
export const holdOpenLand = (open, holder, systems) => ({...open, holds: takeHold(open.holds, holder, systems)});
export const releaseOpenLand = (open, holder) => ({...open, holds: dropHold(open.holds, holder)});
