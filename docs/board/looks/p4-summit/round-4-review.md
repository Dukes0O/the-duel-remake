# Summit Run finishing pass, round 4 (Claude, 14 October 2026)

Claude's own finishing pass (P4-FINISH-SUMMIT), not a Codex art round. Sheet `round-4.jpg`: ten before and after pairs, High quality, same camera for each pair, taken from the private browser harness with memory-only saves. No frame timing. Summit stays dev.

## What the sheet shows

| Item | Result |
| --- | --- |
| 1 Gallery roof | Not fixed by course data alone. The dark mound over the shed is the generic tunnel rock cover (race-structures.js), drawn grey and unlit at night; the pale concrete shed is hidden inside it. The right-hand pair in the top row of the sheet previews one proposed switch (`cover:false` on the gallery) that hides the cover: the shed then reads as a pale concrete slab with a snow load. That switch is NOT in this lane. |
| 2 Town lights | Done in data. The ground beside the Ledge now falls away into a valley (existing `basins` bowl, no water), and 48 warm lights sit on its floor, 300 to 520 m from the road and about 220 m below it. They show from the Ledge, but as small dots beyond the shelf edge, not a glowing town. Steep valley walls show striping from the snow shading. |
| 3 Hut and observatory | Hut windows glow warmer with halos on all four sides. The observatory now has a warm glow down its slot; the slot itself is still a thin edge from the road. |
| 4 Snow tone | Weak. Five large frozen ponds and fourteen dark pine clumps (96 more pines) break the snow in the Snowfields and Devil's Staircase, but the snow surface is still mostly one blue tone. The shading strength is fixed in code. |
| 5 Open Road | Unchanged: it is already dark asphalt and reads apart from the shed, but it has no snow banks of its own. |
| 6 Yeti fur | Not done. The Frost tint is a car paint only; the yeti has no tint option. |

## Review numbers

- Review tool, test driver, Medium, Falcone F42, seed 1989: 7:14.98 for the 14,220 m road, top speed 189 mph, 23 corners, 6 crests, no browser errors. The same numbers come out of the unchanged lane, so this pass did not move them. The tool's frames 2 to 16 are black apart from the rear mirror (also unchanged from the start of this pass), so the review frames cannot judge the snow half; the sheet views replace them.
- Native races (existing `--drive`, same before and after): summer 276.78 s, pit 277.37 s, winter start 269.15 s. All three finish with no crashes. The pit stop runs 3.98 s at 7004.8 m.
- Pit choice: the stop costs 0.58 s against staying on summer tyres, and starting on winter tyres is 8.2 s quicker than the stop. Both settled targets (stop saves 4 to 8 s, winter start costs 2 to 5 s) still fail. This is the open design question for the pit.
- Avalanche moment: not rerun. The fork view shows both signs; the Gallery is a dark mound and the Open Road a black ribbon, so both read, but the Gallery does not yet look like shelter.
- Floating objects and road gaps: none seen in the 15 views. All 48 town lights stand on drawn ground (tested). Road, 36 m of shoulder either side and the timing are unchanged everywhere (test-circuits 116,894 checks).

## Section 11 checklist

| Check | Score |
| --- | --- |
| Signature moment every lap (Gallery, Ledge) | Partial: Ledge improved, Gallery still a dark mound |
| One overtaking zone | Pass: 560 m pit straight and a 1,005 m finish straight |
| One commitment corner | Partial: fast sweepers to r250 exist; not driven flat out in this pass |
| Rhythm, no more than three slow corners in a row | Fail by the tool: it flags corners 7 to 16 as slow in a row (hairpins joined by r80 kinks) |
| Elevation you feel | Pass: three airborne crests (2.5, 2.5, 1.5 m) |
| Readable at speed, boards and landmarks | Partial: boards seen at the hairpins I looked at; not every corner checked |
| Scenery frames the road, never hides it | Fail at the Gallery (rock cover hides the shed); pass elsewhere |
| Race time | Summer 4:37 and pit 4:37 sit in 270 to 330 s; winter start 4:29 is 0.85 s under; all under the 5 to 7 minute target |
| First view from the grid wants to be raced | Pass |
| Nothing floating or clipping the road | Pass |
| Light flatters the signature moment | Fail at the Gallery; partial at the Ledge |

## Removed

The old town light rows (48 lights on the lower road near 5.8 km, hidden behind the hills) are replaced by the valley rows. No file, asset or test was removed.
