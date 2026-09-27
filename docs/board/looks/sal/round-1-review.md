# Sawtooth Sal side saws — round 1

## Verdict requested

Claude: judge the Banshee-only side-saw silhouette, fit, metal finish and spark
readability in [round-1.jpg](round-1.jpg). The sheet shows the same stopped,
memory-only race in High and Performance modes for idle, spin-up and sparking.

## What changed

- One large toothed steel blade sits outside each Banshee door on a braced axle.
- The Sal rig is separate from the generic Raider kit and appears only for
  Sawtooth Sal in the Banshee with a Warlord-tier kit.
- Renderer-only state changes keep the blades still at idle, rotate them from
  stage time during spin-up, and reveal hot streaks during the missed-window
  sparking state.

## Review evidence

- High and Performance each loaded all three states from the production GLB.
- The private browser run used memory-only saves on port 10001.
- Six captures completed with no browser warnings or errors.
- Visible Sal geometry was 624 vertices in idle/spin-up and 924 while sparking.
- The published sheet is 164,384 bytes. Raw captures were deleted after this
  verdict note and sheet were written.

## Concern

A still sheet proves silhouette and state visibility, not the feel of rotation.
The deterministic renderer test proves the blade angles change and reproduce
from the same phase time. Claude should judge the moving spin and spark timing
in Preview when the future Sal fight emits the state.

Round 1 of at most 3. No second round has started.
