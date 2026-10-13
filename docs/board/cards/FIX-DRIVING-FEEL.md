# FIX-DRIVING-FEEL

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

## Kyle, playing (13 October 2026)

"The steering is a bit too sensitive. One key stroke sends the car too far,
making key strokes hard to control. Harbour Lights is particularly difficult
... so hard that Gratian won't play it." And: "The vehicles accelerate a bit
too quickly ... after a crash, that's normally when you've lost control, then
you end up going too fast too quickly and losing control again."

## Settled design (Claude)

This shapes the player's keyboard input only. The car model, computer racers,
gamepad axis and every physics constant stay as they are, so field pace,
records and combat balance are unchanged.

- **Steering keys** (`src/keyboard-steering.js`):
  - A tap starts at 30% steering, not 78%.
  - Holding the key reaches full steering over 0.45 s, not 0.2 s.
  - The most the keys can steer falls with speed: full up to 40 mph, falling
    in a straight line to 60% at 120 mph and above.
  - Letting go still centres at once.
- **Throttle key:**
  - It rises from 0 to full over 0.6 s instead of jumping. Releasing is
    instant, and braking is unchanged.
- **After a crash or a reset to the road:**
  - For 4 s the throttle is capped at 60%, rising back to full over the
    last 1 s, so the car does not shoot off again.
  - A HUD word, "STEADY", shows while the cap is on.
  - Braking and steering are not limited.
- Applies on every course and in every mode where the player drives a car,
  not on foot.

## Acceptance

- Unit tests for each curve:
  - tap value, hold time to full, speed limit at 40, 80 and 120 mph;
  - throttle ramp, the recovery cap and its end;
  - instant release.
- Gamepad steering and throttle are unchanged, and computer racers are
  unchanged.
- Replays of recorded inputs reproduce. Fingerprints of recorded CPU-only
  races are unchanged.
- The track review of Harbour Lights with the stock autopilot is unchanged
  (the autopilot does not use keys). One drive-through with keyboard-shaped
  input completes a Harbour lap without a wall stop.
- Lane tier, build, one review. Kyle and Gratian judge the feel in play.
  Live only at a release on Kyle's "go live".
