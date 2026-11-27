# OPEN-TALK-CHOICES

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Cut by Claude on 27 November 2026 from the Flag's scenario fix (Opus session): in the shared
storyline part a beat's choices stay hidden until every question has been asked.

## Why

`src/world/open/parts/threads.js` (the question talk) opens a beat's choices only when no question is left. The design
says the opposite (`docs/story/open-scablands.md`, the storyline's talks): "You may ask before you choose. Asking costs
nothing." A player who knows what to do must not be made to ask every question first. It touches every beat with both
questions and choices: the Flag's site and schedule, the burned camp's grey-pen and home, and others.

## What to build

The choices are offered from the start of the talk, beside the questions; a question asked stays answered; a choice
made ends the talk as now. Bring every storyline suite and scenario that relied on asking first up to date, and say in
the change note which ones changed and why.

## Files and locks

`src/world/open/parts/threads.js` (the question talk only), the storyline suites and scenarios that depend on the
order. No lock.

## Checks

A check without graphics that a beat with questions offers its choices before any question is asked; every
`tools/test-open-*.mjs` storyline suite; `test-burned-camp`; rule 23's set and `npm run build`. Laptop: Claude runs the
storyline scenarios.

## Rules

Behind `story-choices`. Do not change any word a player reads. Write `docs/changes/OPEN-TALK-CHOICES.md` with a
**Removed** line. After the pull request is open the card is finished.
