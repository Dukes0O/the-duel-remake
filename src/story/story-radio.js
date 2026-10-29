// The story's radio (docs/story/kogane-invitation.md section 6): a caption plays
// as the radio keys on (the click and hiss of src/lessons/radio-voice.js), the
// words show, and the radio keys off. No voice file and no new sound. The radio
// always keys off when the caption ends, when the player leaves the screen,
// pauses or mutes. Sound and words only: nothing here changes a race or a flight.
import {captionReadMs, captionText, STORY_ANA_SEQUENCE} from './story-lines.js';

// How long the radio stays keyed for a caption: a short transmission, never
// longer than the caption itself. The words stay on screen for the reading time.
export const STORY_RADIO_HOLD_MS = 1200;

// Settings (all supplied by the game, so tests need no browser):
//   getChain()  the radio chain (createRadioChain) or null when audio has not started
//   show(id, text, readMs)  put the words on screen
//   hide(id)    take the words off screen
//   isMuted()   true when sound is muted; the words still show, the radio stays off
//   schedule / cancel  timers (setTimeout and clearTimeout by default)
export function createStoryRadio({getChain = () => null, show = () => {}, hide = () => {}, isMuted = () => false,
  schedule = (callback, ms) => setTimeout(callback, ms), cancel = handle => clearTimeout(handle)} = {}) {
  let current = null, queue = [], offTimer = null, endTimer = null, disposed = false;

  function keyOff() {
    if (offTimer !== null) { cancel(offTimer); offTimer = null; }
    const chain = current?.chain;
    if (current) current.chain = null;
    if (chain) chain.keyOff();
  }
  function finish() {
    if (!current) return;
    keyOff();
    if (endTimer !== null) { cancel(endTimer); endTimer = null; }
    const id = current.id;
    current = null;
    hide(id);
  }
  function startNext() {
    const id = queue.shift();
    if (id === undefined || disposed) return;
    const text = captionText(id);
    if (text === null) { startNext(); return; }
    const readMs = captionReadMs(text);
    const chain = isMuted() ? null : getChain();
    current = {id, chain: chain && chain.keyOn() ? chain : null};
    show(id, text, readMs);
    if (current.chain) offTimer = schedule(() => { offTimer = null; keyOff(); }, Math.min(STORY_RADIO_HOLD_MS, readMs));
    endTimer = schedule(() => { endTimer = null; finish(); startNext(); }, readMs);
  }

  // Play one caption now; it replaces whatever is playing. The letter is never spoken.
  function say(id) {
    if (disposed || captionText(id) === null) return false;
    finish();
    queue = [id];
    startNext();
    return true;
  }
  // Play several in order, each straight after the last one ends.
  function sayInOrder(ids) {
    if (disposed || !ids.length || ids.some(id => captionText(id) === null)) return false;
    finish();
    queue = [...ids];
    startNext();
    return true;
  }
  // Stop at once: the radio keys off, the words go and nothing waits in line.
  function stop() {
    queue = [];
    finish();
  }
  // Leaving the screen, pausing and muting all stop the caption and key the radio off.
  const leave = stop, pause = stop;
  function mute() {
    // The words may stay for their reading time; the sound must not.
    queue = [];
    keyOff();
  }
  function dispose() {
    stop();
    disposed = true;
  }
  return {say, sayInOrder, sayAna: () => sayInOrder(STORY_ANA_SEQUENCE), stop, leave, pause, mute, dispose,
    get playing() { return current ? current.id : null; }, get keyed() { return !!current?.chain; }};
}
