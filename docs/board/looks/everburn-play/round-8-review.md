# Everburn play, round 8: the notice board, job 5's start, and the mirror

Sheet: `round-8.jpg` (eight pictures, 1280 by 720 drawn small, from the real game in a browser on the QA page with memory-only saves, Medium).
Taken 13 November 2026 on the go-live branch by a Sonnet helper for Claude. The QA page's own test panels were hidden for the pictures; nothing else was changed.

## What the pictures show

1. **Lost Prospector, just after Take job.** The car stands on open ground by the Boneyard at (543, 192), facing the first prospector. The small map now draws the two prospectors and Tin Town (it said only "CURRENT POSITION", twice, over itself, before).
2. **Survey Flags, just after Take job.** Same start. The small map draws the five flags by name.
3. **Hot Soup, just after Take job.** The car stands 90 m south of Tin Town facing the notice board. The map draws the road from Auntie's kitchen by the safe corner to the board. A plank fence fills most of the first picture: the straight way to the board runs through a 13 m gap between the two southern shack groups, and the gap only shows as the car comes nearer.
4. **Hot Soup at the notice board**, 14 m short of it, 3.8 s in. The car comes up on the south side of the town, which is the only side the board can be reached from.
5. **Job 5, new start.** The car stands on the road 124 m short of the Dead Mall (the tan block ahead), past the pair of junk cars that lie on the road. They are behind it now, not 9 m in front.
6. **Job 6, the first second.** The job's heading, then the wave and well bars under it on the left, the mirror clear, Cinder's caption under the mirror. The bars used to be drawn on the mirror.
7. **Job 2, the first second.** "HOLD F TO GET OUT" stands to the right of the mirror, level with its top. It used to straddle the mirror's top edge.
8. **Hot Soup, the safe corner** at (610, -2), half a metre outside the town's solid, 9.4 s in. The car was driven there on purpose and stopped on the spot (0.02 m off).

## Honest notes

- Hot Soup is short: the child-pace script covers the 82 m in about 4 seconds and the job pays the same 96 scrap on Medium as the others. A slower child will take longer. The soup is only lost on a hard crash (ten allowed), and nothing on the way is hard to hit except the town's own south edge, which the straight way misses by 4.5 m.
- Hot Soup's first picture is a fence, not a road. If it confuses a child, the start can move 10 m east or west and look past the gap; it was not changed for a look alone.
- The three notice-board jobs never get a tick: the board offers them again whenever the player is in the yard, and each pays the one world-job amount every time (96 scrap on Medium). The save has no field for them, and none was added. If the board should show them done, or pay once, that is a design call and a new save field.
- Lost Prospector and Survey Flags have no spoken lines (the definitions carry none), so their captions stay empty: the objective bar and the map carry them. No line was written.
- The job's own result line is the plain one ("Lost Prospector is done. You made it back to the yard.").
