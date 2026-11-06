# SKIN-WASTE

The short board entry controls current state, ownership, dependencies and locks.

Eight new paint finishes in `src/paint-presets.js`, appearance values only: Rust Patina, Salt Bleach, Desert Sand, Boneyard Silver, Scrap Patchwork, Bowl Flame, Soot Black and Hazard Stripe. Each must look gritty on the Titan, the rally car and a supercar. Priced in scrap, shown only with `wasteland-town` on. Check the existing paint tests still pass unchanged. Make a comparison sheet in Blender per `tools/blender/kit-sheet.py` for Claude to judge. Ember stays Tin Town's own.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

The eight presets use 250 scrap each, and the paint API will expose them only
when `wastelandTownEnabled` is true for a discovered Wasteland career. The
card names only `src/paint-presets.js`, but the current paint test hard-codes
an 11-entry catalog and the garage click handler indexes that catalog for
labels. Those callers need a deliberate follow-up before this feature is
merge-ready; do not loosen the test or add files outside this card's scope.

## Claude's verdict

Round 1 does not pass (Claude, 5 November 2026). These are eight flat colours. The card asks for gritty finishes and they are not: Scrap Patchwork shows no patches, Hazard Stripe has no stripes, and Rust Patina is plain brown. The code can merge because the finishes stay behind the development switch, but this card stays open. Round 2 must find how the paint can carry real wear. Read how the car renderer applies paint first. If paint values alone cannot show rust, patches or stripes, say so on this card with what small renderer hook would.
