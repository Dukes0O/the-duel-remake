# SKI-ART

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Codex (Blender and the laptop screen). H5 section 8. Switch `heli-skiing`
(dev). Can start now.

- **The skier:** a Quaternius base character (already in the library) in a
  one-piece ski suit, helmet and goggles, with skis and poles, recoloured to
  the player's driver colours; poses: stand, crouch, lean left and right,
  tuck, air, tumble. Real and grounded: no cartoon proportions.
- **Guide and guests:** the same figure in four other suit colours and a
  guide's red jacket with a radio.
- **Course pieces:** slalom poles (red and blue), giant-slalom gates with
  panels, a small timing arch at start and finish, drop and pickup pad flags,
  a kicker lip with a wooden edge, orange safety netting along the aerials
  landing hill.
- Recipe `tools/blender/ski.py`; one sheet per round in
  `docs/board/looks/ski/`, at most three rounds; Claude judges. No frame
  check until it is playable (rule 9). Budget about 4 MB.

Owns: `tools/blender/ski.py`, `public/assets/models/ski/`, catalogue and
credit rows, `docs/board/looks/ski/`, `docs/changes/SKI-ART.md`. Locks:
none. Sound: none.

Acceptance: Claude's verdict on a sheet; hygiene check; lane tier and build.
Removed: nothing.
