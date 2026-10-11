# RELEASE-GP: the Grand Prix and Tremblant Woods go live

Kyle approved on 11 October 2026 ("the Grand Prix is good. we could merge that
into the full game"), choosing Grand Prix with Tremblant Woods and the Team Room.

- `grand-prix` and `tremblant-woods` switch from dev to on. Panorama Ridge and
  Harbour Lights stay dev.
- Changed assertions (release state only): tools/test-feature-flags.mjs now
  expects the two switches on and the other two Phase 4 circuits dev;
  tools/test-race-field.mjs expects the Grand Prix switch on. No behaviour or
  tolerance changed.
- README gains the release note; docs/VERIFICATION.md gets the release record
  after install.

Removed: nothing.
