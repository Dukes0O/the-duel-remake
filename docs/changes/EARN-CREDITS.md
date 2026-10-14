# EARN-CREDITS

- Task: Cockpit T-013, Kyle's answers to the earned cars packet.
- Status: complete (design only). Kind: packet and card update.
- Switch: `earned-cars` (dev, installed by EARN-MEDALS).

## Settled design

Kyle, 14 October 2026:

- The three cars are confirmed: Ferrari Enzo (6 medals), McLaren F1 (15),
  Bugatti Bolide (24 with 6 gold). The car cards no longer offer a swap.
- Medals earn credits, "because it's still time that's being spent". Every
  win keeps its normal pay; each new medal also pays once, a quarter of that
  difficulty's win pay: 150 bronze, 250 silver, 375 gold
  (`docs/EARNED_CARS.md` section 2.1). Paid like a milestone: not doubled by
  Pro, not scaled by laps, can cover a police fine, zero in the separate
  Wasteland career. A full sheet pays 1,550; all twelve cars 18,600.
- EARN-MEDALS builds the bonus and its tests (test 8). EARN-SCREEN shows the
  amount on the new-medal line.

## Evidence

- Lane tier (`--changed --jobs 4`): 14 suites passed, 0 failed, 170 s. Build passed.
- No code, test or save changed. No assertion changed.

## Removed

The open question in packet section 10 and the "unless Kyle picks another
car" lines in EARN-CAR-1 to 3, replaced by Kyle's answers.
