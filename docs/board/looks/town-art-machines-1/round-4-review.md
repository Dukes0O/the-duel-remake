# TOWN-ART-MACHINES-1 | Round 4

**Builder self-review; Claude look review pending.** The sheet compares photo targets with rest and working poses rendered from the exported GLB reimported into an empty Blender scene.

## Builder review

- The excavator boom and dipper, and the trencher chain boom, now use rectangular welded plate sections. Hydraulic cylinders remain round, with separate bright piston rods.
- Track shoes, sprockets, rollers, wheel rims and hubs now use subdued dark steel tones. Rust and paint wear remain.
- The excavator cab has thin posts, dark glazing and a mesh guard. The trencher now has a framed, guarded cab. The truck has a separate glazed cab, long bonnet, grille, raised ribbed bed and load. The dozer has a longer bonnet and curved painted blade with paired push arms and lift rams.
- Machine triangle counts: trencher 14,788; excavator 7,616; dump truck 14,436; dozer 7,480. GLB: 2,685,192 bytes. All stay within card limits.
- Joint translations match the round 3 GLB exactly (glTF coordinates):

| Joint | Before | After |
| --- | --- | --- |
| `trencher:boom` | `[0, 1.01999998, -1.82000005]` | `[0, 1.01999998, -1.82000005]` |
| `trencher:chain` | `[0, 0.07000005, -1.90999997]` | `[0, 0.07000005, -1.90999997]` |
| `excavator:cab` | `[0, 1.879999996, -0.12]` | `[0, 1.879999996, -0.12]` |
| `excavator:boom` | `[0, -1.15999997, 0.35999998]` | `[0, -1.15999997, 0.35999998]` |
| `excavator:arm` | `[0, 1.12000000, 5.5]` | `[0, 1.12000000, 5.5]` |
| `excavator:bucket` | `[0, -1.65000010, 2.34000015]` | `[0, -1.65000010, 2.34000015]` |
| `dump-truck:bed` | `[0, 1.45000005, -3.09999990]` | `[0, 1.45000005, -3.09999990]` |
| `dump-truck:load` | `[0, 0.29999995, 1.20000005]` | `[0, 0.29999995, 1.20000005]` |
| `dozer:blade` | `[0, 1.24000001, 1.75999999]` | `[0, 1.24000001, 1.75999999]` |

## Claude should review

1. Compare boom cross-sections, cab proportions and the dark tracks to the photo targets.
2. Check excavator cab support and clearance from the swing deck in the game view.
3. Check that the truck bed reads as high and square, its ribs remain visible, and its load stays in the tipping bed.
4. Check the dozer blade curvature and the paired push arms and rams through its working pose.
5. Confirm the models keep their yellow-green paint and worn surfaces in The Dig.

No browser or in-game look check was run in this lane.
