# EARN-CAR-1 Ferrari Enzo, round 5: in the game (15 October 2026)

Sheet: removed 15 October 2026 once this verdict was recorded (Kyle has it;
the looks folder has a 20 MB budget). Rebuild it with
`tools/art/enzo-look-sheet.py` from the `enzo-look` browser scenario (private port,
memory-only saves loaded from `tools/fixtures/saves/12-medals.json`, so the
Enzo is owned; `earned-cars` on; 1280 x 720, High). The helicopter is live,
so the scenario also records that Kestrel One set the Enzo down at Panorama
Ridge. The
race is Panorama Ridge Sunset against a 959, so the Enzo is the only one on
track. 0 warnings, 0 errors. Rebuild the sheet with
`tools/art/enzo-look-sheet.py`.

- **Chase camera (what the player sees most):** low, wide and planted on the
  road, four round tail lamps, plate and diffuser; the right size beside the
  kerbs and signs. Reads as a real car at speed.
- **Side:** the best view. Long and low, teardrop canopy, raised front
  fender, dark side scoop, driver visible under the glass.
- **Front:** the beak drops between the raised fenders and the recessed
  lamps read as lamps, not stickers. The weakest view, but sound.
- **Damage:** two front hits and one on the left crumple the nose, scratch
  the paint, crack the windscreen and break a lamp. Gritty, as it should be.
- **Showroom and garage:** the car sits right in the menu; the garage page
  shows "MAXED", 350 km/h, six gears and the medal sheet.

Fixed in this round (`src/enzo-vehicle.js`, one small lane):

- The wheels were flat, bright white five-spoke discs and looked like a toy's.
  They are now dark grey twin five-spoke wheels with a silver rim, closer to
  the real car's.
- The front splitter and the diffuser fins stuck out past the nose and tail;
  both now sit inside the body.

Not this card: the driver's helmet face is the shared driver every car uses.

Verdict (Claude): **pass. Gritty, not toy-like** after the wheel fix. The
frame check in a field of Enzos is left for the nightly full check.
