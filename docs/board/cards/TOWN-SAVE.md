# TOWN-SAVE

The short board entry controls current state, ownership, dependencies and locks.

`profile.town` as section 9: optional, made on first open and never by loading, unknown names kept, a newer version kept untouched, at most 40 KB. Files: `src/town/town-save.js`, its fixture, `tools/test-town-save.mjs`, and the smallest possible hook in the profile's normalize so the field survives. Prove: an old career with no town loads byte-identical and gains no field; a saved town survives career backup, restore and the 4 MB budget check; a corrupt town never harms the career (it reads as no town, keeps the bad data aside and says so). Writes `tillIn` and `tillOut` to `profile.wasteland.scrap` only here. One independent save review.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
