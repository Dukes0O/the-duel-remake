# FOOT-05: Longhorn RPG and wrench

## Change

- Added the shared Longhorn RPG and wrench to flagged Wasteland races. On foot, key 1 selects the RPG and key 2 selects the wrench. Key 3 remains open for later signature gear. Car weapons cannot fire while the fighter is out.
- Each race stage starts with three rockets. Remaining rockets persist when the fighter gets back into the same car, and the stage clock continues to run during the 2.2 second reload. A rocket travels at 55 m/s. Holding aim on a car for 0.8 seconds locks the next shot onto it. A direct hit removes 35 armor, nearby blast removes 20, and a direct armor hit records the existing 40 Notoriety XP event.
- Holding fire with the wrench near your car restores up to 40 armor over four seconds. A hit to the fighter or car interrupts the repair; releasing fire permits another attempt. Repairing does not pause the race clock.
- The on-foot HUD shows gear, ammo, aim lock, reload and repair progress. Its reticle changes color on a lock. The rocket uses the existing pooled projectile visuals and blast effects.

## Decisions

- Rocket ammo resets at each stage and is retained across exits within that stage. The reload clock also survives getting back in.
- A shot takes one fresh fire press. Holding fire through reload does not launch another rocket.
- The lock uses a 10 degree aim cone and 220 m range. A locked rocket turns at up to 1.5 radians per second and expires after four seconds. Blast radius is 8 m. These values are in `src/wasteland-tuning.js` for balance passes.
- Wrench work requires staying within 3.5 m of the car. An interrupted or completed repair needs a fire release before a new repair starts.

## Checks

- Focused mechanics and adjacent checks: `node --test tools/test-onfoot-weapons.mjs tools/test-onfoot-transition.mjs tools/test-onfoot-race.mjs tools/test-combat-projectiles.mjs tools/test-combat-hud.mjs` passed 30/30 on the branch rebased onto `09e9353`.
- Production bundle: `npm run build` passed on the same base. Vite printed its existing large-chunk advisory.
- One private, memory-only browser scenario: `node tools/browser-harness.mjs scenario onfoot-rpg-wrench` passed on a private port. It checked keyboard gear selection, a locked shot with visible pooled rocket, ammo, repair and running race clock. It reported zero browser warnings or errors and saved two screenshots under `.qa-dist/browser-output/onfoot-rpg-wrench-2026-09-24T01-58-25-799Z/` in this worktree. The later HUD text cue and audio-only integration commit were covered by the focused checks and build.

No existing assertion or world fingerprint was changed. The scenario first exposed a quick gear-switch input edge; the fix lets a newly selected wrench start repairing on the next press. The RPG currently targets cars and ground, with CPU on-foot attacks and signature gear left to their own cards.
