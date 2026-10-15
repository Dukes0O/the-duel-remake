// A burnt course on the course menu (docs/HELI_FIRE.md sections 8.1 and 8.2).
import assert from 'node:assert/strict';
import {courseAccessPanel} from '../src/course-access-ui.js';
import {createCourseActions} from '../src/screen-courses.js';
import {createProfile} from '../src/progression.js';

let checks = 0;
const check = (ok, label) => { assert.ok(ok, label); checks++; };
const same = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
const heli = (count, burnt) => ({version: 1, fuelKg: 0, lessons: {liftoff: true, hover: true, landing: true, carry: true},
  playDay: {last: '2026-10-20', count}, jobs: {day: 0, taken: null, done: []}, carsAt: {}, refuels: 0, flights: 0, burnt});
const owner = (credits, count, burnt) => {
  const profile = createProfile();
  return {...profile, credits, courses: {...profile.courses, unlocked: [...new Set([...(profile.courses?.unlocked ?? []), 'tremblant-woods'])]},
    heli: heli(count, burnt)};
};
const cardOf = (markup, name) => {
  const start = markup.lastIndexOf('<article', markup.indexOf(`<h3>${name}</h3>`));
  return markup.slice(start, markup.indexOf('</article>', start) + 10);
};
const burnt = {'tremblant-woods': {day: 4, boughtBack: false}};

// Switch off: the menu is exactly as before, whatever the save says.
{
  const profile = owner(9000, 7, burnt), plain = owner(9000, 7, {});
  same(courseAccessPanel(profile, 0, ''), courseAccessPanel(plain, 0, ''), 'switch off: a burnt save draws the same menu');
  same(courseAccessPanel(profile, 0, '', {forestFire: false}), courseAccessPanel(plain, 0, ''), 'switch off when passed');
  same(courseAccessPanel(plain, 0, '', {forestFire: true}), courseAccessPanel(plain, 0, ''), 'switch on, nothing burnt: the same menu');
  check(!courseAccessPanel(profile, 0, '').includes('course-burnt'), 'no soot with the switch off');
}

// Switch on, closed: soot, days left, the price and the button.
{
  const markup = courseAccessPanel(owner(9000, 7, burnt), 0, '', {forestFire: true});
  const card = cardOf(markup, 'Tremblant Woods');
  check(/class="course-access-card[^"]*course-burnt"/.test(card), 'the card is darkened with soot');
  check(card.includes('>CLOSED<'), 'labelled closed');
  check(card.includes('Closed: burnt in a forest fire.') && card.includes('Reopens in 7 play days.'), 'the closed lines');
  check(card.includes('data-course-buyback="tremblant-woods"') && card.includes('BUY BACK · 7,000 CR'), 'the buyback button at 7,000');
  check(!card.includes('data-course-select'), 'a closed course cannot be selected');
  const snow = cardOf(markup, 'Tremblant Snow'), plainSnow = cardOf(courseAccessPanel(owner(9000, 7, {}), 0, ''), 'Tremblant Snow');
  same(snow, plainSnow, 'Tremblant Snow stays as it is');
}

// Short of the price: the button is disabled and says how much is missing.
{
  const card = cardOf(courseAccessPanel(owner(6550, 7, burnt), 0, '', {forestFire: true}), 'Tremblant Woods');
  check(!card.includes('data-course-buyback') && card.includes('disabled') && card.includes('BUY BACK · 7,000 CR'), 'disabled when short');
  check(card.includes('You need 450 more credits.'), 'says what is missing');
  const one = cardOf(courseAccessPanel(owner(999, 13, burnt), 0, '', {forestFire: true}), 'Tremblant Woods');
  check(one.includes('Reopens in 1 play day.') && one.includes('You need 1 more credit.') && one.includes('you need 1 more credit"'), 'singular day and credit, also for screen readers');
}

// Reopening day and later.
{
  const reopened = cardOf(courseAccessPanel(owner(0, 14, burnt), 0, '', {forestFire: true}), 'Tremblant Woods');
  check(reopened.includes('Reopened after the fire.') && reopened.includes('data-course-select="tremblant-woods"'), 'reopened by itself on day 10');
  check(!/class="course-access-card[^"]*course-burnt"/.test(reopened), 'no soot once open');
  const later = cardOf(courseAccessPanel(owner(0, 15, burnt), 0, '', {forestFire: true}), 'Tremblant Woods');
  same(later, cardOf(courseAccessPanel(owner(0, 15, {}), 0, ''), 'Tremblant Woods'), 'the day after, a normal card');
  const bought = cardOf(courseAccessPanel(owner(0, 7, {'tremblant-woods': {day: 4, boughtBack: true}}), 0, '', {forestFire: true}), 'Tremblant Woods');
  check(bought.includes('data-course-select="tremblant-woods"') && !bought.includes('Reopened'), 'bought back: a normal card');
}

// The buyback button goes through the app, only on the menu.
{
  let message = '', redraws = 0, bought = null;
  const app = {duel: {state: {status: 'menu'}}, buyBackCourse: id => { bought = id; return {ok: true}; }};
  const actions = createCourseActions({app, choices: {}, setMessage: value => message = value, setOpen: () => {}, updateMenuScene: () => {},
    invalidate: () => {}, renderState: () => redraws++});
  check(actions.handle({dataset: {courseBuyback: 'tremblant-woods'}}), 'the button is handled');
  same([bought, message, redraws], ['tremblant-woods', 'Bought back. Tremblant Woods is open again.', 1], 'bought back through the app, naming the course');
  app.buyBackCourse = () => ({ok: false, reason: 'You need 450 more credits.'});
  actions.handle({dataset: {courseBuyback: 'tremblant-woods'}});
  same(message, 'You need 450 more credits.', 'a refusal is shown');
  app.duel.state.status = 'racing'; bought = null;
  app.buyBackCourse = id => { bought = id; return {ok: true}; };
  actions.handle({dataset: {courseBuyback: 'tremblant-woods'}});
  same(bought, null, 'never during a race');
  const bare = createCourseActions({app: {duel: {state: {status: 'menu'}}}, choices: {}, setMessage: value => message = value, setOpen: () => {},
    updateMenuScene: () => {}, invalidate: () => {}, renderState: () => {}});
  bare.handle({dataset: {courseBuyback: 'tremblant-woods'}});
  same(message, 'Forest fires are not available yet.', 'an app without the hook refuses');
}

console.log(`Fire close: ${checks} checks passed.`);
