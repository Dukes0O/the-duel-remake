# BOWL-NIGHTS

- Creates the five named three-event nights from one table, including the named rivals, featured tricks, weapons, banners, jet tint and a second independent Bus Pile on Hammer Night.
- Adds Long Jump, High Jump and Home Run records without a migration. The first five purses stay 250/300/350/400/600. Turn Show's Scrapasaurus win settles Night 5 with its existing trophy; score-only failures show a save warning.
- At d656c5338, 74 lane suites passed, including 444 Night, 404 Turn, 167 save and 55 show checks. Magnitudes stayed fixed for 297 race, 12 combat and 63 world guards. Production build passed. Independent save review approved d656c5338.
- School and Tricks were the two legacy failures. Both passed the file-only rerun at 811f7aecd. School uses Night 2 as its unfeatured control, Night 1 for backflip and Night 5 for doubles. The Trick combo pin moves 696 to 876 from Rookie Night's doubled backflip; raw turns stay pinned.
- Rule 18 per 2ad5883ff: Show tests assert all fifteen ordered slots; Night and HUD assert the same named rival and new wording; HUD, Walls, Rex and its drive use Night 5's third slot; Weapons and Weapons View use Night 5's second slot. Turn Show reaches the jumps via the season and the pay drive checks Rookie’s lineup and keys.
- Claude runs the named pay, Turn Show, and five-night hand drives on the merged batch. BOWL-SOUND replaces both opening stand-ins.
- **Removed:** Repeated generic night order, standalone rival schedule and the superseded section 7 fight design.
