// How much Brian says at once (docs/board/cards/LAB-BRIAN-SHORT.md). His newest words are at most three
// sentences; the rest of a text waits behind "Tell me more". Pure text, no DOM and no saves.

// A lesson puts MORE in a text where the opening ends. Everything after it waits behind "Tell me more".
export const MORE = '\n';
export const OPENING_SENTENCES = 3;
// The opening is about 45 words; the test allows this many before it fails.
export const OPENING_WORDS = 60;

// A sentence ends at a full stop, a question mark or an exclamation mark that is followed by a space. "9.81" and "m/s²" stay whole.
const SENTENCE_END = /(?<=[.?!][”’"')\]]*)\s+/;
export const sentences = text => String(text ?? '').trim().split(SENTENCE_END).filter(Boolean);
export const wordCount = text => String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
// The whole text as one paragraph, for an opened step and for anything that reads Brian's words in full.
export const fullText = text => String(text ?? '').split(MORE).map(part => part.trim()).filter(Boolean).join(' ');
export const firstSentence = text => sentences(fullText(text))[0] ?? '';

// {opening, more}: the opening is what Brian says first. A text with no MORE mark, or with a long opening, is cut after three sentences,
// so the screen never shows more than three at once, whatever a lesson builds.
export function splitSay(text) {
  const [head = '', ...tail] = String(text ?? '').split(MORE);
  const list = sentences(head);
  return {opening: list.slice(0, OPENING_SENTENCES).join(' '), more: [...list.slice(OPENING_SENTENCES), ...tail.map(part => part.trim()).filter(Boolean)].join(' ')};
}
// A whole text as short paragraphs: the opening, then the rest three sentences at a time, so an opened text is never one block.
export function paragraphs(text) {
  const {opening, more} = splitSay(text), rest = sentences(more), out = opening ? [opening] : [];
  for (let i = 0; i < rest.length; i += OPENING_SENTENCES) out.push(rest.slice(i, i + OPENING_SENTENCES).join(' '));
  return out;
}
