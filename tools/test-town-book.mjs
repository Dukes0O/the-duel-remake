import assert from 'node:assert/strict';
import {createTown, serializeTown, deserializeTown, stepTown, townBookPages, TOWN_TIME} from '../src/town/index.js';
import {TOWN_BOOK_FORMS} from '../src/town/content/book-text.js';

const town = createTown(94021, 'Dry Creek', Array.from({length:12},(_,index)=>({name:`Founder ${index + 1}`})));
const year = BigInt(TOWN_TIME.ticksPerDay * TOWN_TIME.daysPerMonth * TOWN_TIME.monthsPerYear);
for (let tick = 0; tick < Number(year * 30n - 1n); tick++) stepTown(town);

const pages = townBookPages(town);
assert.equal(pages.length, 30);
assert.match(pages[0].text, /Founder 1/);
assert.match(pages[0].text, /Founder 12/);
assert.ok(pages.slice(1).every((page,index)=>page.year === BigInt(index + 2)));
assert.ok(pages.slice(1).every(page=>page.text.length > 0 && !page.text.includes('—')));
assert.ok(TOWN_BOOK_FORMS.length >= 60);
assert.ok(town.bookPages.every(page=>page.text.length < 500));
assert.notEqual(pages[1].entries, town.bookPages[1].entries);
pages[1].entries.push('changed');
assert.ok(!town.bookPages[1].entries.includes('changed'));

const loaded = deserializeTown(serializeTown(town));
assert.deepEqual(townBookPages(loaded), townBookPages(town));
const duplicate = createTown(94021, 'Dry Creek', Array.from({length:12},(_,index)=>({name:`Founder ${index + 1}`})));
for (let tick = 0; tick < Number(year * 30n - 1n); tick++) stepTown(duplicate);
assert.deepEqual(townBookPages(duplicate), townBookPages(town));
console.log('TOWN-BOOK passed: thirty years, founder page, short annual pages, saved history, and repeatable output.');
