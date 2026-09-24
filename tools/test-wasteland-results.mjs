import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createResultsScreen} from '../src/screen-results.js';
import {createProfile} from '../src/progression.js';

const profile = createProfile();
const render = createResultsScreen({app: {runId: 'run', profileSaved: true},
  profile: () => profile, credits: value => String(value),
  escapeHTML: value => String(value), time: value => String(value), arrow: ''});
const state = result => ({status: 'stage_result', stageIndex: 0,
  stageTimeSec: 180, cpuDifficulty: 'easy', difficulty: 'casual', mode: 'wasteland',
  results: {won: true, completed: true, timeSec: 180, best: 180,
    personalBestStatus: 'baseline', creditReward: 0, winStreak: 0, ...result}});

test('post-gate result shows scrap and avoids a false credit payout', () => {
  const html = render(state({scrapEarned: 200, scrapBalance: 400}));
  assert.match(html, /SCRAP EARNED/);
  assert.match(html, /\+200/);
  assert.doesNotMatch(html, /CREDITS EARNED|car-best bonus|Completed race credits/);
});

test('older combat result still shows its credit payout', () => {
  const html = render(state({creditReward: 600}));
  assert.match(html, /CREDITS EARNED/);
  assert.doesNotMatch(html, /SCRAP EARNED/);
});

test('completed Wasteland loss does not claim a credit charge', () => {
  const html = render(state({won: false, scrapEarned: 80, scrapBalance: 80}));
  assert.doesNotMatch(html, /loss charge|down to zero credits/);
  assert.match(html, /SCRAP EARNED/);
});

test('a racing streak does not promise a scrap-career streak bonus', () => {
  const html = render(state({won: true, winStreak: 3, scrapEarned: 200, scrapBalance: 200}));
  assert.doesNotMatch(html, /Streak bonus earned/);
  assert.match(html, /SCRAP EARNED/);
});
