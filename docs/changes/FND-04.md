---
task: FND-04
status: merged
kind: tooling
flag: none
player_facing: no
---

## What changed

Added `.gitattributes` to store text with LF endings and mark asset formats
as binary. The tracked text blobs were already LF in Git, so renormalization
changed no existing blob. The isolated checkout now has no mixed endings.

## Evidence

- `git add --renormalize .`: no existing file changed in the index.
- `git ls-files --eol`: zero `w/mixed` files after edited files were fixed.
- The three known red suites failed for the same reasons before their repairs.

## Behavior and test changes

None.
