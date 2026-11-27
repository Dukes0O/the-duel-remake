// HOME-GROUND-1: the player's own ground beside Tin Town (docs/HOME_GROUND.md, sections 5, 6 and 15), behind the switch
// `home-ground`. With the switch off (`view.homeGround` is not true) this part returns nothing: it reads nothing of the
// record and asks for nothing to be drawn or saved.
//
// What it reads from the job's view: homeGround, openRoam, onFoot, fighter, carPosition, interact, people, playerName,
// jobEvents, homeKeys {build, turn, piece, view, burst, sprint, forward, back, left, right, turnLeft, turnRight} (the
// keys held this tick) and homeName ({name} typed in the box, or {cancel: true}).
// What it leaves in its state for the drawing, the HUD and the walker (they only read it):
//   above, cursor           the view from straight above, and the outline's place there
//   outline                 {piece, mode: 'build' | 'lift' | 'refused', reason, progress, marked, shake} or null
//   prompt                  the sentence the HUD shows, or ''
//   burst                   {charge 0..1, active, spent, shown}; the walker runs at the third speed while active
//   gateOpen, naming
//   on                      true once the part has run with its switch on; the drawing draws nothing before
// Its choices write the record with the effect {type: 'home', record}; nothing else of the world is changed.
import {TALK_RANGE, distanceToPerson} from './people.js';
import {FOOT_BURST, HAMMER_STRIKE_SECONDS, HOME_CELLS, HOME_CUES, HOME_CURSOR_SPEED, HOME_OFFER, HOME_OFFER_ID, HOME_PIECES,
  HOME_REACH, HOME_STEP, HOME_WORDS, defaultHomeName} from '../content/home-ground.js';
import {boardSpot, build, cleanHomeName, gateOf, gatesLeft, groundCentre, homeSolids, lift, markAt, newHome, outlineFor,
  outsideBy, panelsLeft, pieceInLand, readableHome, slotAt, slotInFront, toGrid, toggleMark} from '../home-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';

// He builds while he stands within this many metres of his ground; the gate opens for him within GATE_OPENS.
const BUILD_NEAR = 4, GATE_OPENS = 7, PROMPT_NEAR = 14, BOARD_REACH = 2.5;
// From above, a mark may be made where only the missing piece stops the building.
const MARK_ANYWAY = ['noPanels', 'noGate'];
const KEY_NAMES = ['build', 'turn', 'piece', 'view', 'burst', 'sprint', 'interact'];
const say = (key, text) => ({type: 'say', lineId: 'open/home-ground/' + key, text});
const words = (key, fill = {}) => HOME_WORDS[key].replace(/\{(\w+)\}/g, (_, name) => fill[name] ?? '');
const cue = name => ({type: 'homeCue', cue: name});

function begin() {
  return {held: {}, kind: 'panel', turns: 0, hammer: null, above: false, cursor: null, outline: null, prompt: '',
    burst: {charge: 1, active: false, spent: false, shown: false}, gateOpen: false, solidsKey: '', naming: false,
    offerOpen: false, given: false};
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
    const gate = gateOf(record);
    const gateMiddle = gate && pieceInLand(gate);
    next.gateOpen = !!gateMiddle && !!where && Math.hypot(where.x - gateMiddle.x, where.z - gateMiddle.z) < GATE_OPENS;
    const near = !!fighter && outsideBy(fighter.position.x, fighter.position.z) < BUILD_NEAR;

    // The name: typed in the box, or the box closed without one.
    if (state.naming && view.homeName) {
      const name = cleanHomeName(view.homeName.name);
      if (name && name !== record.name) { record = {...record, name}; choices.push(choice('name', record)); }
      next.naming = false;
    }
    const board = boardSpot(gate);
    if (fighter && board && !next.naming && pressed('interact') &&
        Math.hypot(fighter.position.x - board.x, fighter.position.z - board.z) <= BOARD_REACH) next.naming = true;

    if (!near || next.naming) {
      if (state.above) events.push(cue(HOME_CUES.viewDown));
      Object.assign(next, {above: false, hammer: null, outline: null});
      next.prompt = next.naming ? HOME_WORDS.nameAsk : fighter && board &&
        Math.hypot(fighter.position.x - board.x, fighter.position.z - board.z) <= BOARD_REACH ? HOME_WORDS.renameHint : '';
    } else {
      if (pressed('piece')) next.kind = state.kind === 'panel' ? 'gate' : 'panel';
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
      // A gate he no longer carries cannot be in his hands.
      if (next.kind === 'gate' && !gatesLeft(record)) next.kind = 'panel';
      const kind = next.kind;
      if (next.above) {
        // From above, W is north and D is east, as on the map. The outline is marked, not built.
        const step = HOME_CURSOR_SPEED / HOME_STEP * dt;
        const east = (keys.turnRight || keys.right ? 1 : 0) - (keys.turnLeft || keys.left ? 1 : 0);
        const south = (keys.back ? 1 : 0) - (keys.forward ? 1 : 0);
        const cursor = {a: Math.max(0, Math.min(HOME_CELLS, next.cursor.a + east * step)),
          b: Math.max(0, Math.min(HOME_CELLS, next.cursor.b + south * step))};
        next.cursor = cursor;
        const piece = slotAt(kind, cursor.a, cursor.b, next.turns ? 'z' : 'x');
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
        // On the ground: the outline stands in front of him, or on a mark of his that is right in front of him.
        let piece = slotInFront(kind, fighter.position, fighter.yaw, next.turns);
        const ahead = {x: fighter.position.x + Math.sin(fighter.yaw) * HOME_REACH, z: fighter.position.z + Math.cos(fighter.yaw) * HOME_REACH};
        const mark = record.marks.filter(row => row.kind === kind).map(row => ({row, at: pieceInLand(row)}))
          .map(({row, at}) => ({row, distance: Math.hypot(at.x - ahead.x, at.z - ahead.z)}))
          .filter(({distance}) => distance <= HOME_REACH).sort((a, b) => a.distance - b.distance)[0];
        if (mark) piece = mark.row;
        const outline = outlineFor(record, piece);
        const slotKey = JSON.stringify(piece);
        let hammer = state.hammer?.slotKey === slotKey && keys.build ? state.hammer : null;
        let shake = false;
        if (outline.mode === 'lift' && pressed('build')) {
          record = lift(record, outline.target);
          choices.push(choice('lift', record));
          events.push(cue(HOME_CUES.lift));
          if (outline.target.kind === 'gate') next.kind = 'gate';
          hammer = null;
        } else if (outline.mode === 'refused' && pressed('build')) {
          events.push(cue(HOME_CUES.refused));
          shake = true;
        } else if (outline.mode === 'build' && keys.build) {
          hammer ??= {slotKey, seconds: 0, strikes: 0};
          const seconds = hammer.seconds + dt;
          const strikes = Math.floor(seconds / HAMMER_STRIKE_SECONDS);
          if (strikes > hammer.strikes || hammer.seconds === 0) events.push(cue(HOME_CUES.hammer));
          hammer = {slotKey, seconds, strikes};
          if (seconds >= HOME_PIECES[kind].hammer) {
            record = build(record, piece);
            choices.push(choice('build', record));
            events.push(cue(HOME_PIECES[kind].upCue));
            hammer = null;
            if (kind === 'gate') {
              next.kind = 'panel';
              if (record.name === defaultHomeName(view.playerName)) next.naming = true;
            }
          }
        }
        next.hammer = hammer;
        const progress = hammer ? Math.min(1, hammer.seconds / HOME_PIECES[kind].hammer) : 0;
        next.outline = {...outline, progress, shake};
        const name = outline.mode === 'lift' ? HOME_PIECES[outline.target.kind].name : HOME_PIECES[kind].name;
        next.prompt = outline.mode === 'lift' ? words('lift', {piece: name}) :
          outline.mode === 'refused' ? HOME_WORDS[outline.reason] :
          hammer ? HOME_WORDS.hammering :
          words(outline.marked ? 'holdMark' : 'hold', {piece: name}) + ' ' +
          (kind === 'panel' ? words('panelsLeft', {count: panelsLeft(record)}) : HOME_WORDS.viewHint);
      }
    }

    // The fence and the gate are solid; the gate's leaves only while it is shut.
    const solidsKey = JSON.stringify([record.pieces, next.gateOpen]);
    if (solidsKey !== state.solidsKey) {
      next.solidsKey = solidsKey;
      requests.push({type: 'solids', id: 'home-ground', solids: homeSolids(record, {gateOpen: next.gateOpen, heightAt: scablandsSurfaceHeightAt})});
    }
    return {state: next, events, requests, choices};
  },
};
