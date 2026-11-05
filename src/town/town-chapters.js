import {ACT1_CHAPTERS} from './content/chapters-act1.js';
import {townCaptionText} from './content/lines.js';

function valueAt(root, path) {
  return path.split('.').reduce((value, key) => value == null ? undefined : value[key], root);
}

export function chapterConditionMet(town, condition) {
  if (!condition || typeof condition.path !== 'string') return false;
  const actual = valueAt(town, condition.path);
  if (Object.hasOwn(condition, 'equals')) return actual === condition.equals;
  if (Object.hasOwn(condition, 'atLeast')) return Number.isFinite(actual) && actual >= condition.atLeast;
  if (Object.hasOwn(condition, 'truthy')) return condition.truthy ? Boolean(actual) : !actual;
  return actual === true;
}

function validChapter(chapter) {
  return chapter && typeof chapter.id === 'string' && chapter.id.length > 0
    && typeof chapter.next === 'string' && chapter.next.trim().length > 0
    && Array.isArray(chapter.lineIds) && chapter.lineIds.length > 0;
}

export function getTownNext(town, chapters = ACT1_CHAPTERS) {
  if (!town || typeof town !== 'object' || !Array.isArray(chapters)) throw new TypeError('Town chapters need a town and a chapter list.');
  const urgent = town.urgentNext;
  if (typeof urgent === 'string' && urgent.trim()) return Object.freeze({chapter:null, sentence:urgent.trim(), mapTarget:town.urgentMapTarget ?? null});
  const active = chapters.find(chapter => validChapter(chapter)
    && chapterConditionMet(town, chapter.when)
    && town.story?.completed?.[chapter.id] !== true);
  if (active) return Object.freeze({chapter:active, sentence:active.next, mapTarget:active.mapTarget ?? null});
  const underWay = town.underWay;
  const sentence = typeof underWay === 'string' && underWay.trim() ? underWay.trim()
      : 'Keep the town going. There is always more to build.';
  return Object.freeze({chapter:null, sentence, mapTarget:null});
}

export function getTownChapterLines(town, chapter) {
  if (!chapter || !Array.isArray(chapter.lineIds)) return [];
  return chapter.lineIds.map(id => Object.freeze({id, text:townCaptionText(id, town)}));
}

export {ACT1_CHAPTERS};
