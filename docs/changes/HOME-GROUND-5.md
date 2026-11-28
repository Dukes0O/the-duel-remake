# HOME-GROUND-5

- Built the coop-unlocked drill outing, seeded one-cell well, existing track/feed/jam controls, saved depth and six-second hand pump.
- Tank reuses flatbed loads, four build stages and later crew work; 1,000 litres fills in 12 real hours within 8 m, with pipe, gauge and F text.
- Version 7 preserves versions 1-6 behind the verified backup; disconnected/build time and backward clocks cannot add extra water. Memory-only checks.
- Shared core: only `src/app.js`, its narrow borrowed-vehicle gate. Other hooks: router, yard, world-job/home mode, work-vehicle data/view and sound bank.
- Named all seven card cues; five drill cues reuse existing machine tones. Other home cue registration remains with OPEN-SOUND.
- Game checks on `277168a06`: requested guards 10/10, supplementary suites 6/6, build passed; all 32 suites naming drill or career-backup have passing results, plus 27 save fixtures and storage budget (3.76/4.00 MB).
- One lane tier: 192/193 passed. The only failure was the historical audio projection including five new cues; its exact-ID correction passed `test-p4-audio` before this handoff commit. No later game-code change.
- Race fingerprints unchanged: replay 306 checks, combat replay 12, world composition 65. P4 historical hashes unchanged; FIELD audio fingerprint `797e1c5a53423d2cacf2317b084aa4fffb9785a1dee353d828a1a4624823f038`.
- Independent save review: no Required/Critical findings; 108 damaged-data probes, split/offline/backward clocks, crew completion and backup/failure gates passed.
- Changed assertions: home-ground/home-hens v7 fixtures; career-backup adds v6 and tank load; town-vehicles adds drill; P4 excludes exactly five new aliases and checks their full recipes/switch. Nothing loosened; Claude review owed.
- Handoff: Step 5 as built and pump wording updated; choices recorded; board review/waiting_on claude. No browser/frame run, as requested. Claude drives it by hand.
- Night-deferred by the lane runner: convoy-tanker-art, everburn-easy, field-battle, first-person-polish, old-smoke. No push or merge.
- **Removed:** none; the existing drill and home build/load/crew paths were extended, with no replacement implementation to retire.
