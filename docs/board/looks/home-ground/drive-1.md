# Home Ground step 1: Claude's drive by hand, 27 November 2026

Driven on integration `af42cc8d0`, served from the integration folder on port 5191, a visible Chrome at full frame rate
with real keys (`tools/hand-drive.mjs`), a temporary player with memory-only saves, switch `home-ground` on.

**It works, all the way through.** Auntie Solder's talk offers the ground in three plain lines and one answer ("I'll
fence it."), and the ground becomes his. Out of Tin Town's gate it is a short walk. A tin panel goes up in about three
seconds of holding B, and a long hold builds once without picking it back up. A panel he built stops him walking,
sprinting and bursting into it. The burst runs at 15 m/s for about three seconds with a bar, and refills. From above,
the plan, the grid and the four stakes read well; a piece is marked and cleared; off the ground is refused in a plain
sentence. The gate hangs on the edge, asks for a name, and the board at the gate reads G-TOWN. A panel across the lane
is refused in red with the reason. Every sentence on screen is plain and whole.

**What to fix in step 2 (on HOME-GROUND):**
1. Hammering shows nothing happening: no hammer in his hands, no panel rising, no progress, and no sound yet (the cues
   are named, not registered). Holding B for three seconds against a pale ghost feels like waiting, not building.
2. The rocket launcher stays in his hands on his own ground and fills the middle of the view; "HOLD AIM ON A CAR" shows
   on his ground, where there is no car to aim at.
3. From above there is no mark for where he stands, and the panels he has built show only as a thin grey sliver.
4. The build outline and its prompt are always in front of him on his ground, even when he only wants to cross it.
   Facing a panel he built, the prompt offers to build beyond it rather than to pick it up.
5. The gate is refused until he stands within about a metre of the edge, with no hint that he should step closer.
6. His ground is not tinted apart from the plain (already noted at the merge).

**Not faults (the drive tool):** a number key or Enter sent in the instant the tool resumes the game is lost, because
the talk and the name box are hidden while it is paused; pressed a moment later, both work.
