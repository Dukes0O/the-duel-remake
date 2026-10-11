import assert from 'node:assert/strict';
import test from 'node:test';
import { Course } from '../src/course.js';
import { TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { buildTrackScript } from '../src/track-script.js';
import { GRAND_PRIX_COURSES, grandPrixCourse } from '../src/race-field.js';
import { racingLineFor, buildSpeedProfile } from '../src/race-lines.js';
import { CARS } from '../src/config.js';
import { runRace } from './race-field-balance.mjs';

// Tremblant Woods as a finished Grand Prix circuit (card P4-TREMBLANT,
// docs/CIRCUITS.md 5.3). The road layouts have their own suite
// (test-circuit-layouts.mjs); this checks what the card adds.
const road = buildTrackScript(TREMBLANT_WOODS);
const crestCentre = item => (item.s0 + item.s1) / 2;
const timber = road.pieces.filter(item => item.name === 'Timber Straight');

test('Tremblant Woods races with the full field', () => {
  assert.ok(GRAND_PRIX_COURSES.includes('tremblant-woods'));
  assert.ok(grandPrixCourse(TREMBLANT_WOODS));
  assert.equal(grandPrixCourse({ id: 'eifel-crown' }), false);
  assert.equal(TREMBLANT_WOODS.closed, true);
  assert.equal(TREMBLANT_WOODS.laps, 3);
});

test('Timber Straight has its two crests, the second where the chairlift crosses', () => {
  assert.deepEqual(timber.map(item => item.crest), [1.5, 2.5, 0]);
  // The Team Room flag for the chairlift (Claude's intel) is at s 2700.
  const flag = TREMBLANT_WOODS.intel.flags.find(item => item.id === 'chairlift');
  assert.ok(Math.abs(crestCentre(timber[1]) - flag.s) < 20, `second crest at ${crestCentre(timber[1]).toFixed(0)}, chairlift flag at ${flag.s}`);
  // The two crests are well apart: a car lands before it meets the second.
  assert.ok(crestCentre(timber[1]) - crestCentre(timber[0]) > 400);
});

test('the racing line shares out the swing between Pine Drop and Lakeside Plunge', () => {
  const course = new Course(TREMBLANT_WOODS, 1989), line = course.racingLine;
  const drop = road.pieces.find(item => item.name === 'Pine Drop'), plunge = road.pieces.find(item => item.name === 'Lakeside Plunge');
  let steepest = 0;
  for (let s = drop.s0 - 40; s < plunge.s1 + 40; s += 2) steepest = Math.max(steepest, Math.abs(line.offsetAt(s + 2) - line.offsetAt(s)) / 2);
  // maxSlope limits the average between two keys; the eased blend peaks at 1.5 times that.
  assert.ok(steepest <= TREMBLANT_WOODS.racingLine.maxSlope * 1.5 + .005, `line moves ${steepest.toFixed(3)} m across per metre`);
  const edge = Math.max(...Array.from({ length: 400 }, (_, i) => Math.abs(line.offsetAt(i * 11))));
  assert.ok(edge <= (road.halfWidthAt(0) - 1.5) * TREMBLANT_WOODS.racingLine.roadShare + 1e-6, 'the line keeps clear of the kerbs');
});

test('computer racers hold their speed down over the Pine Drop crest, and may fly on the straights', () => {
  const course = new Course(TREMBLANT_WOODS, 1989), profile = buildSpeedProfile(racingLineFor(course), CARS.falcone_f42, { cornerFactor: 1, topFactor: 1 });
  const drop = road.pieces.find(item => item.name === 'Pine Drop');
  const atDrop = Math.min(...Array.from({ length: 20 }, (_, i) => profile.at(crestCentre(drop) - 20 + i * 2)));
  assert.ok(atDrop < 95, `${atDrop.toFixed(0)} mph over the Pine Drop crest`);
  // On the straight the second Timber crest is no limit: the profile there is the top speed.
  assert.ok(profile.at(crestCentre(timber[1])) > profile.topMph * .97);
});

test('a Grand Prix on Tremblant Woods starts eight cars and brings every computer racer home', () => {
  const race = runRace('medium', 0, { course: 'tremblant-woods', maxSec: 400 });
  assert.equal(race.racers, 7);
  assert.equal(race.finished, 7, 'every computer racer finishes');
  assert.equal(race.lapTimes.length, 3);
});
