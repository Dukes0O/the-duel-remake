# Art review verdicts

The `round-N-review.md` files record the accepted scores, measured limits and
next changes. New rounds keep one compact `round-N.jpg` beside the review.

Older reviews sometimes say that raw PNG, audio or `captures.json` files are
retained. Those files served their review and were deleted by CLEAN-05. The
historical wording records what the reviewer saw at the time; it is not a
current file path. Git text history holds the old JSON if a past result needs
to be audited. Rebuild new raw captures in ignored `.evidence/`.

Eight frozen JSON files needed by current browser QA and the rigged-fighter
test live in `tools/fixtures/art-review/`. They are test inputs, not raw review
output. Historical Rustwall hashes can differ from today's runtime GLBs; make
a fresh Blender capture for a new matched art round.
