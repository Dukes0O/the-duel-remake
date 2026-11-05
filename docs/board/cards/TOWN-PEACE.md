# TOWN-PEACE

The short board entry controls current state, ownership, dependencies and locks.

Story section 5, as data and jobs: each warlord's short job, the choice (peace or drive off), what peace gives, who turns up later. Magnus's bigger-magnet disaster (his crane takes your tin roofs, chase him down). The ladder and every existing warlord fight stay exactly as they are; peace jobs use new job data in `town-jobs.js` and the warlord's look. Lines are in the story; write short extra ones in that voice for Claude to review. `tools/test-town-peace.mjs`, Easy proof.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
