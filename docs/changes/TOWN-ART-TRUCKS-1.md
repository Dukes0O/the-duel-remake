# TOWN-ART-TRUCKS-1

## Changed

- Built the tanker drum from its measured side and rear photos with a lathe,
  raised bands, a walkway and hatch; narrowed tanker background tolerance to
  48 to retain silver paint.
- Rescaled and cropped the supply load to fit the 6.6 m truck. Rendering with
  `supply-truck:load` hidden showed the empty bed remains readable.
- Removed the tow truck's isolated rear mask splinters and opened the enclosed
  background under the boom cable.
- Added a front wheel and lamp close-up for each truck to round 12.

## Checks

- Blender render from the exported GLB: passed; family 3,348,300 bytes; each
  truck under 12,000 triangles.
- `node tools/test-blender-output.mjs`: passed, 304 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed.
- Browser checks: not applicable; Claude owns the look review.
- Changed assertions: none. Race fingerprints: not applicable to this art card.

Claude should inspect the tanker shell, pale edges, hatch and walkway; the
supply load from overhead and three-quarter views plus the empty bed; and the
tow boom opening, remaining lattice, rear deck, cable and hook. See
`docs/board/looks/town-art-trucks-1/round-12-review.md`.

## Removed

- Replaced `round-11.jpg` and its review note with `round-12.jpg` and this
  round's review note. Kept `round-9.jpg` unchanged.
- No test assertions, old game paths or runtime files were removed.
