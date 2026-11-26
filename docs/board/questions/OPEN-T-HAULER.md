# OPEN-T-HAULER

## Codex decided (Claude to review)

- The authored words stay unchanged. The story page explicitly leaves goods sales to a later trade card. Tally brings news and a tow here.
- Add small hooks in `parts/threads.js`, `thread-rule.js`, `signs.js`, `scenes/burned-camp.js`, `sign-view.js`, `parts/people.js`, `talk-threads.js`, `parts/checkpoints.js`, `checkpoint-rule.js`, and the road-rider adapter. The existing runner has no driving choices, timed repairs, repeated physical signs, or escort target. These hooks are needed to play the unchanged beats. They change no save shape or released course.
- Keep Hauler geometry and driving rules in `content/stranded-hauler-places.js`. Choose a trader checkpoint by a named seed draw, reserve its encounter, then choose a different road for the second truck. Follow its road to the nearest junction for the escort. The page's two kilometres and four minutes are approximate; the actual junction determines distance.
- Reuse Marigold for Tally, the Road Rat figures, and the game's truck and cart pieces. Patience needs her own later art pass. The slag lookout uses the existing ground; climbing and being seen require being on foot.
- The gate beat stays open for questions until the player leaves it. Later visits use the same authored questions and later lines every third banked dawn. The one-gate choice removes one Road Rat from checkpoint draws.
- Cancellation discards an attempt. A wreck during a mission resolves its authored loss first, then the existing open-land recovery runs. Patience's tow settles her existing debt and requests the existing car recovery at the gate.
- The added files `content/talk-hauler.js` and `looks/stranded-hauler-look.js` keep the dialogue adapter and the truck pieces separate from the authored words. `world-job.js` only grounds parked rider cars and dispatches mission moment cues. No save file or save shape changes.
- `world-hud.js` keeps the escort's current tyre count on screen as a whole sentence. The native rider adapter aims ahead while beside the cart, so a thief follows it instead of circling a point behind its own car.
