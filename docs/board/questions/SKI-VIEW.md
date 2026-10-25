# SKI-VIEW: questions for Claude (cloud session, 25 October 2026)

I am carrying on with each recommended pick below. Each one is drawing or
page work only, so any of them can be changed later without touching the
ski rules or the save.

## 1. How the zone sits in front of the Summit world

The zones are steeper than the Summit world under their pads. From Devils
Playground, the slalom ends 209 m below the drop, but the world there is
only about 45 m lower in any direction. Drawn at its true place, every run
would be buried inside the mountain.

- **A (my pick).** Draw it like the Deep, in a private scene:
  - First the Summit world, seen from a fixed eye 40 m above the run's pad.
    That eye only turns with the camera; it never moves.
  - Then the zone over it, with the depth cleared.
  - The world is turned so that looking down the run looks down the world's
    real valley from that pad. That is 305 degrees at Devils Playground,
    210 degrees at the summit and 205 degrees at the pickup.

  Result: the near slope is the zone, and the far ridges, the sky, the fog
  and the light are the real Summit world's.
- **B.** Draw only the zone and a plain sky. This is cheaper, but it has no
  Summit backdrop.

## 2. Ski keys

- **Pick:** while the session's phase is `skiing`, the app reads the ski keys
  from the held keys:
  - A and D (or the arrows) turn;
  - S skids, Shift tucks, W skates;
  - Space pops;
  - in the air, A and D spin and W and S flip.
- Gamepad: the left stick turns and flips, A pops, the right trigger tucks
  and the left trigger skids.
- The helicopter context stays active, so Esc pauses and M mutes. C cycles
  the ski cameras.
- H shows the ski controls help, since the hook means nothing on skis.
- P, Enter and the hook do nothing while skiing.
- `src/input-contexts.js` is not this card's hook, so no new context.

## 3. Cameras

- **Pick:** C cycles three views on every run:
  - chase: 6 m behind, 2.4 m up;
  - low chase: 3.5 m behind, 1 m up;
  - side: 9 m to the skier's right, for aerials.

## 4. Where the ski board and the run menu go

`skiBoard()` has no page yet, and `src/heli/heli-board.js` is not this
card's hook.

- **Pick:** both go in `src/heli/heli-ui.js`, in the side panel.
  - At the home pad: a small HELI-SKIING box, with "Take the ski drop" and,
    on a group day, "Take the group".
  - On a drop pad with a flight in hand: the run menu. It has the day's snow
    (name and temperature), the three-wax pick with the Wax kit (needed for
    the Lab's wax run), each run's best and medal, and Ski buttons.

## 5. The loading card

- **Pick:** when the skier steps out, a card shows until the start line is
  crossed. It has the run's name, the snow, the medal targets and one tip.
  - On Aerials, the six `aerialsTips()` lines.
  - On Moguls, the tip HELI_SKIING section 5 asks for: moguls form where
    many skiers turn in the same places.
  - On powder, it stays for 10 s.

## 6. The result card and pay

- **Pick:** the card shows on `skiResult`, with:
  - the time and gates missed, or the three parts and the points;
  - the medal;
  - the pay and "new best" from `skiRecorded`.

  It stays until the helicopter picks the skier up, then 8 s more over the
  helicopter's panel.
- A found stash shows its pay as a notice.

## 7. Sounds

- **Pick:** no new sounds and no new session events. The session already
  emits every event SKI-AUDIO's cues hang on (`skiCarve`, `skiSkid`,
  `skiPop`, `skiLand`, `skiTumble`, `skiGate`, `skiStash`, `skiStepOut`, the
  `ski.step-out` cue and the `ski.radio.*` lines).
- The wind and powder beds need running values. The view gives them:
  - `skier.speed` in the session's view;
  - `skiDeepSnow(view)` in `src/ski/ski-view.js`.

## 8. The yeti

- **Pick:** on the powder run only. The existing yeti model (shared with the
  roadside yeti's loader) stands on a rock outcrop beside the bowl, about
  90 m off the line, and plays its idle. It is scenery only and never moves
  or reacts.

## 9. The skier's colours

- **Pick:** the suit keeps SKI-ART's own colours. The game has no driver
  colour to read; `src/driver.js` gives every driver the same suit.
