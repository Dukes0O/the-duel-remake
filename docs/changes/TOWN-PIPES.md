# TOWN-PIPES change note

## Changed

- Added repeatable town water, power, treatment and sewer calculations in the
  card's three simulation files. Water routes become live only after their
  route work is finished, and stay on a utility layer separate from roads.
- Water pressure includes source height, ground height, pipe length, flow and
  pipe size. Taps use 7.5 L/min, account for daily queues, and show delivery,
  pressure and shortfall at map coordinates. Water Road limits apply to the
  Water Road source alone.
- Water quality follows the source through settling, sand filtering and
  boiling or chlorine. The teaching estimate uses 50% turbidity reduction in
  settling and 90% in sand filtering, within EPA guidance ranges; boiling and
  chlorine disinfect but do not change turbidity:
  https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=200021OB.TXT
  Latrine checks use 20 people, 30 metres, downhill
  placement and 730 days to fill. Sewers need a fall; reed beds are limited by
  their daily capacity.
- Power sums wind (up to 5 kW), sun (up to 8 kW) and generator (40 kW) output
  against demand. It reports shortages in plain sentences and exposes plain
  overlay arrays. Those values populate the town's existing water and power
  summaries.
- The town link layer supplies `waterRoadLimitLitresPerDay` in utility data.
  The tick has no profile access, so it defaults old towns to 10,000 L/day.
- The [EPANET source repository](https://github.com/epanet-js/epanet-js-toolkit)
  identifies its source licence as [MIT](https://github.com/epanet-js/epanet-js-toolkit/blob/master/LICENSE)
  and documents browser and Node use. `epanet-js` is not installed in this lane and package
  fetching is unavailable, so repeatability and the 500-junction/50 ms gate
  could not be checked. As recorded on the card, this lane uses the section
  11 fallback and adds no dependency.
- A 12 m water tower adds 12 m of head. The 20 L bucket default uses a standard jerrycan size described in WHO field
  guidance: https://iris.who.int/bitstream/handle/10665/96340/9241546166_eng.pdf?sequence=1

## Checks

- `node tools/test-town-pipes.mjs`: passed. It checks the real arithmetic for
  the Water Road cap, 7.5 L/min queue, bucket trips and hours, 15 to 50 L per
  person, latrine distance and capacity, turbidity stages, sewer fall and
  reed-bed capacity, power totals and shortfalls, route completion, overlays,
  and save/load.
- `npm.cmd run build` (`npm run build` through PowerShell's command shim):
  passed. Vite reported existing chunk-size and dynamic-import warnings.
- Lane tier: not run; Claude runs it for this card.
- Browser and look checks: not run. Claude should check a low tap and a tap
  above its tower, long 50 mm versus 200 mm routes, the capped Water Road tap,
  12 m tower head and a tap above its top, long 50 mm versus 200 mm routes,
  the capped Water Road tap, water quality through treatment, downhill sewer
  and reed-bed capacity, and wind/sun changes with a shortfall marker and
  sentence.
- Race fingerprints: not run. This change does not touch race code or replay
  inputs; there are no changed fingerprint assertions.
- Changed assertions: none. The card test is new.

## Removed

- No prior implementation was replaced. No temporary test renders or assets
  were created.
