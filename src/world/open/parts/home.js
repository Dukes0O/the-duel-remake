// HOME-GROUND-1 and HOME-GROUND-2: the player's own ground beside Tin Town (docs/HOME_GROUND.md, sections 4 to 7 and 15),
// behind the switch `home-ground`. With the switch off (`view.homeGround` is not true) this part returns nothing: it reads
// nothing of the record and asks for nothing to be drawn or saved.
//
// What it reads from the job's view: homeGround, openRoam, onFoot, fighter, carPosition, interact, people, playerName,
// jobEvents, homeKeys {build, turn, piece, view, burst, sprint, fire, forward, back, left, right, turnLeft, turnRight}
// (the keys held this tick), homeName ({name} typed in the box, or {cancel: true}) and homeClock: the laptop's clock, in
// seconds since 1970, read once when the outing opened (src/app.js). Nothing reads a clock during play: the hens lay over
// the outing's own seconds (context.seconds), which count from that one reading.
// What it leaves in its state for the drawing, the HUD, the walker and the hands (they only read it):
//   above, cursor           the view from straight above, and the outline's place there
//   outline                 {piece, mode: 'build' | 'lift' | 'refused', reason, progress, marked, shake} or null; shown
//                           only once he has pressed B (building)
//   prompt                  the sentence the HUD shows, or ''
//   burst                   {charge 0..1, active, spent, shown}; the walker runs at the third speed while active
//   gateOpen, naming, namingHen, namingKey
//   onGround                he stands on or beside his ground: the launcher is lowered and the car-aim words hidden
//   armed                   he took the launcher back with the fire key, until he builds again
//   tool, strike            'hammer' or 'wrench' in his hands while he builds, and how far through a strike (0..1)
//   flock                   where each hen is and what she is doing
//   board                   {lines, until} while the board at the gate is shown
//   opened                  what the outing found when it opened: {away, long, laid, hadHens}
//   on                      true once the part has run with its switch on; the drawing draws nothing before
// Its choices write the record with the effect {type: 'home', record}; nothing else of the world is changed.
import {TALK_RANGE, distanceToPerson} from './people.js';
import {AWAY_LONGEST, BOARD_NEAR, BOARD_SECONDS, BUILD_IDLE_SECONDS, FOOT_BURST, HAMMER_STRIKE_SECONDS, HEN_LOOK, HOME_BOX,
  HOME_CELLS, HOME_CUES, HOME_CURSOR_SPEED, HOME_OFFER, HOME_OFFER_ID, HOME_PIECES, HOME_REACH, HOME_SIZE, HOME_STEP,
  HOME_WORDS, MOSS_HENS_ID, MOSS_TALK, defaultHomeName} from '../content/home-ground.js';
import {awayFor, boardLines, boardSpot, boxForEgg, boxInLand, boxRefusal, boxRoom, boxSlotInFront, boxesFull, build,
  buildBox, cleanHomeName, crateSpot, cratesLeft, facedThing, gateOf, gatesLeft, gatherBox, giveHens, groundCentre,
  groundPoint, hensWaiting, homeSolids, lift, liftBox, markAt, nameHen, newHome, newsBoardSpot, outlineFor, outsideBy,
  panelsLeft, pieceInLand, readableHome, ripen, slotAt, slotInFront, toGrid, toggleMark, upgradeHome} from '../home-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {makeRng} from '../../../rng.js';

// He builds while he stands within this many metres of his ground; the gate opens for him within GATE_OPENS.
const BUILD_NEAR = 4, GATE_OPENS = 7, PROMPT_NEAR = 14, BOARD_REACH = 2.5, CRATE_REACH = 3;
// From above, a mark may be made where only the missing piece stops the building.
const MARK_ANYWAY = ['noPanels', 'noGate'];
const KEY_NAMES = ['build', 'turn', 'piece', 'view', 'burst', 'sprint', 'fire', 'interact'];
const say = (key, text) => ({type: 'say', lineId: 'open/home-ground/' + key, text});
const words = (key, fill = {}) => HOME_WORDS[key].replace(/\{(\w+)\}/g, (_, name) => fill[name] ?? '');
const cue = name => ({type: 'homeCue', cue: name});
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// A hen walks to her box this long before her egg is due, and walks at this pace.
const HEN_HEADS_TO_BOX = 25, HEN_WALK = .55, HEN_KEEP_IN = 1.2;

function begin() {
  return {held: {}, kind: 'panel', turns: 0, hammer: null, above: false, cursor: null, outline: null, prompt: '',
    burst: {charge: 1, active: false, spent: false, shown: false}, gateOpen: false, solidsKey: '', naming: false,
    namingHen: null, namingKey: '', namingChain: false, offerOpen: false, given: false, opened: null, ripenedAt: 0,
    building: false, idle: 0, tool: null, strike: null, armed: false, onGround: false, flock: [], flockSeed: 1,
    board: null, boardShown: false, crateTalk: false};
}

// The third speed. It empties in FOOT_BURST.seconds of use; once spent it refills fully before it can be used again.
function stepBurst(burst, held, moving, dt, events) {
  let {charge, active, spent} = burst;
  const want = held && moving && !spent && charge > 0;
  if (want) {
    if (!active) events.push(cue(HOME_CUES.burst));
    charge = Math.max(0, charge - dt / FOOT_BURST.seconds);
    active = charge > 0;
    if (!active) { spent = true; events.push(cue(HOME_CUES.spent)); }
  } else {
    active = false;
    charge = Math.min(1, charge + dt / FOOT_BURST.refillSeconds);
    if (charge >= 1) spent = false;
  }
  return {charge, active, spent, shown: active || charge < 1};
}

function choice(id, record) {
  return {id: 'home-ground/' + id, effects: [{type: 'home', record}]};
}

// ---- The hens about his ground: where each is and what she does. Seeded, so the same inputs walk them the same way. --
function draw(seed) {
  const rng = makeRng(seed);
  return {value: rng.float(), seed: Math.floor(rng.float() * 4294967295) + 1};
}
function startFlock(hens, from) {
  return hens.map((_, index) => ({x: from.x + (index ? .6 : -.6), z: from.z, yaw: 0, mode: 'peck', left: 1.5 + index, tx: from.x, tz: from.z}));
}
const insideGround = value => Math.max(HEN_KEEP_IN, Math.min(HOME_SIZE - HEN_KEEP_IN, value));
function stepFlock(flock, seedIn, record, dt, events) {
  let seed = seedIn;
  const room = boxRoom(record) > 0;
  const box = room ? boxForEgg(record.boxes) : -1;
  const out = flock.map((hen, index) => {
    const due = record.hens[index]?.due ?? Infinity;
    let {x, z, yaw, mode, left, tx, tz} = hen;
    // Her egg is near and a box has room: she goes to it and sits.
    if (box >= 0 && due <= HEN_HEADS_TO_BOX) {
      const at = boxInLand(record.boxes[box]);
      tx = at.x; tz = at.z;
      mode = Math.hypot(tx - x, tz - z) <= .25 ? 'sit' : 'walk';
    } else if (mode === 'sit') { mode = 'peck'; left = 2; }
    else if (mode !== 'walk') {
      left -= dt;
      if (left <= 0) {
        let pick = draw(seed); seed = pick.seed;
        if (pick.value < .5) {
          const corner = groundPoint(0, 0);
          let a = draw(seed); seed = a.seed; let b = draw(seed); seed = b.seed;
          tx = corner.x + insideGround(x - corner.x + (a.value - .5) * 12);
          tz = corner.z + insideGround(z - corner.z + (b.value - .5) * 12);
          mode = 'walk';
        } else {
          const next = pick.value < .8 ? 'peck' : 'scratch';
          let span = draw(seed); seed = span.seed;
          if (next === 'peck' && span.value < .25) events.push(cue(HOME_CUES.cluck));
          mode = next; left = next === 'peck' ? 2 + span.value * 3 : 1.5 + span.value * 1.5;
        }
      }
    }
    if (mode === 'walk') {
      const dx = tx - x, dz = tz - z, far = Math.hypot(dx, dz);
      if (far > .01) yaw = Math.atan2(dx, dz);
      const stride = Math.min(far, HEN_WALK * dt);
      if (far > .01) { x += dx / far * stride; z += dz / far * stride; }
      if (far - stride <= .02 && !(box >= 0 && due <= HEN_HEADS_TO_BOX)) { mode = 'peck'; left = 1.5; }
    }
    return {x, z, yaw, mode, left, tx, tz};
  });
  return {flock: out, seed};
}

export const homePart = {
  id: 'home',
  begin,
  step(state, context, dt) {
    const {view, world} = context;
    if (view.homeGround !== true || !view.openRoam) return;
    const keys = view.homeKeys ?? {};
    const held = Object.fromEntries(KEY_NAMES.map(name => [name, !!(name === 'interact' ? view.interact : keys[name])]));
    const pressed = name => held[name] && !state.held[name];
    const events = [], requests = [], choices = [];
    const fighter = view.onFoot ? view.fighter : null;
    const where = fighter?.position ?? view.carPosition ?? null;
    const now = context.seconds ?? 0;
    let next = {...state, held, on: true};
    const home = readableHome(world.open.home) ? world.open.home : null;

    // On foot, anywhere in the open land: the sprint is the game's own; its cue is named here. The burst is this card's.
    const moving = !!fighter && !!(keys.forward || keys.back || keys.left || keys.right);
    if (fighter && keys.sprint && moving && !state.sprinting) events.push(cue(HOME_CUES.sprint));
    next.sprinting = !!fighter && !!keys.sprint && moving;
    next.burst = fighter && !state.above ? stepBurst(state.burst, keys.burst, !!keys.forward, dt, events)
      : stepBurst(state.burst, false, false, dt, events);

    // ---- Before he has the ground -------------------------------------------------------------------------------
    if (!home) {
      for (const event of view.jobEvents ?? []) {
        if (event.scene !== HOME_OFFER_ID) continue;
        if (event.type === 'talkChoice' && event.id === 'take' && !state.given) {
          next.given = true;
          const name = defaultHomeName(view.playerName);
          choices.push(choice('given', newHome(name)));
          requests.push(say('given', HOME_WORDS.given));
          const centre = groundCentre();
          requests.push({type: 'marker', place: {x: centre.x, z: centre.z, y: scablandsSurfaceHeightAt(centre.x, centre.z), radius: 6}});
          next.marked = true;
        }
        if (['openTalkClosed', 'openTalkSkipped'].includes(event.type)) next.offerOpen = false;
      }
      const auntie = (view.people ?? []).find(person => person.id === 'auntie-solder');
      if (fighter && !next.given && !state.offerOpen && pressed('interact') && auntie &&
          distanceToPerson(auntie, fighter.position) <= TALK_RANGE) {
        next.offerOpen = true;
        requests.push({type: 'talk', id: HOME_OFFER_ID, scene: HOME_OFFER, person: 'auntie-solder', speaker: 'auntie-solder',
          asked: [], threadPriority: true});
      }
      next.prompt = where && !next.given && outsideBy(where.x, where.z) < PROMPT_NEAR ? HOME_WORDS.askAuntie : '';
      next.outline = null;
      return {state: next, events, requests, choices};
    }

    // ---- His ground ---------------------------------------------------------------------------------------------
    let record = home;
    const clock = Number.isFinite(view.homeClock) ? view.homeClock : null;
    // Once an outing, the first time this part runs on his ground: the time since his last visit, from the clock read
    // when the outing opened, ripens the hens' laying, and the record is brought up to step 2's.
    if (!state.opened) {
      const kept = upgradeHome(record);
      const counted = awayFor(kept.lastSeen, clock);
      const ripe = ripen(kept, counted);
      const opened = {...ripe.home, lastSeen: clock ?? ripe.home.lastSeen};
      next.opened = {away: counted, long: Number.isFinite(kept.lastSeen) && clock !== null && clock - kept.lastSeen > AWAY_LONGEST,
        laid: ripe.laid.length, hadHens: kept.hens.length > 0};
      next.ripenedAt = now;
      if (JSON.stringify(opened) !== JSON.stringify(record)) { record = opened; choices.push(choice('opened', record)); }
    }
    // The hens lay over the outing's own seconds. The record is brought up to the moment before any change he makes to
    // the hens or boxes, and whenever an egg is due; `lastSeen` is then the clock's reading plus those seconds.
    const catchUp = () => {
      const ripe = ripen(record, now - next.ripenedAt);
      next.ripenedAt = now;
      record = {...ripe.home, lastSeen: clock === null ? ripe.home.lastSeen : clock + now};
      return ripe.laid;
    };
    const gap = now - next.ripenedAt;
    if (record.hens.some(hen => hen.due <= gap) && boxRoom(record) > 0) {
      const laid = catchUp();
      for (const egg of laid) {
        events.push(cue(HOME_CUES.lay));
        requests.push(say('laid', words('laid', {hen: record.hens[egg.hen].name})));
      }
      if (laid.length && boxesFull(record)) {
        events.push(cue(HOME_CUES.boxFull));
        requests.push(say('box-full', HOME_WORDS.boxFull));
      }
      choices.push(choice('laid', record));
    }

    const gate = gateOf(record);
    const gateMiddle = gate && pieceInLand(gate);
    next.gateOpen = !!gateMiddle && !!where && Math.hypot(where.x - gateMiddle.x, where.z - gateMiddle.z) < GATE_OPENS;
    const near = !!fighter && outsideBy(fighter.position.x, fighter.position.z) < BUILD_NEAR;
    // The marker that led him here goes once he stands on his ground.
    if (state.marked && where && outsideBy(where.x, where.z) === 0) {
      requests.push({type: 'marker', place: null});
      next.marked = false;
    }

    // ---- Moss and the hens ------------------------------------------------------------------------------------------
    for (const event of view.jobEvents ?? []) {
      if (event.scene !== MOSS_HENS_ID) continue;
      if (event.type === 'talkChoice' && event.id === 'take' && hensWaiting(record)) {
        catchUp();
        record = giveHens(record);
        choices.push(choice('hens', record));
        events.push(cue(HOME_CUES.crateOpen), cue(HOME_CUES.cluck));
        const inside = gateMiddle ? {x: gateMiddle.x + (groundCentre().x - gateMiddle.x) * .15, z: gateMiddle.z + (groundCentre().z - gateMiddle.z) * .15}
          : groundCentre();
        next.flock = startFlock(record.hens, inside);
        Object.assign(next, {naming: true, namingHen: 0, namingKey: 'hen-0', namingChain: true});
      }
      if (['openTalkClosed', 'openTalkSkipped'].includes(event.type)) next.crateTalk = false;
    }
    if (record.hens.length && next.flock.length !== record.hens.length) next.flock = startFlock(record.hens, groundCentre());
    if (next.flock.length) {
      const walked = stepFlock(next.flock, next.flockSeed, record, dt, events);
      next.flock = walked.flock; next.flockSeed = walked.seed;
    }

    // ---- Names: the ground's, typed in the box, or a hen's. ---------------------------------------------------------
    if (state.naming && view.homeName) {
      const typed = view.homeName.name;
      if (state.namingHen !== null && state.namingHen !== undefined) {
        const named = typeof typed === 'string' ? nameHen(record, state.namingHen, typed) : record;
        if (named !== record) { catchUp(); record = nameHen(record, state.namingHen, typed); choices.push(choice('hen-name', record)); }
        const more = state.namingChain && state.namingHen + 1 < record.hens.length;
        Object.assign(next, more ? {naming: true, namingHen: state.namingHen + 1, namingKey: 'hen-' + (state.namingHen + 1)}
          : {naming: false, namingHen: null, namingKey: '', namingChain: false});
      } else {
        const name = cleanHomeName(typed);
        if (name && name !== record.name) { record = {...record, name}; choices.push(choice('name', record)); }
        Object.assign(next, {naming: false, namingKey: ''});
      }
    }

    // ---- What stands near him: the two boards, the crate, a box, a hen. ---------------------------------------------
    const board = boardSpot(gate), news = newsBoardSpot(gate);
    const atBoard = !!fighter && !!board && distance(fighter.position, board) <= BOARD_REACH;
    const atNews = !!fighter && !!news && distance(fighter.position, news) <= BOARD_REACH;
    const crate = hensWaiting(record) ? crateSpot(gate) : null;
    const atCrate = !!fighter && !!crate && distance(fighter.position, crate) <= CRATE_REACH;
    const faced = fighter && near ? facedThing(record, fighter.position, fighter.yaw) : null;
    const facedBox = faced?.kind === 'box' ? faced : null;
    const hen = fighter && near ? (next.flock.map((row, index) => ({index, far: distance(row, fighter.position),
      angle: Math.abs(Math.atan2(Math.sin(Math.atan2(row.x - fighter.position.x, row.z - fighter.position.z) - fighter.yaw),
        Math.cos(Math.atan2(row.x - fighter.position.x, row.z - fighter.position.z) - fighter.yaw)))}))
      .filter(row => row.far <= HEN_LOOK && row.angle <= .5).sort((a, b) => a.far - b.far)[0] ?? null) : null;

    let note = '';
    if (fighter && !next.naming && pressed('interact')) {
      if (atNews) {
        next.board = {lines: boardLines(next.opened, record), until: now + BOARD_SECONDS};
        events.push(cue(HOME_CUES.boardRead));
      } else if (atBoard) Object.assign(next, {naming: true, namingHen: null, namingKey: 'ground'});
      else if (atCrate && !state.crateTalk) {
        next.crateTalk = true;
        requests.push({type: 'talk', id: MOSS_HENS_ID, scene: MOSS_TALK, person: 'moss', speaker: 'moss', asked: [],
          threadPriority: true, position: {x: crate.x, y: scablandsSurfaceHeightAt(crate.x, crate.z), z: crate.z}, anchorPosition: true});
      } else if (facedBox && facedBox.box.eggs > 0) {
        catchUp();
        const gathered = record.boxes[facedBox.index].eggs;
        record = gatherBox(record, facedBox.index);
        choices.push(choice('gather', record));
        events.push(cue(HOME_CUES.gather));
        note = gathered === 1 ? words('gatheredOne', {store: record.eggs}) : words('gathered', {count: gathered, store: record.eggs});
        requests.push(say('gathered', note));
      } else if (hen && near) Object.assign(next, {naming: true, namingHen: hen.index, namingKey: 'hen-' + hen.index, namingChain: false});
    }
    // The board at the gate shows itself the first time he comes near it in an outing.
    if (fighter && news && !state.boardShown && distance(fighter.position, news) <= BOARD_NEAR) {
      next.boardShown = true;
      next.board = {lines: boardLines(next.opened, record), until: now + BOARD_SECONDS};
      events.push(cue(HOME_CUES.boardRead));
    }
    if (next.board && (now > next.board.until || !fighter || !news || distance(fighter.position, news) > BOARD_NEAR + 4)) next.board = null;

    // ---- Building -----------------------------------------------------------------------------------------------
    // The launcher is lowered on his ground; the fire key takes it back, and B puts the hammer back in his hands.
    next.onGround = near;
    if (!near) next.armed = false;
    else if (pressed('fire')) Object.assign(next, {armed: true, building: false});
    // B shows the outline and starts the hammering; R and G, which change what he holds, show it too.
    if (near && (pressed('build') || pressed('turn') || pressed('piece')) && !next.naming) Object.assign(next, {building: true, armed: false, board: null});
    const touched = held.build || pressed('turn') || pressed('piece') || pressed('view');
    next.idle = touched ? 0 : (state.idle ?? 0) + dt;
    if (!near || next.idle >= BUILD_IDLE_SECONDS) next.building = false;

    if (!near || next.naming) {
      if (state.above) events.push(cue(HOME_CUES.viewDown));
      Object.assign(next, {above: false, hammer: null, outline: null, building: next.naming && near ? next.building : false});
      next.prompt = next.naming ? '' : atNews ? HOME_WORDS.boardHint : atBoard ? HOME_WORDS.renameHint :
        atCrate ? HOME_WORDS.crateWaiting : '';
    } else {
      if (pressed('piece')) next.kind = nextKind(state.kind, record);
      if (pressed('turn')) next.turns = (state.turns + 1) % 2;
      if (pressed('view')) {
        next.above = !state.above;
        events.push(cue(next.above ? HOME_CUES.viewUp : HOME_CUES.viewDown));
        next.hammer = null;
        if (next.above) {
          const ahead = {x: fighter.position.x + Math.sin(fighter.yaw) * HOME_REACH, z: fighter.position.z + Math.cos(fighter.yaw) * HOME_REACH};
          const {a, b} = toGrid(ahead.x, ahead.z);
          next.cursor = {a: Math.max(0, Math.min(HOME_CELLS, a)), b: Math.max(0, Math.min(HOME_CELLS, b))};
        }
      }
      // A piece he no longer carries cannot be in his hands.
      if (next.kind === 'gate' && !gatesLeft(record)) next.kind = 'panel';
      if (next.kind === 'box' && cratesLeft(record) <= 0) next.kind = 'panel';
      const kind = next.kind;
      if (next.above) {
        // From above, W is north and D is east, as on the map. The outline is marked, not built. Nest boxes are set
        // down on the ground, so from above the outline is a panel's.
        const markKind = kind === 'box' ? 'panel' : kind;
        const step = HOME_CURSOR_SPEED / HOME_STEP * dt;
        const east = (keys.turnRight || keys.right ? 1 : 0) - (keys.turnLeft || keys.left ? 1 : 0);
        const south = (keys.back ? 1 : 0) - (keys.forward ? 1 : 0);
        const cursor = {a: Math.max(0, Math.min(HOME_CELLS, next.cursor.a + east * step)),
          b: Math.max(0, Math.min(HOME_CELLS, next.cursor.b + south * step))};
        next.cursor = cursor;
        const piece = slotAt(markKind, cursor.a, cursor.b, next.turns ? 'z' : 'x');
        const outline = outlineFor(record, piece);
        const marked = !!markAt(record, piece);
        // A mark may go wherever the piece could be built once he has it in hand; it can always be cleared.
        const reason = outline.mode === 'lift' ? 'aboveBuilt' : MARK_ANYWAY.includes(outline.reason) ? null : outline.reason;
        let shake = false;
        if (pressed('build')) {
          if (reason && !marked) { events.push(cue(HOME_CUES.refused)); shake = true; }
          else {
            record = toggleMark(record, piece);
            choices.push(choice('mark', record));
            events.push(cue(marked ? HOME_CUES.unmark : HOME_CUES.mark));
          }
        }
        const nowMarked = !!markAt(record, piece);
        next.outline = {...outline, mode: reason && !nowMarked ? 'refused' : 'build', reason, marked: nowMarked, progress: 0, shake};
        next.prompt = nowMarked ? HOME_WORDS.aboveClear : reason ? HOME_WORDS[reason] : HOME_WORDS.aboveHelp;
      } else {
        // On the ground. A piece or nest box he faces within reach is offered to be picked up, whether or not he is
        // building. Otherwise, once he has pressed B, the outline stands in front of him, or on a mark of his there.
        let outline = null, piece = null;
        if (faced?.kind === 'piece') {
          piece = faced.piece;
          outline = {mode: 'lift', piece, target: faced.piece, marked: false};
        } else if (facedBox) {
          piece = {kind: 'box', i: facedBox.box.i, j: facedBox.box.j};
          outline = {mode: 'lift', piece, target: piece, boxIndex: facedBox.index, marked: false};
        } else if (next.building && kind === 'box') {
          piece = boxSlotInFront(fighter.position, fighter.yaw);
          const reason = boxRefusal(record, piece);
          outline = reason ? {mode: 'refused', reason, piece, marked: false} : {mode: 'build', piece, marked: false};
        } else if (next.building) {
          piece = slotInFront(kind, fighter.position, fighter.yaw, next.turns);
          const ahead = {x: fighter.position.x + Math.sin(fighter.yaw) * HOME_REACH, z: fighter.position.z + Math.cos(fighter.yaw) * HOME_REACH};
          const mark = record.marks.filter(row => row.kind === kind).map(row => ({row, at: pieceInLand(row)}))
            .map(({row, at}) => ({row, distance: Math.hypot(at.x - ahead.x, at.z - ahead.z)}))
            .filter(({distance: far}) => far <= HOME_REACH).sort((a, b) => a.distance - b.distance)[0];
          if (mark) piece = mark.row;
          outline = outlineFor(record, piece);
        }
        const slotKey = JSON.stringify(piece);
        let hammer = state.hammer?.slotKey === slotKey && keys.build ? state.hammer : null;
        let shake = false;
        if (outline?.mode === 'lift' && pressed('build')) {
          if (outline.target.kind === 'box') {
            catchUp();
            const gathered = record.boxes[outline.boxIndex].eggs;
            record = liftBox(record, outline.boxIndex);
            next.kind = 'box';
            if (gathered) {
              events.push(cue(HOME_CUES.gather));
              requests.push(say('gathered', gathered === 1 ? words('gatheredOne', {store: record.eggs}) : words('gathered', {count: gathered, store: record.eggs})));
            }
          } else {
            record = lift(record, outline.target);
            if (outline.target.kind === 'gate') next.kind = 'gate';
          }
          choices.push(choice('lift', record));
          events.push(cue(HOME_CUES.lift));
          hammer = null;
          next.building = true;
        } else if (outline?.mode === 'refused' && pressed('build')) {
          events.push(cue(HOME_CUES.refused));
          shake = true;
        } else if (outline?.mode === 'build' && keys.build) {
          const seconds = (hammer?.seconds ?? 0) + dt;
          const strikes = Math.floor(seconds / HAMMER_STRIKE_SECONDS);
          if (!hammer || strikes > hammer.strikes) events.push(cue(HOME_CUES.hammer));
          hammer = {slotKey, seconds, strikes};
          const needs = kind === 'box' ? HOME_BOX.hammer : HOME_PIECES[kind].hammer;
          if (seconds >= needs) {
            if (kind === 'box') {
              catchUp();
              record = buildBox(record, piece);
              events.push(cue(HOME_CUES.boxUp));
              if (cratesLeft(record) <= 0) next.kind = 'panel';
            } else {
              record = build(record, piece);
              events.push(cue(HOME_PIECES[kind].upCue));
            }
            choices.push(choice('build', record));
            hammer = null;
            if (kind === 'gate') {
              next.kind = 'panel';
              if (record.name === defaultHomeName(view.playerName)) Object.assign(next, {naming: true, namingHen: null, namingKey: 'ground'});
            }
          }
        }
        next.hammer = hammer;
        const needs = kind === 'box' ? HOME_BOX.hammer : HOME_PIECES[kind].hammer;
        const progress = hammer ? Math.min(1, hammer.seconds / needs) : 0;
        // The lift outline is drawn only while he builds; the sentence offers it at any time.
        next.outline = outline && (next.building || outline.mode !== 'lift') ? {...outline, progress, shake} : null;
        const nameOf = target => target.kind === 'box' ? HOME_BOX.name : HOME_PIECES[target.kind].name;
        const carried = kind === 'panel' ? ' ' + words('panelsLeft', {count: panelsLeft(record)}) :
          kind === 'box' ? ' ' + words('cratesLeft', {count: cratesLeft(record)}) : ' ' + HOME_WORDS.viewHint;
        next.prompt = note ? note :
          atNews ? HOME_WORDS.boardHint : atBoard ? HOME_WORDS.renameHint : atCrate ? HOME_WORDS.crateWaiting :
          facedBox ? (facedBox.box.eggs > 1 ? words('gather', {count: record.boxes[facedBox.index]?.eggs ?? 0}) :
            facedBox.box.eggs === 1 ? HOME_WORDS.gatherOne : HOME_WORDS.emptyBox) :
          outline?.mode === 'lift' ? words('lift', {piece: nameOf(outline.target)}) :
          outline?.mode === 'refused' ? HOME_WORDS[outline.reason] :
          hammer ? HOME_WORDS.hammering :
          outline ? (kind === 'box' ? HOME_WORDS.holdBox : words(outline.marked ? 'holdMark' : 'hold', {piece: nameOf(piece)})) + carried :
          hen ? words('henSeen', {hen: record.hens[hen.index].name}) :
          record.hens.length && !record.boxes.length ? HOME_WORDS.firstBox : HOME_WORDS.startBuild;
      }
    }
    // He holds a hammer while he builds, a wrench for the gate's hinges; the strike is how far through a blow he is.
    const building = near && next.building && !next.above && !next.naming;
    next.tool = building ? (next.kind === 'gate' ? 'wrench' : 'hammer') : null;
    // Where he stands and faces, for his mark in the view from above.
    next.standing = fighter ? {x: fighter.position.x, z: fighter.position.z, yaw: fighter.yaw} : null;
    next.strike = building && next.hammer ? (next.hammer.seconds % HAMMER_STRIKE_SECONDS) / HAMMER_STRIKE_SECONDS : null;

    // The fence, the gate and the nest boxes are solid; the gate's leaves only while it is shut.
    const solidsKey = JSON.stringify([record.pieces, record.boxes.map(box => [box.i, box.j]), next.gateOpen]);
    if (solidsKey !== state.solidsKey) {
      next.solidsKey = solidsKey;
      requests.push({type: 'solids', id: 'home-ground', solids: homeSolids(record, {gateOpen: next.gateOpen, heightAt: scablandsSurfaceHeightAt})});
    }
    return {state: next, events, requests, choices};
  },
};

// G changes what is in his hands: a panel, the gate while he carries it, an old crate while he has one.
function nextKind(kind, record) {
  const order = ['panel', 'gate', 'box'];
  const has = row => row === 'panel' || (row === 'gate' && gatesLeft(record) > 0) || (row === 'box' && cratesLeft(record) > 0);
  for (let n = 1; n <= order.length; n++) {
    const row = order[(order.indexOf(kind) + n) % order.length];
    if (has(row)) return row;
  }
  return 'panel';
}
