import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EngineAudio } from '../src/audio.js';
import { SOUND_BANK } from '../src/sound-bank.js';
import { createHiddenRoadUi } from '../src/hidden-road-ui.js';
const SHA = '5772399d1112b33edc845e5253417afd4d55ca1898fcb54f8901899a4eb96106';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const state = (phase = 'opening', id = 1) => ({
  status: 'exploring',
  paused: false,
  hiddenRoadJourney: {
    id,
    departed: true,
    phase,
    phaseElapsedSec: 0,
    elapsedSec: 3,
    controlsLocked: true,
    choiceReady: phase === 'choice',
    gateOpen: phase === 'opening' ? 0 : 1,
  },
});
function fixture(enabled = true) {
  const calls = [],
    voices = [];
  const audio = new EngineAudio({
    flags: { enabled: () => enabled },
    hiddenRoadVoiceFactory: () => null,
  });
  audio.context = { state: 'running', currentTime: 0 };
  audio.muted = false;
  audio.cueBuffers = { 'gatekeeper.welcome': { duration: 4.102 } };
  audio._playCue = (id, options) => {
    const voice = {
      stops: 0,
      stop() {
        this.stops++;
      },
    };
    voices.push(voice);
    calls.push({ id, options });
    return voice;
  };
  const emit = (s) =>
    audio.event(
      {
        hiddenRoadPhase: {
          journeyId: s.hiddenRoadJourney.id,
          phase: 'opening',
        },
      },
      s,
      {},
    );
  return { audio, calls, voices, emit };
}
test('gatekeeper cue uses the exact approved take on the voice bus', () => {
  const cue = SOUND_BANK['gatekeeper.welcome'];
  assert(cue);
  assert.equal(cue.bus, 'voice');
  assert.equal(cue.duck, 'voice');
  assert.equal(cue.limit, 1);
  assert.equal(
    hash(readFileSync('audio-src/voices/gatekeeper-welcome.mp3')),
    SHA,
  );
  assert.equal(hash(readFileSync('public/assets/audio/' + cue.file)), SHA);
});
test('opening event plays once; repeated snapshots and repeated events do not replay', () => {
  const f = fixture(),
    s = state(),
    before = JSON.stringify(s);
  f.audio.updateHiddenRoad(s);
  assert.equal(f.calls.length, 0, 'a render snapshot cannot invent the event');
  f.emit(s);
  for (let i = 0; i < 12; i++) f.audio.updateHiddenRoad(s);
  f.emit(s);
  f.audio.updateHiddenRoad(s);
  assert.deepEqual(
    f.calls.map((c) => c.id),
    ['gatekeeper.welcome'],
  );
  assert.equal(JSON.stringify(s), before);
});
test('pause before opening defers it; pausing after playback stops without a restart', () => {
  const f = fixture(),
    s = state();
  s.paused = true;
  f.emit(s);
  f.audio.updateHiddenRoad(s);
  assert.equal(f.calls.length, 0);
  s.paused = false;
  f.audio.updateHiddenRoad(s);
  assert.equal(f.calls.length, 1);
  s.paused = true;
  for (let i = 0; i < 5; i++) f.audio.updateHiddenRoad(s);
  assert.equal(f.voices[0].stops, 1);
  s.paused = false;
  f.audio.updateHiddenRoad(s);
  assert.equal(f.calls.length, 1);
});
test('disabled flag, unavailable sample and expired opening never invent playback', () => {
  const off = fixture(false),
    s = state();
  off.emit(s);
  off.audio.updateHiddenRoad(s);
  assert.equal(off.calls.length, 0);
  const missing = fixture();
  missing.audio.cueBuffers = {};
  missing.emit(s);
  missing.audio.updateHiddenRoad(s);
  assert.equal(missing.calls.length, 0);
  missing.audio.cueBuffers = { 'gatekeeper.welcome': { duration: 4 } };
  missing.audio.updateHiddenRoad(s);
  assert.equal(missing.calls.length, 1);
  const late = fixture();
  late.audio.cueBuffers = {};
  late.emit(s);
  late.audio.updateHiddenRoad(s);
  late.audio.cueBuffers = { 'gatekeeper.welcome': { duration: 4 } };
  late.audio.updateHiddenRoad(state('entering'));
  assert.equal(late.calls.length, 0);
});
test('mute, navigation and journey changes retire the owned welcome', () => {
  for (const action of ['mute', 'menu', 'turn-back', 'new-journey']) {
    const f = fixture(),
      s = state();
    f.emit(s);
    f.audio.updateHiddenRoad(s);
    if (action === 'mute') f.audio.muted = true;
    const next =
      action === 'menu'
        ? { ...s, status: 'menu' }
        : action === 'turn-back'
          ? state('turned-back')
          : action === 'new-journey'
            ? state('opening', 2)
            : s;
    f.audio.updateHiddenRoad(next);
    assert.equal(f.voices[0].stops, 1, action);
    if (action === 'new-journey') {
      f.emit(next);
      f.audio.updateHiddenRoad(next);
      assert.equal(f.calls.length, 2);
    }
  }
});
class Element {
  constructor(doc) {
    this.ownerDocument = doc;
    this.children = [];
    this.attrs = {};
    this.hidden = false;
    this.isConnected = true;
  }
  appendChild(n) {
    n.parent = this;
    this.children.push(n);
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  addEventListener() {}
  removeEventListener() {}
  contains(n) {
    return n === this || this.children.some((c) => c.contains(n));
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  remove() {
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.isConnected = false;
  }
}
test('automatic arrival keeps the exact invitation as a nonmodal subtitle', () => {
  const doc = {
    createElement() {
      return new Element(doc);
    },
    activeElement: null,
  };
  const host = new Element(doc);
  const ui = createHiddenRoadUi({ host, onChoose() {}, onMenu() {} }),
    course = { hiddenRoad: {} };
  const find = (node, key) =>
    Object.hasOwn(node.attrs, key)
      ? node
      : node.children.map((c) => find(c, key)).find(Boolean);
  const caption = find(host, 'data-gatekeeper-subtitle');
  assert(caption, 'caption exists');
  for (const phase of ['opening', 'entering']) {
    ui.update(state(phase), course);
    assert.equal(caption.hidden, false);
    assert.match(
      caption.textContent,
      /Outsiders don’t find this road by accident\. Come in, driver\./,
    );
    assert.equal(doc.activeElement, null);
  }
  ui.update({ ...state(), paused: true }, course);
  assert.equal(caption.hidden, true);
  ui.update(state('choice'), course);
  assert.equal(caption.hidden, true);
  assert.equal(find(host, 'data-hidden-road-dialog').hidden, false);
  ui.update({ ...state(), status: 'menu' }, course);
  assert.equal(caption.hidden, true);
  ui.dispose();
  assert.equal(host.children.length, 0);
});

test('automatic visit stage-loaded follows opening without discarding its pending welcome', () => {
  const f = fixture(),
    s = state();
  f.emit(s);
  f.audio.event({ stageLoaded: 0, hiddenRoadVisit: true }, s, {});
  f.audio.updateHiddenRoad(s);
  assert.equal(f.calls.length, 1);
});
