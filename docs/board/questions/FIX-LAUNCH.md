# FIX-LAUNCH: open points (Claude to decide)

1. **Bugatti Bolide accel 10.5 to 9.5** (it arrived with the merge; it is now the
   fastest car at 2.21 s, under the 2.4 s floor). Built: Bolide base accel 9.5
   (0 to 60 at 2.44 s), Jesko stays 9.9 (2.45 s), order kept (Bolide first, as
   before). Please confirm or pick other numbers.
2. **CPU launch per level** (`CPU_DIFFICULTY.<level>.launch` 1, 1.3, 1.6 times the
   player launch). Without it the CPU falls behind at the gentler launch. With it,
   combat balance: player win rate Easy 90, Medium about 57 to 63, Hard 37 percent
   (all inside their bands); CPU hits Easy 3.3, Medium 6, Hard 4.1 (inside).
3. **Combat-balance --check still exits 1** on one thing: one Hard race (seed 1993)
   does not complete. At about 189 mph the scripted driver rear-ends a rival that
   raiders just slowed, is knocked 38 m off the road into scenery and is boxed in:
   the demo driver steers straight at the road and has no way round the wall. A
   person would reverse and drive round. Other Hard seeds do the same at other CPU
   launch values (1999, 2001, 2004, 2015), so it is the gentler launch plus the
   demo driver. A rescue in the driver that backs out and turns did not help
   (it found another wall). It also distorts the ufo-max/hard time gain.
   Options: (a) teach the demo driver in `src/app.js` to follow the wall when
   boxed in (own small card, recommended); (b) drop seed 1993 from the 30 balance
   seeds (changes the measure; not done); (c) a short off-road "rescue to road"
   rule for everyone. Nothing done here.
4. **Staggered CPU attack replay** (`combat-inputs.json`): at the stronger CPU launch
   the three cars drove out of range of their turns; the starting gaps went from
   540/565/590 to 520/540/560 so the three still take turns in order. Hits 1 to 2.
