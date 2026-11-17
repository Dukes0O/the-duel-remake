// SCABLANDS-LAND round 4, slice 4: the map. The checks are the card's ("Slice 4 design"): one picture of the land made from the land's own data (every place, road and
// crossing on it at its own position; its colour at a point agrees with what the ground there is); the small map's arrow, marker, edge marker and distance are right for cars
// at several positions and headings; what the player has learnt is kept; the ways to a place are worked out from the data (Hot Delivery's four); opening the map changes
// nothing in a job; and nothing in the map is written as a bare position. Drawing is checked on a recording canvas; the real pictures are the browser scenario's
// (tools/scenarios/scablands-map.mjs).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {LAND} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES, SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {DRIVE, RIVER_LAND, scablandsDriveAt} from '../src/world/scablands-regions.js';
import {ROAD_NET, EAST_ROAD} from '../src/world/scablands-road.js';
import {scablandsHeightAt} from '../src/world/scablands-height.js';
import {GROUND_COLOURS} from '../src/world/scablands-ground-look.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';
import {createLandPicture, landMarks, mutedColour, REGION_COLOURS, REGION_KEYS, reliefShade, PICTURE_CELL} from '../src/world/scablands-picture.js';
import {smallView, wholeView, toScreen, toLand, arrowTurn, edgeMarker, sourceRect, SMALL_MAP, createKnowledge, learn, jobFacts, drawSmallMap, drawBigMap, SEEN} from '../src/world/scablands-map.js';
import {HOT_DELIVERY_WAYS, WATCH, routeFor, roadWay, describeWay, sees, sightOutline, holderOf, pathLength, nearestOnLine, sliceLine, groundAlong} from '../src/world/scablands-ways.js';
import {worldHudModel, worldMapCar, worldMapFrame, worldMapWays, waysMarkup} from '../src/world/world-hud.js';
import {worldJobMapData} from '../src/route-map.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob} from '../src/world/jobs/job-engine.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const near = (actual, expected, tolerance, message) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} is not within ${tolerance} of ${expected}`); checks++; };

// A recording canvas: what is drawn, where, in what order.
globalThis.Path2D = class { constructor() { this.points = []; } moveTo(x, z) { this.points.push([x, z]); } lineTo(x, z) { this.points.push([x, z]); } closePath() {} };
function recorder() {
  const texts = [], arcs = [], paths = [], rotations = [], translations = [], scales = [], images = [];
  const state = {}, fills = [];
  const context = new Proxy({
    measureText: text => ({width: String(text).length * 7}),
    fill: () => fills.push(state.fillStyle),
    fillText: (text, x, y) => texts.push({text: String(text), x, y}),
    arc: (x, y, r) => arcs.push({x, y, r, fill: state.fillStyle}),
    stroke: path => { if (path) paths.push({path, transform: {translate: translations.at(-1), scale: scales.at(-1)}, colour: state.strokeStyle, width: state.lineWidth}); },
    rotate: angle => rotations.push(angle), translate: (x, y) => translations.push([x, y]), scale: (x, y) => scales.push([x, y]),
    drawImage: (...args) => images.push(args),
  }, {get: (target, key) => key in target ? target[key] : key in state ? state[key] : (() => {}), set: (target, key, value) => (state[key] = value, true)});
  return {context, texts, arcs, paths, rotations, translations, scales, images, fills};
}

// ---- 1. The picture is made from the land's own data ---------------------------------------------------------------------------------------------
const picture = createLandPicture({marks: landMarks({solids: SCABLANDS_SOLIDS})});
// Horn to contact: the scout enters the real frame and close marks are painted over the player's arrow.
{
  const definition = EVERBURN_JOBS[0], job = createJob(definition);
  job.stepState = {loaded:true, ember:100};
  const scout = {id:definition.steps[0].scout.id, position:{x:60, z:0}};
  const worldJob = {definition, job, actors:[scout]};
  const state = {s:0, lateral:0, arena:{mode:'world-job', worldJob}};
  const course = {worldAt:() => ({x:0, z:0, heading:Math.PI / 2})};
  const frame = () => worldMapFrame({state, course, knowledge:createKnowledge(), picture, canvas:null});
  check(frame().actors.length === 0, 'the scout is unmarked before its horn');
  job.stepState.scoutWarned = true;
  for (const distance of [250, 60, 10]) {
    scout.position.x = distance;
    const rec = recorder(), current = frame();
    check(current.actors.some(mark => mark.kind === 'rider' && mark.position === scout.position), 'the warned scout enters the drawn map');
    drawSmallMap(rec.context, current);
    const arrow = rec.fills.lastIndexOf('#fff1d0'), rider = rec.fills.lastIndexOf('#ef9f75');
    check(arrow >= 0 && rider > arrow, `the scout at ${distance} m is drawn above the car arrow`);
  }
}
const clock = () => performance.now();
const began = clock();
const buildMs = picture.build();
console.log(`the picture of the land: ${picture.width} by ${picture.height} cells of ${PICTURE_CELL} m, made in ${buildMs.toFixed(0)} ms in one go`);
check(picture.done && picture.width * picture.cell === SCABLANDS_LAYOUT.halfWidth * 2 && picture.height * picture.cell === SCABLANDS_LAYOUT.halfDepth * 2, 'the picture covers the whole land, 14 km by 10 km');
check(buildMs < 5000, 'the picture is made in a few seconds at the most even on a slow machine (in the game it is made in slices, a few milliseconds a frame)');
{
  // The same picture made in slices of a few milliseconds: the same pixels, and no slice runs far over its budget.
  const sliced = createLandPicture({marks: picture.marks});
  let slices = 0, worst = 0;
  while (!sliced.done) { const before = clock(); sliced.step(4); worst = Math.max(worst, clock() - before); slices++; }
  check(Buffer.compare(Buffer.from(sliced.pixels), Buffer.from(picture.pixels)) === 0, 'made in slices, the picture is the same one');
  check(slices > 10 && worst < 40, `the picture is spread over many slices (${slices}), none of them long (${worst.toFixed(1)} ms)`);
  check(sliced.progress === 1 && sliced.labels.length === picture.labels.length, 'a finished picture says so, and has named its grounds');
  console.log(`in slices of 4 ms: ${slices} slices, the longest ${worst.toFixed(1)} ms`);
}

// Every place, road and crossing of the data is on the picture, at its own position.
{
  const marks = picture.marks;
  check(marks.places.length === SCABLANDS_PLACES.length + 1, 'every place of the table, and the yard, is on the picture');
  for (const place of SCABLANDS_PLACES) {
    const mark = marks.places.find(item => item.id === place.id);
    check(mark && mark.x === place.x && mark.z === place.z && mark.name === place.name, `${place.name} is on the picture at its own position`);
  }
  check(marks.places[0].id === 'yard' && marks.places[0].x === LAND.yard.x && marks.places[0].z === LAND.yard.z, 'the yard is on the picture');
  check(marks.roads.length === ROAD_NET.roads.length && ROAD_NET.roads.every(road => marks.roads.find(item => item.id === road.id)?.points === road.points), 'every road of the net is on the picture, with its own line');
  check(marks.crossings.length === 5 && RIVER_LAND.crossings.every(crossing => marks.crossings.some(item => item.id === crossing.id && item.x === crossing.x && item.z === crossing.z)), 'all five crossings are on the picture at their own positions');
  check(marks.river.points === RIVER_LAND.line.points && marks.river.bedWidth === 120, 'the dry river is the river of the land, 120 m wide in its bed');
  // The plan of each place is its solid boxes, each inside the place's own neighbourhood.
  for (const place of marks.places.slice(1)) check(place.plan.every(box => Math.hypot(box.x - place.x, box.z - place.z) < 400), `${place.name}'s plan stands round it`);
  check(marks.places.find(item => item.id === 'tin-town').plan.length >= 8 && marks.places.find(item => item.id === 'boneyard').plan.length === 3, "Tin Town's plan has its clusters, gate posts and town; the Boneyard's has its three wrecks");
  // The raster knows the roads: along every road, the cell under the road or one beside it is ground of the kind a road is.
  for (const road of ROAD_NET.roads) {
    let off = 0, total = 0;
    for (let metres = 0; metres < road.length; metres += 100) {
      const at = sliceLine(road.points, metres, metres + .01)[0], {i, j} = picture.pixelOf(at.x, at.z);
      let found = false;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) found ||= REGION_KEYS[picture.region[Math.min(picture.height - 1, Math.max(0, j + dj)) * picture.width + Math.min(picture.width - 1, Math.max(0, i + di))]] === 'road';
      total++; if (!found) off++;
    }
    check(off === 0, `${road.name} lies on road ground in the picture along its whole length (${off} of ${total} samples off)`);
  }
}

// The picture's colour at a point agrees with the ground there (a few hundred points), and is that ground's own colour, muted, and shaded by the height.
{
  let seed = 20261114, drawn = 0, exact = 0, edge = 0;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let n = 0; n < 600; n++) {
    const x = (random() * 2 - 1) * SCABLANDS_LAYOUT.halfWidth * .94, z = (random() * 2 - 1) * SCABLANDS_LAYOUT.halfDepth * .94;
    if (picture.rimAt(x, z) > 0) continue;
    drawn++;
    const record = scablandsDriveAt(x, z), key = Object.keys(DRIVE).find(name => DRIVE[name] === record), here = picture.regionAt(x, z);
    if (here === key) exact++;
    else {
      // A point within a cell of the edge of two grounds may fall in the neighbour's cell: the ground it is on must be one of the cells round it.
      let beside = false;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) beside ||= picture.regionAt(x + di * picture.cell, z + dj * picture.cell) === key;
      check(beside, `at (${x.toFixed(0)}, ${z.toFixed(0)}) the picture says ${here} and the ground is ${key}`);
      edge++;
    }
    const base = REGION_COLOURS[here], shade = picture.shadeAt(x, z), colour = picture.colourAt(x, z);
    for (let c = 0; c < 3; c++) near(colour[c], Math.min(255, base[c] * shade), 1.01, `the colour at (${x.toFixed(0)}, ${z.toFixed(0)}) is ${here} shaded by ${shade.toFixed(2)}`);
  }
  check(drawn >= 400 && exact / drawn >= .97, `${exact} of ${drawn} points are on the very ground the picture says; the other ${edge} are within a cell of an edge`);
  // Every ground has a colour and a name, made from the ground's own colour (the table the shader reads), muted.
  check(REGION_KEYS.length === Object.keys(DRIVE).length && REGION_KEYS.every(key => REGION_COLOURS[key].length === 3), 'every ground the land has is drawn');
  check(JSON.stringify(REGION_COLOURS['salt-pan']) === JSON.stringify(mutedColour(GROUND_COLOURS['salt-pan'])), "the salt pan's colour is the salt's own colour, muted");
  check(REGION_COLOURS['scab-plates'][0] < REGION_COLOURS['salt-pan'][0] - 60, 'black plates are drawn much darker than white salt');
  // The grounds are named on the picture, each in a place where it is wide, and each name is on the ground it names.
  const named = new Set(picture.labels.map(label => label.key));
  for (const key of ['flats', 'salt-pan', 'scab-plates', 'sand', 'burn', 'wreck-fields']) check(named.has(key), `${key} is named on the picture`);
  for (const label of picture.labels) check(picture.regionAt(label.x, label.z) === label.key || label.key === 'river-bed', `${label.name} is named on ${label.key}`);
}

// The picture shades the height of the land from its own height function: a hill is a lit side and a shaded side, flat ground is not shaded, and no rise of the
// land is named in the picture (so a hill added to the height function shows without any change here).
{
  const hill = (x, z) => 70 * Math.exp(-((x - 1000) ** 2 + (z + 500) ** 2) / (2 * 300 ** 2));
  const test = createLandPicture({heightAt: hill, driveAt: () => DRIVE.flats, marks: picture.marks});
  test.build();
  check(test.shadeAt(1000 - 330, -500 - 330) > 1.1, 'the side of a hill that faces the north-west light is lit');
  check(test.shadeAt(1000 + 330, -500 + 330) < .85, 'the side that faces away is in shadow');
  near(test.shadeAt(-3000, 2000), 1, .001, 'flat ground is not shaded');
  near(reliefShade(.01, .01), 1, .001, "the plain's own gentle roll (a slope under 2 percent) is not drawn");
  check(test.rimAt(1000, -500) === 0 && hill(1000, -500) > 60, 'a hill of 70 m is still land (only the land\'s rim fades to rock)');
  for (const file of ['src/world/scablands-picture.js', 'src/world/scablands-map.js', 'src/world/scablands-ways.js']) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    check(!/riseHeightAt|RISES|scablandsTerrainHeightAt/.test(text), `${file} reads the land's height only through scablandsHeightAt`);
  }
  check(picture.heightAtPixel(6000, 0) === scablandsHeightAt(picture.x0 + (picture.pixelOf(6000, 0).i + .5) * picture.cell, picture.z0 + (picture.pixelOf(6000, 0).j + .5) * picture.cell), "the picture's height is the land's own height function");
}

// ---- 2. The small map ----------------------------------------------------------------------------------------------------------------------------
{
  const view = smallView({x: 1000, z: -2000});
  near(view.scale * SMALL_MAP.metresAcross, SMALL_MAP.width, 1e-9, 'the small map is about 2.5 km across');
  check(SMALL_MAP.metresAcross === 2500, 'exactly 2.5 km');
  // North is up: a point north of the car (smaller z) is higher on the screen; east is to the right.
  check(toScreen(view, 1000, -2300).y < view.height / 2 && toScreen(view, 1300, -2000).x > view.width / 2, 'north is up and east is right');
  const back = toLand(view, ...Object.values(toScreen(view, 1234, -2345)));
  near(back.x, 1234, 1e-6, 'screen and land agree (x)'); near(back.z, -2345, 1e-6, 'screen and land agree (z)');
  // The car's arrow turns with the car: facing south (heading 0) points down, east (a quarter turn) points right, north (half a turn) points up, west points left.
  const direction = turn => ({x: Math.sin(turn), y: -Math.cos(turn)});
  const facing = [[0, 0, 1], [Math.PI / 2, 1, 0], [Math.PI, 0, -1], [-Math.PI / 2, -1, 0], [Math.PI / 4, Math.SQRT1_2, Math.SQRT1_2]];
  for (const [heading, dx, dy] of facing) {
    near(direction(arrowTurn(heading)).x, dx, 1e-9, `a car facing heading ${heading.toFixed(2)} has its arrow turned (x)`); near(direction(arrowTurn(heading)).y, dy, 1e-9, `... (y)`);
    // The heading in screen terms is the heading in land terms: the arrow points where the car goes.
    const ahead = toScreen(view, 1000 + Math.sin(heading) * 100, -2000 + Math.cos(heading) * 100), centre = toScreen(view, 1000, -2000);
    near(Math.atan2(ahead.y - centre.y, ahead.x - centre.x), Math.atan2(dy, dx), 1e-9, `the arrow of a car at heading ${heading.toFixed(2)} points along the screen's own line ahead`);
  }
  // The job's place: on the map where it stands; on the edge, in its own direction, with the distance in km, when it is off the map.
  const car = {x: 0, z: 0}, on = edgeMarker(smallView(car), {x: 400, z: -300}, car);
  check(on.onMap && Math.abs(on.x - (200 + 400 * view.scale)) < 1e-6 && Math.abs(on.y - (140 - 300 * view.scale)) < 1e-6 && on.km === .5, 'a place on the map is marked where it stands, 0.5 km away');
  for (const [name, target] of [['Tin Town', LAND.at('tin-town')], ['the Ridge', LAND.at('ridge')], ['the Dead Mall', LAND.at('dead-mall')], ['the Iron Line', LAND.at('iron-line')], ['the Dry Dam', LAND.at('dry-dam')]]) {
    const marker = edgeMarker(smallView(car), target, car), v = smallView(car);
    check(!marker.onMap, `${name} is off the map from the yard`);
    near(marker.km, Math.round(Math.hypot(target.x, target.z) / 100) / 10, 1e-9, `${name}: the distance in km`);
    const inset = SMALL_MAP.edgeInset;
    check(marker.x >= inset - 1e-6 && marker.x <= v.width - inset + 1e-6 && marker.y >= inset - 1e-6 && marker.y <= v.height - inset + 1e-6, `${name}: the mark sits inside the edge of the map`);
    check(Math.abs(marker.x - inset) < 1e-6 || Math.abs(marker.x - (v.width - inset)) < 1e-6 || Math.abs(marker.y - inset) < 1e-6 || Math.abs(marker.y - (v.height - inset)) < 1e-6, `${name}: and on its edge`);
    near(marker.angle, Math.atan2(target.z, target.x), 1e-9, `${name}: and points the way the place lies`);
    near(Math.atan2(marker.y - v.height / 2, marker.x - v.width / 2), marker.angle, 1e-9, `${name}: the mark is on the line from the car to the place`);
  }
  // Cars at several places and headings, drawn: the arrow stands in the middle and is turned, the names of the places that are on the map are written and no others.
  const cases = [
    {car: {x: LAND.yard.x, z: LAND.yard.z, heading: Math.PI / 2}, onMap: ['YARD'], offMap: ['TIN TOWN', 'RIDGE'], km: 6.0},
    {car: {...LAND.at('tin-town', -25, 200), heading: Math.PI}, onMap: ['TIN TOWN'], offMap: ['YARD', 'BONEYARD']},
    {car: {...LAND.at('girder-bridge', -110, 0), heading: .7}, onMap: [], offMap: ['YARD', 'TIN TOWN']},
    {car: {...LAND.at('yard', 2000, -1700), heading: -Math.PI / 2}, onMap: [], offMap: ['YARD', 'TIN TOWN', 'RIDGE'], km: 4.3},
  ];
  for (const item of cases) {
    const rec = recorder(), target = {...LAND.at('tin-town'), name: 'Tin Town'};
    const marker = drawSmallMap(rec.context, {picture, canvas: null, car: item.car, target, knowledge: createKnowledge(), actors: []}, SMALL_MAP);
    const names = rec.texts.map(text => text.text);
    for (const name of item.onMap) check(names.includes(name), `${name} is named on the small map when the car is at (${item.car.x.toFixed(0)}, ${item.car.z.toFixed(0)})`);
    for (const name of item.offMap) check(!names.includes(name), `${name} is not named on the small map there`);
    check(rec.arcs.some(arc => Math.abs(arc.x - 0) < 1e9) && rec.rotations.some(angle => Math.abs(angle - arrowTurn(item.car.heading)) < 1e-9), `the car's arrow is turned ${arrowTurn(item.car.heading).toFixed(2)} for heading ${item.car.heading.toFixed(2)}`);
    check(rec.translations.some(([x, y]) => x === SMALL_MAP.width / 2 && y === SMALL_MAP.height / 2), "the arrow is in the middle of the map: the map is the car's");
    if (item.km) check(!marker.onMap && marker.km === item.km && names.some(name => name.includes(`${item.km.toFixed(1)} km`)), `the distance ${item.km} km is written beside the mark on the edge`);
    else if (marker.onMap) check(names.every(name => !/ km$/.test(name)), 'no distance is written when the place is on the map');
    // The small map draws the ground of the picture (the part under the window) and every road that crosses the window.
    check(rec.paths.length >= 2, 'the river and the roads are drawn as lines');
  }
  // Roads and crossings are plain: a road is two lines (its edge, then its pale line), a crossing's name is written when it is on the map.
  const rec = recorder();
  drawSmallMap(rec.context, {picture, canvas: null, car: {...LAND.at('girder-bridge'), heading: 0}, target: null, knowledge: createKnowledge(), actors: []}, SMALL_MAP);
  check(rec.texts.some(text => text.text === 'The Girder Bridge'), 'a crossing is named when it is on the map');
  check(rec.paths.some(item => item.colour === '#e6d6ae') && rec.paths.some(item => item.colour === '#17150f'), 'roads are a dark edge and a pale line');
  // No line of the job's own, and nothing drawn from a job's path.
  const text = readFileSync(new URL('../src/world/scablands-map.js', import.meta.url), 'utf8');
  check(!/\.path\b|returnPath|safePoints|\.origin\b|\.destination\b/.test(text.replace(/\/\/.*$/gm, '')), 'the map reads no road of a job: a way is the player\'s choice');
}

// ---- 3. What the player has learnt ---------------------------------------------------------------------------------------------------------------
{
  const definition = EVERBURN_JOBS[0], job = createJob(definition), worldJob = {definition, job, actors: []};
  const facts = jobFacts(worldJob), knowledge = createKnowledge(), crossings = picture.marks.crossings;
  check(facts.barricades.length === 2 && facts.barricades.every(item => /^ash-men-barricade-/.test(item.id)), "Hot Delivery's two barricades of the Ash Men are what the job knows");
  check(facts.furnaces.length === 1 && facts.furnaces[0].id === 'furnace-skyline', "and the furnace on its skyline");
  // The barricade at the Girder Bridge (EVERBURN-REMAKE job 1, 16 November 2026: the job's first barricade now stands at the Halfway Camp, on no crossing).
  const bridge = LAND.at('girder-bridge'), first = facts.barricades.find(item => Math.hypot(item.x - bridge.x, item.z - bridge.z) < 50), far = {x: first.x - SEEN.barricade - 100, z: first.z};
  learn(knowledge, {car: far, ...facts, crossings});
  check(knowledge.barricades.size === 0 && knowledge.crossings.size === 0, 'a barricade out of sight is not learnt, and no crossing with it');
  check(learn(knowledge, {car: {x: first.x - 300, z: first.z}, ...facts, crossings}) && knowledge.barricades.size === 1, 'a barricade is learnt when the car comes within sight of it');
  const held = [...knowledge.crossings.values()];
  check(held.length === 1 && held[0].id === 'girder-bridge' && held[0].who === 'Ash Men', 'the crossing it stands at is learnt as held, by the Ash Men');
  check(knowledge.sights.size === 1 && knowledge.sights.get('furnace-skyline').outline.length >= 24, "the furnace's sight is learnt as an outline cut by the ground");
  // What is learnt is drawn, on both maps: the barricade's cross, the held crossing's ring, the furnace's sight as a hatched outline cut by the ground.
  for (const [name, draw] of [['small', context => drawSmallMap(context, {picture, canvas: null, car: {x: first.x - 100, z: first.z, heading: 0}, target: null, knowledge, actors: []}, SMALL_MAP)],
    ['big', context => drawBigMap(context, {picture, canvas: null, car: {x: first.x - 100, z: first.z, heading: 0}, target: null, knowledge, actors: [], ways: []}, {width: 1400, height: 1000})]]) {
    const rec = recorder(); draw(rec.context);
    check(rec.paths.length >= picture.marks.roads.length * 2 + 2 + 3, `the ${name} map draws what has been learnt (the sight's outline and hatching are stroked on top of the roads and the river)`);
  }
  const version = knowledge.version;
  learn(knowledge, {car: far, ...facts, crossings});
  check(knowledge.barricades.size === 1 && knowledge.crossings.size === 1 && knowledge.version === version, 'what has been learnt stays when the car drives away, and nothing changes by looking again');
  // A furnace that has gone is no longer drawn.
  learn(knowledge, {car: far, barricades: [], furnaces: [{id: 'furnace-skyline', hidden: true}], crossings});
  check(knowledge.sights.size === 0, "a furnace that is gone takes its sight with it");
  // The sight of a watcher stops where the ground hides a car: over a wall of 80 m nothing beyond is seen.
  const wall = (x, z) => x > 300 && x < 400 ? 80 : 0;
  check(sees({x: 0, z: 0}, {x: 250, z: 0}, {heightAt: wall}) && !sees({x: 0, z: 0}, {x: 600, z: 0}, {heightAt: wall}), 'the ground hides what is behind a wall of 80 m');
  const outline = sightOutline({x: 0, z: 0}, {heightAt: wall, range: 1000, rays: 16});
  check(outline.some(point => point.x < -900) && outline.some(point => point.x > 0 && point.x < 330 && Math.abs(point.z) < 100), 'the outline reaches 1 km where it is open and stops at the wall');
  // The names of the holders come from the barricades' own names.
  check(holderOf('ash-men-barricade-1') === 'Ash Men' && holderOf('toll-barricade') === 'Toll', 'the holder is read from the barricade\'s own name');
}

// ---- 4. The ways to a place, from the data -------------------------------------------------------------------------------------------------------
{
  const definition = EVERBURN_JOBS[0], job = createJob(definition), worldJob = {definition, job, actors: []};
  const target = {id: 'tin-town', name: 'Tin Town', ...LAND.at('tin-town')}, car = {x: 0, z: 0, heading: 0};
  const result = worldMapWays({worldJob, car, target});
  const ways = Object.fromEntries(result.ways.map(way => [way.id, way]));
  check(result.ways.length === 4 && result.ways.map(way => way.id).join() === 'east-road,scab-plates,salt-pan,river-bed', "Hot Delivery has the card's four ways, from the yard to Tin Town");
  for (const way of result.ways) {
    check(way.points[0].x === LAND.yard.x && way.points[0].z === LAND.yard.z, `${way.name} starts at the yard`);
    near(way.points.at(-1).x, target.x, .5, `${way.name} ends at Tin Town`);
    near(way.length, pathLength(way.points), 1e-6, `${way.name}: its length is the length of its line`);
    near(way.grounds.reduce((sum, ground) => sum + ground.share, 0), 1, 1e-9, `${way.name}: its grounds add up to the whole`);
  }
  // The East Road is the road (and a few metres to the gate); the scab way is straight, down and up the Steps; the salt way goes by the Pipe; the bed way along the river.
  check(ways['east-road'].length >= EAST_ROAD.length && ways['east-road'].length < EAST_ROAD.length + 100 && ways['east-road'].grounds[0].key === 'road' && ways['east-road'].grounds[0].share > .95, 'the East Road: its own length and all of it road');
  near(ways['scab-plates'].length, Math.hypot(LAND.at('the-steps').x, LAND.at('the-steps').z) + Math.hypot(LAND.at('the-steps').x - target.x, LAND.at('the-steps').z - target.z), 1, 'the scab way: yard to the Steps to Tin Town, straight');
  check(ways['scab-plates'].grounds[0].key === 'scab-plates' && ways['scab-plates'].grounds[0].share > .7, 'the scab way is mostly scab plates');
  check(ways['scab-plates'].length < ways['east-road'].length && ways['east-road'].length < ways['salt-pan'].length, 'the straight way is the shortest and the salt pan way is longer than the East Road');
  check(ways['salt-pan'].crossings.some(crossing => crossing.id === 'the-pipe' && !crossing.under) && !ways['salt-pan'].crossings.some(crossing => crossing.id === 'girder-bridge'), 'the salt pan way crosses the river at the Pipe, not at the bridge');
  check(ways['east-road'].crossings.some(crossing => crossing.id === 'girder-bridge' && crossing.heldBy.join() === 'Ash Men'), 'the East Road crosses at the Girder Bridge, held by the Ash Men');
  check(ways['east-road'].holders.some(holder => holder.who === 'Ash Men' && holder.count === 2), "and has both of the Ash Men's barricades on it");
  check(ways['river-bed'].grounds.some(ground => ground.key === 'river-bed' && ground.share > .1) && ways['river-bed'].crossings.some(crossing => crossing.under), 'the river bed way is partly river bed, and runs under a crossing');
  const furnace = way => way.sights.find(sight => sight.id === 'furnace-skyline')?.metres ?? 0;
  // EVERBURN-REMAKE job 1 (16 November 2026): the furnace stands at its own watch above the Steps and two buttes give cover on the plates, so it
  // sees less than the kilometre of each way it saw from the old skyline: 625 m of the plates way and 649 m of the East Road as the ways are
  // sampled here, 498 m and 633 m by a reviewer's finer 5 m steps. What must hold is that both are watched for a few hundred metres and not for
  // all of their length; the exact figure is the land's and is not pinned.
  check(furnace(ways['scab-plates']) > 300 && furnace(ways['east-road']) > 300, "the furnace at its watch sees a few hundred metres of the scab plates way and of the East Road");
  check(furnace(ways['scab-plates']) < ways['scab-plates'].length / 4, "and the plates way has cover from it for most of its length");
  check(furnace(ways['salt-pan']) === 0 && ways['salt-pan'].sights.some(sight => sight.id === 'ridge' && sight.metres > 1000), "the salt pan is out of the furnace's sight but seen from the Ridge");
  check(furnace(ways['river-bed']) < furnace(ways['scab-plates']), 'the river bed is hidden from the furnace more than the open plates');
  // The words are made from the numbers (not typed): the markup carries each way's length and its ground.
  const markup = waysMarkup(result, 'Tin Town', createKnowledge());
  for (const way of result.ways) check(markup.includes(`${(way.length / 1000).toFixed(1)} km`) && markup.includes(way.name), `the list shows ${way.name} with its length in km`);
  check(/Road 99%/.test(markup) && /Scab plates 8\d%/.test(markup), "the list shows each way's ground as shares worked out from the land");
  // Another job gets the roads and the straight run, from the same data; a job that starts nowhere on a road gets the straight run only.
  const other = roadWay(LAND.at('yard'), LAND.at('boneyard'));
  check(other && pathLength(other) > Math.hypot(LAND.at('boneyard').x, LAND.at('boneyard').z) && pathLength(other) < 1.6 * Math.hypot(LAND.at('boneyard').x, LAND.at('boneyard').z), 'by the roads from the yard to the Boneyard is longer than straight and not much');
  check(roadWay({x: 0, z: 0}, {x: 0, z: 100000}) === null, 'a place far from every road has no way by the roads');
  const generic = worldMapWays({worldJob: {definition: EVERBURN_JOBS[2], job: createJob(EVERBURN_JOBS[2]), actors: []}, car: {x: 0, z: 0, heading: 0}, target: {...LAND.at('boneyard'), id: 'boneyard', name: 'Boneyard'}});
  check(generic.ways.length === 2 && generic.ways[0].name === 'By the roads' && generic.ways[1].name === 'Straight over open ground', 'any other job gets the way by the roads and the straight run');
  check(sliceLine([{x: 0, z: 0}, {x: 100, z: 0}], 20, 70).map(p => p.x).join() === '20,70' && sliceLine([{x: 0, z: 0}, {x: 100, z: 0}], 70, 20)[0].x === 70, 'a stretch of a line can be cut either way round');
  check(nearestOnLine([{x: 0, z: 0}, {x: 100, z: 0}], 30, 40).distance === 40 && groundAlong([{x: 0, z: 0}, {x: 1, z: 0}], {driveAt: () => DRIVE.sand})[0].key === 'sand', 'the nearest point and the ground along a line');
}

// ---- 5. Opening the map changes nothing in a job; the cost of a frame -----------------------------------------------------------------------------
{
  const DT = 1 / 60;
  const make = () => { const duel = new Duel({seed: 11, featureFlags: {'hidden-road': true, arsenal: true}}); duel.state.wastelandGateDiscovered = true;
    assert.ok(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed: 11, opponents: [], job: EVERBURN_JOBS[0]})); return duel; };
  const plain = make(), watched = make(), knowledge = createKnowledge(), rec = recorder();
  let drawMs = 0, draws = 0, bigDraws = 0;
  const snapshot = duel => JSON.stringify(duel.state, (key, value) => typeof value === 'function' ? undefined : value);
  for (let step = 0; step < 900; step++) {
    for (const duel of [plain, watched]) duel.setInput({throttle: duel.state.status === 'racing' ? 1 : 0, brake: 0, steer: step % 240 < 120 ? .15 : -.15, boost: false, interact: false});
    plain.step(DT); watched.step(DT);
    const state = watched.state;
    if (state.arena?.mode !== 'world-job') continue;
    const worldJob = state.arena.worldJob, point = watched.course.worldAt(state.s, state.lateral);
    const model = worldHudModel({worldJob, player: point});
    const frame = worldMapFrame({state, course: watched.course, model, knowledge, picture, canvas: null});
    learn(knowledge, {car: frame.car, ...jobFacts(worldJob), crossings: picture.marks.crossings});
    const began = clock();
    drawSmallMap(rec.context, frame, SMALL_MAP);
    drawMs += clock() - began; draws++;
    if (step % 150 === 0) { drawBigMap(rec.context, {...frame, ways: worldMapWays({worldJob, car: frame.car, target: frame.target}).ways}, {width: 1400, height: 1000}); bigDraws++; }
  }
  check(draws > 500 && bigDraws >= 4, `the maps were drawn ${draws} times and the big map ${bigDraws} times in the run`);
  check(snapshot(plain) === snapshot(watched), 'the same job, run with the maps drawn every frame and the big map opened and shut, is in the very same state as without them');
  const car = worldMapCar(watched.state, watched.course);
  check(car.x !== 0 || car.z !== 0, 'the car was driven off the yard');
  console.log(`the small map: ${draws} draws on a recording canvas, ${(drawMs / draws).toFixed(3)} ms each on average (a recording canvas paints nothing; the browser scenario measures the real cost)`);
}

// ---- 6. Nothing in the map is written as a bare position -----------------------------------------------------------------------------------------
{
  for (const file of ['src/world/scablands-picture.js', 'src/world/scablands-map.js', 'src/world/scablands-ways.js', 'src/world/world-hud.js']) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n').filter(line => !/^\s*\/\//.test(line)).join('\n');
    check(!/place\('[^']+',\s*-?\d+(\.\d+)?,\s*-?\d+/.test(text), `${file}: no place is written with bare numbers`);
    check(!/\bx:\s*-?\d{3,}/.test(text) && !/\bz:\s*-?\d{3,}/.test(text), `${file}: no point is written with a bare three-figure coordinate`);
    check(!/\[\[?\s*-?\d{3,}(\.\d+)?\s*,\s*-?\d{2,}(\.\d+)?\s*\]/.test(text), `${file}: no pair of coordinates is written out`);
  }
  // The ways are written as legs of named things.
  check(HOT_DELIVERY_WAYS.every(way => way.legs.every(leg => Object.values(leg).flat().every(value => typeof value === 'string'))), "Hot Delivery's ways are written from named roads and named points");
  check(WATCH.furnace.range > 0 && WATCH.lookout.range > WATCH.furnace.range, 'the ranges a watcher sees to are set in one place');
}
console.log(`scablands map: ${checks} checks passed (${(clock() - began).toFixed(0)} ms)`);
