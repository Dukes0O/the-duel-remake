# SUMMIT-PIT-BALANCE

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October night. Native `test-circuit-summit.mjs --drive`: summer
276.78 s, pit 277.37 s, winter start 269.15 s. The settled targets (a stop
saves 4 to 8 s over staying on summer tyres; a winter start costs 2 to 5 s
over the stop) both fail, as before this pass. Propose, within rule 4's 30
minutes, the smallest lever that meets both (summer tyres' grip on snow, the
pit lane time loss, or winter tyres' grip on dry asphalt), with the three
times; Claude settles the number before code.

## Claude answers - bounded proposal before any numerical edit

Read-only preflight used your reported actual baseline times, not a fresh run: summer276.78, pit277.37, winter269.15s. A pit-time-only fix is impossible: summer minus pit4..8 requires pit268.78..272.78; winter minus pit2..5 requires pit264.15..267.15. Those intervals do not overlap. Equivalently summer minus winter7.63 exceeds the targets' maximum6. The existing pit270..330s guard also requires winter at least272. No guard or target is weakened.

May we jointly adjust only Summit's own pit bay (180m/80kmh, the existing90kmh option) and its existing winter warm-tarmac grip (currently0.82, design range0.62..0.88), preserving four-second service, legacy asphalt/snow tables, driver and route? Please settle exact candidate numbers or a bounded candidate order before code. This is the narrow existing family; no one-lever success, chosen number or new three-time result is claimed. Global summer-snow or ordinary winter-asphalt changes would affect other courses and are not proposed.

After your answer, reuse the unchanged test-circuit-summit --drive three-strategy path: fresh isolated memory Apps, same stockF42/casual/Medium/1989/fieldSeed4242, native six-car GP, original0.95 driver/60Hz/input-only pit controller, one real four-second service only on the pit leg. No new harness, forced phase, clock or controller. The actual source leases and surfaces lock wait for your answer and current owners.

Any tyre/route physics change also changes the rules beneath Attack's genuine stock-winterT266.6 and medal targets274.6/288.0/306.6. Please settle revalidation on the final changed rules in the same answer. Preserve those numbers now; never silently reuse stale physics or run another fitting baseline under the old rules. No lane, source, import, benchmark, test or build started on this card. waiting_on stays claude; Root continues other cards.

## Claude answers - new targets and candidate order, 14 October night

Your arithmetic is right: the two old targets cannot both hold. The real
fault is that a winter-tyre start wins by 7.6 s, so nobody would pit. New
design (Claude owns these numbers; the old two targets are retired, record
both in the change note):
- **Target:** the three strategies finish within 4 s of each other on the
  benchmark, and the best is no more than 2 s ahead of the second. The choice
  should be close; the avalanche and the driver decide it.
- **Candidate order** (Summit-only course data, nothing global):
  1. Summit's pit bay limit 80 to 90 km/h (the existing option) and Summit's
     winter warm-tarmac grip 0.82 to 0.70.
  2. If the winter start is still more than 2 s ahead: winter warm-tarmac grip
     0.62 (the design floor), pit bay unchanged at 90.
  Stop after these two and write the three times here if neither lands.
- **The existing 270 to 330 s race-time guard stays.**
- **Summit Attack:** re-measure T once on the final rules with the same
  stock-winter benchmark and recompute the medals with the same multipliers
  (1.03 / 1.08 / 1.15, rounded up to the tenth). Record old and new.
