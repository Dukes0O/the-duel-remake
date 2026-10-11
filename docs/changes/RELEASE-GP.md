# RELEASE-GP: the Grand Prix goes live

Kyle approved on 11 October 2026 ("the Grand Prix is good. we could merge that
into the full game"), choosing the Grand Prix with Tremblant Woods and the Team
Room. Switching Tremblant Woods on adds a circuit to the course list, which
21 suites count or replay (combat courses, event scenes, save budget, replay
fingerprints), so Tremblant goes in its own release after that review. This
release switches on the Grand Prix (Pacific Canyon) and the Team Room.

- `grand-prix` switches from dev to on. Panorama Ridge, Harbour Lights and
  Tremblant Woods stay dev.
- Changed assertions (release state only): tools/test-feature-flags.mjs,
  tools/test-wasteland-beta.mjs and tools/test-race-field.mjs expect the Grand
  Prix switch on. No behaviour or tolerance changed.
- README gains the release note; docs/VERIFICATION.md gets the release record
  after install.

Removed: nothing.
