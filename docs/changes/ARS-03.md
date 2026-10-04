# ARS-03: Arsenal wave three

4 October 2026. Work in progress; not ready to merge.

## Decisions Before Code

Use the native weapon trigger, cooldowns, damage, targeting and car effects.
The arsenal switch and discovered career gate remain the entry rules.

- Mortar commits the predicted landing point when fired. Its 3 m radius
  red ring stays visible for the full 1.6 s flight. Damage falls linearly
  from 25 at the centre to zero at the edge. The small hop uses the existing
  vertical flight with a 3 m/s launch, scaled by the same falloff.
- Tesla follows its owner's current position during the 0.4 s charge.
  Its 15 m pulse consumes a star shield instead of disabling that car.
  Other hostile cars receive the native disabled effect for 3 s.
- Drone uses the generic active decoy actor and target contract. It follows
  its owner's line, 10 m beside it, for 5 s, with the owner's team. Its first
  hostile hit bursts it; it never fires, scores or pays.
- Nitro uses the native timed effect for 3 s: top speed and acceleration
  times 1.35, crash ram damage times 3. Existing damage ceilings still apply.
  Oil cancels it through the existing counter.

Transient two-hit history stays outside serialized race and save data.
Wave-three computer decisions use the ranges in docs/ARSENAL.md.
Mirage's existing boss file is reused through its generic decoy contract.

## Checks

- Independent native acceptance: 33 cases, 197 checks pass. Includes real
  Crossbow and RPG flights into Drones, reward guards and CPU decisions.
- Existing Arsenal runtime: 209 cases, 2,625 checks pass.
- Laptop-only browser: 16 captures in high and performance modes pass;
  canvas pixels, renderer purity, native Oil counter, zero console issues.
  Drone's opponent HUD marker is pending the shared HUD hook transfer.
- Balance: 30 of 30 main Hard races finish; 12 wins. Naturally seeded CPU
  loadouts use all four weapons. Zero unattributed new weapon cues.
  One new defensive supplement stalled against scenery; legal brake/reverse
  recovery now finishes it in 554.49 s, with a loss. Historical policies
  are unchanged. The complete sample must be rerun on the final gated base.
- Nine new sound recipes produce 27 cached CC0 recordings. Sound-bank,
  catalog and owned loop hooks await Voice's reviewed source transfer.
  All nine recording checks pass after a Drone transient compression fix.
- Pending: separate dev gate, source and save reviews, final audio and
  browser/frame checks, lane gate and build on the final base.

The existing unimplemented purchase denial changes only its Mortar input to
an unknown weapon ID. Its refusal and no-write assertions are unchanged.

## Removed

The old Mortar unimplemented-purchase fixture input is replaced. No game
asset or assertion is removed.
