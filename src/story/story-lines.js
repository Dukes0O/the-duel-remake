// The Kogane Invitation's words (docs/story/kogane-invitation.md section 6): ten
// captions and one letter, word for word. Every new line is a caption with the
// radio sound, so no voice file is needed and no new sound cue. Where a recorded
// line already fits, the story reuses it (STORY_REUSED_LINES). Words only:
// nothing here changes a race, a flight or a save.

// "At dusk" or "in the evening" (Kyle's 29 October note): the delivery happens at
// dusk only if the helicopter's scene can take dusk light. The delivery card
// reports which, and this one constant is the only place to change the wording.
export const DELIVERY_TIME_WORDS = 'at dusk';
export const DELIVERY_TIME_WORDS_ALTERNATIVE = 'in the evening';

// Reading time on screen (section 6): 2.5 seconds plus 0.045 seconds a character, at most 10 seconds.
export const CAPTION_READ_BASE_MS = 2500;
export const CAPTION_READ_PER_CHARACTER_MS = 45;
export const CAPTION_READ_MAX_MS = 10000;
// The longest a caption may be (a rule of the card; the shortest ones are well under).
export const CAPTION_MAX_CHARACTERS = 260;

const line = (who, where, text) => Object.freeze({who, where, text, captionOnly: true});

// Section 6.1. Ids are the contract of section 12.1 (`story.kogane.*`).
export const STORY_CAPTIONS = Object.freeze({
  'story.kogane.brian.intro': line('Brian', 'A note on the lesson\'s opening card (text only, so it does not talk over his recorded intro)',
    'Daichi Mori sent word. His road has four hairpins, and the brake boards are your friends. We will learn two of them first, while there is still some light.'),
  'story.kogane.brian.pass': line('Brian', 'After the Kogane lesson is passed',
    'That was clean. Daichi will be pleased. Tell Roger at the helipad you are ready, because the tea house needs a delivery.'),
  'story.kogane.roger.offer': line('Roger, the dispatcher', 'The text on the pinned job; also shown as a caption when you take it',
    'Kestrel One, the tea house on Kogane Pass is out of tyres and tea. Daichi\'s Skyline is too heavy for our hook, so he wants a crate instead. Can you fly it up?'),
  'story.kogane.daichi.thanks': line('Daichi', 'When the crate is set down',
    'Tyres and tea, right on time! Thank you, Kestrel One. The road is empty tonight. Come and race me down it.'),
  'story.kogane.daichi.grid': line('Daichi', 'At the start of the Night Duel (race callout)',
    'Four hairpins, one road. Brake at the board, turn in late, and get on the power early. See you at the bottom.'),
  'story.kogane.daichi.win': line('Daichi', 'Results, you won',
    'You braked later than me and stayed clean. The Skyline is yours. Look after her.'),
  'story.kogane.daichi.owned': line('Daichi', 'Results, you won but already own a Skyline',
    'You already have a Skyline? Then keep it shiny. The road is yours whenever you want it.'),
  'story.kogane.daichi.lose': line('Daichi', 'Results, you lost',
    'Good run. The mountain will wait for you. Come back and try again whenever you like.'),
  'story.kogane.ana.call': line('Ana', 'The next time the main menu opens after the win',
    'Hello, it\'s Ana, from the field station! Congratulations on the Skyline. Roger sent me the pictures from your flight. In the clear water by the red gate, there is a long, dark shape on the lake bed.'),
  'story.kogane.ana.lead': line('Ana', 'Straight after her first line',
    'I do not know what it is yet. I have written it in my log as a lead. One day we might dive it. Keep your eyes open.'),
});

// Ana's two lines play one after the other (the second "straight after" the first).
export const STORY_ANA_SEQUENCE = Object.freeze(['story.kogane.ana.call', 'story.kogane.ana.lead']);

// The letter on the Story card (never spoken, never recorded).
export const STORY_LETTER_ID = 'story.kogane.letter';
export const STORY_LETTER = Object.freeze({
  id: STORY_LETTER_ID,
  who: 'Daichi (a letter, never spoken)',
  where: 'The Story card, first thing',
  spoken: false,
  text: 'Dear driver, I am Daichi Mori. I drive Kogane Pass at night in my blue Skyline. I heard you bought the road, '
    + 'so you must love hairpins as much as I do. Come and race me down the mountain! But first learn to brake at the board. '
    + 'Brian will teach you. Then the tea house at the top needs a crate of tyres and tea, and the road is too steep for the truck. '
    + 'Kestrel One can fly it up. After that, the night is ours. Daichi',
});

// Section 6.2: recorded lines the story reuses (no new voice). Ids exist in
// DRIVE_RADIO_LINES (the driving lessons' radio file) or HELI_RADIO_LINES (the helicopter's radio file). `then` is the caption that follows the recorded line.
export const STORY_REUSED_LINES = Object.freeze([
  Object.freeze({moment: 'The lesson opens, and each run', voice: 'Brian', ids: Object.freeze([
    'drive.radio.v2.corner.intro', 'drive.radio.v2.shared.watch', 'drive.radio.v2.shared.follow',
    'drive.radio.v2.shared.your-turn', 'drive.radio.v2.shared.beat',
    'drive.radio.v2.shared.late', 'drive.radio.v2.shared.early', 'drive.radio.v2.shared.fast',
    'drive.radio.v2.shared.slid', 'drive.radio.v2.shared.off'])}),
  // Only if the lesson reward is new; if it was already taken the caption brian.pass plays alone.
  Object.freeze({moment: 'The lesson is passed', voice: 'Brian', ids: Object.freeze(['drive.radio.v2.corner.pass']),
    onlyIfRewardIsNew: true, then: 'story.kogane.brian.pass'}),
  Object.freeze({moment: 'You take the job', voice: 'Brian', ids: Object.freeze(['heli.radio.job.taken'])}),
  Object.freeze({moment: 'You arrive at Kogane', voice: 'Brian', ids: Object.freeze(['heli.radio.arrived'])}),
  Object.freeze({moment: 'Hard landing, drop, cargo knock, crash', voice: 'Brian', ids: Object.freeze([
    'heli.radio.landing.hard', 'heli.radio.drop', 'heli.radio.cargo.hit', 'heli.radio.crash'])}),
  Object.freeze({moment: 'The crate is down', voice: 'Brian', ids: Object.freeze(['heli.radio.job.done']),
    then: 'story.kogane.daichi.thanks'}),
]);

// How long a caption stays on screen, in milliseconds (section 6).
export function captionReadMs(text) {
  const length = typeof text === 'string' ? text.length : 0;
  return Math.min(CAPTION_READ_MAX_MS, Math.round(CAPTION_READ_BASE_MS + CAPTION_READ_PER_CHARACTER_MS * length));
}

// The words for a caption id, or null (the letter is not a caption).
export function captionText(id) {
  return Object.hasOwn(STORY_CAPTIONS, id) ? STORY_CAPTIONS[id].text : null;
}

// Every id the story owns: the ten captions and the letter.
export const STORY_LINE_IDS = Object.freeze([...Object.keys(STORY_CAPTIONS), STORY_LETTER_ID]);
