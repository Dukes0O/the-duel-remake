// Brian's four painted faces for the classroom panel (public/assets/lab/, made 11 November 2026; see CREDITS.md there).
// The classroom gives Brian a mood (talk, cheer, hint, explain) on the portrait's data-mood; classroom.css shows the
// picture that matches it. All four are asked for when the classroom opens, so a change of mood never shows a blank.
// A picture that is missing or fails to load leaves the letter B that sits behind them.
export const BRIAN_FACES = {
  talk: '/assets/lab/brian-talk.jpg',
  cheer: '/assets/lab/brian-cheer.jpg',
  hint: '/assets/lab/brian-hint.jpg',
  explain: '/assets/lab/brian-explain.jpg',
};

export function mountBrianFaces(portrait) {
  const doc = portrait.ownerDocument;
  for (const [mood, url] of Object.entries(BRIAN_FACES)) {
    const face = doc.createElement('img');
    face.className = 'lc-face';
    face.alt = '';
    face.dataset.face = mood;
    face.addEventListener('load', () => face.classList.add('ready'));
    face.addEventListener('error', () => face.remove());
    face.src = url;
    portrait.append(face);
  }
}
