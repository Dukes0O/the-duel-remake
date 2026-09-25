import assert from 'node:assert/strict';
import {test} from 'node:test';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {PLAYERS_KEY} from '../src/progression.js';

// This process uses only synthetic storage. No browser origin is opened.
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
globalThis.cancelAnimationFrame = () => {};

const flags = (hidden = true, wasteland = true) => createFeatureFlags({storage: null,
  overrides: {'hidden-road': hidden, wasteland2: wasteland}});

function appWithCareer() {
  values.clear();
  const app = new App();
  app.duel.featureFlags = flags();
  app.audio.unlock = () => {};
  app.profile = {...app.profile, credits: 700,
    wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: 3000, xp: 2000}};
  assert.equal(app._saveProfile(), true);
  return app;
}

function revisit(app) {
  assert.equal(app.visitWasteland(), true);
  app.advance(8);
  assert.equal(app.duel.state.status, 'exploring');
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'arrived');
  assert.ok(app.duel.state.hiddenRoadVisit);
}

function scenic(app) {
  assert.equal(app.startCampaign({startStage: 0, mode: 'timetrial', seed: 1989,
    car: 'falcone_f42', difficulty: 'casual'}), true);
  app.advance(3.1);
  const road = app.duel.course.hiddenRoad;
  const place = progress => {
    const p = road.poseAt(progress);
    const angle = p.heading - app.duel.course.at(p.s).heading;
    Object.assign(app.duel.state, {s: p.s, prevS: p.s, lateral: p.lateral,
      prevLateral: p.lateral, speedMph: 35,
      headingError: Math.atan2(Math.sin(angle), Math.cos(angle)),
      slipAngle: 0, yawVelocity: 0, groundHeight: p.y, airHeight: 0,
      airborne: false, impactTimer: 0, traffic: [], opponents: [], rival: null});
  };
  place(151); app.advance(.02);
  assert.equal(app.duel.state.status, 'exploring');
  place(road.length - 59); app.advance(12);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'arrived');
  assert.equal(app.duel.state.hiddenRoadVisit, null);
}

const wallet = app => ({credits: app.profile.credits, scrap: app.profile.wasteland.scrap,
  history: structuredClone(app.profile.history), bests: structuredClone(app.profile.personalBests),
  settled: structuredClone(app.profile.settledResults), board: structuredClone(app.leaderboard)});

test('scenic arrival and menu revisit expose the same guarded yard without granting race rewards', () => {
  for (const arrive of [scenic, revisit]) {
    const app = appWithCareer();
    try {
      const before = wallet(app);
      arrive(app);
      assert.equal(app.isYardHomeActive(), true);
      const after = wallet(app);
      assert.equal(after.credits, before.credits);
      assert.equal(after.scrap, before.scrap);
      assert.deepEqual(after.bests, before.bests);
      assert.deepEqual(after.board, before.board);
      if (arrive === scenic) {
        // Existing departure behavior is checked in test-hidden-road-departure:
        // the prior race is abandoned once with zero reward and charge.
        assert.equal(after.history.length, before.history.length + 1);
        assert.equal(after.history.at(-1).abandoned, true);
        assert.equal(after.history.at(-1).reward, 0);
        assert.equal(after.history.at(-1).charge, 0);
        assert.equal(after.settled.length, before.settled.length + 1);
      } else {
        assert.deepEqual(after.history, before.history);
        assert.deepEqual(after.settled, before.settled);
      }
      assert.equal(app.profile.activeRace, null);
      assert.equal(app.purchaseUpgrade('falcone_f42', 'engine').ok, false,
        'credit garage remains menu-only');
      assert.equal(app.duel.state.status, 'exploring');
    } finally { app.dispose(); }
  }
});

test('yard scrap operations spend once, equip and persist without touching credits or records', () => {
  const app = appWithCareer();
  try {
    revisit(app);
    const before = wallet(app);
    assert.equal(app.purchaseWeapon('ufo').ok, true);
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, true);
    assert.equal(app.equipArmorKit('falcone_f42', null).ok, true);
    assert.equal(app.equipArmorKit('falcone_f42', 'scrapper').ok, true);
    assert.equal(app.equipCarWeapon(0, 'bomb').ok, true);
    assert.equal(app.selectCrewMember('nell').ok, true);
    assert.equal(app.profile.wasteland.scrap, before.scrap - 150 - 350 - 300);
    assert.equal(app.profile.credits, before.credits);
    assert.deepEqual(app.profile.history, before.history);
    assert.deepEqual(app.profile.personalBests, before.bests);
    assert.deepEqual(app.profile.settledResults, before.settled);
    assert.deepEqual(app.leaderboard, before.board);
    assert.equal(app.duel.state.status, 'exploring', 'yard operations keep the visit open');
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, false,
      'repeat purchase cannot charge');
    assert.equal(app.selectCrewMember('nell').changed, false,
      'repeat crew selection cannot charge');
    assert.equal(app.profile.wasteland.scrap, before.scrap - 800);
    app.returnToMenu();
    assert.equal(app.duel.state.status, 'menu');
    assert.equal(app.profile.wasteland.kits.falcone_f42.equipped, 'scrapper');
    assert.equal(app.profile.wasteland.crew.selected, 'nell');
    assert.equal(app.visitWasteland(), true, 'saved inventory survives leave and revisit');
  } finally { app.dispose(); }
});

test('yard guard rejects prearrival, wrong player, visit owner mismatch and either flag off', () => {
  const app = appWithCareer();
  try {
    const initial = wallet(app);
    assert.equal(app.isYardHomeActive(), false);
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, true,
      'menu behavior is unchanged before a yard visit');
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
      kits: {}, scrap: initial.scrap}};
    app._saveProfile();
    assert.equal(app.visitWasteland(), true);
    assert.equal(app.duel.state.status, 'exploring');
    assert.equal(app.isYardHomeActive(), false, 'approach is not the arrived yard');
    assert.equal(app.purchaseWeapon('ufo').ok, false);
    app.advance(8);
    assert.equal(app.duel.state.hiddenRoadJourney.phase, 'arrived');
    assert.equal(app.isYardHomeActive(), true);
    assert.equal(app.duel.state.hiddenRoadVisit.journeyId,
      app.duel.state.hiddenRoadJourney.id, 'visit marker names the current journey');
    const original = app.duel.state.playerId;
    app.duel.state.playerId = 'different-player';
    assert.equal(app.isYardHomeActive(), false);
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, false);
    app.duel.state.playerId = original;
    const visit = app.duel.state.hiddenRoadVisit;
    app.duel.state.hiddenRoadVisit = {...visit, playerId: 'different-player'};
    assert.equal(app.isYardHomeActive(), false);
    assert.equal(app.purchaseWeapon('ufo').ok, false);
    app.duel.state.hiddenRoadVisit = {...visit, journeyId: -1};
    assert.equal(app.isYardHomeActive(), false);
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, false);
    app.duel.state.hiddenRoadVisit = visit;
    for (const replacement of [flags(false, true), flags(true, false)]) {
      app.duel.featureFlags = replacement;
      assert.equal(app.isYardHomeActive(), false);
      assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, false);
      assert.equal(app.selectCrewMember('nell').ok, false);
    }
    assert.equal(app.profile.wasteland.scrap, initial.scrap);
  } finally { app.dispose(); }
});

test('yard purchase rechecks refreshed player discovery and ownership before spending', () => {
  const app = appWithCareer();
  try {
    revisit(app);
    const registry = JSON.parse(values.get(PLAYERS_KEY));
    const active = registry.players.find(player => player.id === app.player.id);
    active.profile.wasteland.discoveredGate = false;
    values.set(PLAYERS_KEY, JSON.stringify(registry));
    const before = values.get(PLAYERS_KEY);
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, false);
    assert.equal(app.purchaseWeapon('ufo').ok, false);
    assert.equal(values.get(PLAYERS_KEY), before, 'rejected actions do not rewrite the other tab');
    assert.equal(app.isYardHomeActive(), false);
  } finally { app.dispose(); }
});

test('failed save leaves yard wallet and inventory unchanged and retry charges once', () => {
  const app = appWithCareer();
  try {
    revisit(app);
    const before = structuredClone(app.profile);
    const savedBytes = values.get(PLAYERS_KEY);
    const save = app._saveProfile.bind(app);
    app._saveProfile = () => false;
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, false);
    assert.deepEqual(app.profile, before);
    assert.equal(values.get(PLAYERS_KEY), savedBytes);
    app._saveProfile = save;
    assert.equal(app.purchaseArmorKit('falcone_f42', 'scrapper').ok, true);
    assert.equal(app.profile.wasteland.scrap, before.wasteland.scrap - 350);
  } finally { app.dispose(); }
});


test('profile refresh cannot redirect a parked visit to another player wallet', () => {
  for (const action of [
    app => app.purchaseArmorKit('falcone_f42','scrapper'),
    app => app.purchaseWeapon('ufo'),
    app => app.selectCrewMember('nell'),
    app => app.equipCarWeapon('front','crossbow'),
    app => app.equipArmorKit('falcone_f42',null),
  ]) {
    const app=appWithCareer();
    try {
      const ownerId=app.player.id;
      const added=app.addPlayer('Second yard driver'); assert.equal(added.ok,true);
      const otherId=app.player.id;
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,scrap:9000,xp:2000}};
      assert.equal(app._saveProfile(),true); assert.equal(app.selectPlayer(ownerId),true);
      revisit(app); assert.equal(app.isYardHomeActive(),true);
      const bytes=values.get(PLAYERS_KEY);
      // The public guard currently sees the original driver. Refresh must not
      // spend if it resolves a now-different active in-memory profile.
      app.players={...app.players,activePlayerId:otherId};
      assert.equal(app.isYardHomeActive(),true);
      assert.equal(action(app).ok,false);
      assert.equal(app.player.id,otherId);
      assert.equal(values.get(PLAYERS_KEY),bytes,'neither wallet or inventory is written');
    } finally {app.dispose();}
  }
});

test('another tab selecting a player cannot redirect this tab yard purchase', () => {
  const app=appWithCareer();
  try {
    const ownerId=app.player.id;
    assert.equal(app.addPlayer('Other tab driver').ok,true);
    const otherId=app.player.id;
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,scrap:9000}};
    assert.equal(app._saveProfile(),true); assert.equal(app.selectPlayer(ownerId),true);
    revisit(app);
    const registry=JSON.parse(values.get(PLAYERS_KEY));
    const otherBefore=structuredClone(registry.players.find(p=>p.id===otherId));
    registry.activePlayerId=otherId; values.set(PLAYERS_KEY,JSON.stringify(registry));
    assert.equal(app.purchaseArmorKit('falcone_f42','scrapper').ok,true);
    assert.equal(app.player.id,ownerId); assert.equal(app.profile.wasteland.scrap,2650);
    const after=JSON.parse(values.get(PLAYERS_KEY));
    assert.deepEqual(after.players.find(p=>p.id===otherId),otherBefore);
  } finally {app.dispose();}
});
