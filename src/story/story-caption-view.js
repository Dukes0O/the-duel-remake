// The story's caption line (docs/story/kogane-invitation.md section 6): the words of a radio caption, low on the screen, for
// their reading time. Words only: nothing here changes a race, a flight or a save. Browser only; a game with no page does not call it.
// The app keeps the current caption in `app.storyCaption` ({id, text, readMs} or null) and says so with a `storyCaption` event.
export function mountStoryCaption(app, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc?.body) return {dispose() {}};
  const line = doc.createElement('div');
  line.id = 'story-caption';
  line.setAttribute('role', 'status');
  line.hidden = true;
  Object.assign(line.style, {position: 'fixed', left: '50%', bottom: '9%', transform: 'translateX(-50%)', maxWidth: 'min(720px, 90vw)',
    padding: '10px 16px', background: 'rgba(8, 10, 14, .82)', color: '#f4f1e8', font: '600 17px/1.35 system-ui, sans-serif',
    borderRadius: '6px', textAlign: 'center', zIndex: '40', pointerEvents: 'none'});
  doc.body.append(line);
  const draw = () => {
    const caption = app.storyCaption;
    line.hidden = !caption;
    line.textContent = caption ? caption.text : '';
  };
  const stop = app.duel.onChange((state, event) => { if (event && Object.hasOwn(event, 'storyCaption')) draw(); });
  draw();
  return {dispose() { stop(); line.remove(); }};
}
