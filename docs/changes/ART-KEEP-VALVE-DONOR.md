# ART-KEEP-VALVE-DONOR

Tests first preserve the independently reviewed Kenney pipe-large-valve donor.
Kyle closed the articulated-trailer search; this card keeps its useful valve
source record for the settled rigid Convoy Raid truck. It adds no fitting or
runtime readiness claim.

## Independent acceptance RED — 30 September 2026

Baseline lane: `548d3a7915ebb4b55393370d03d63885ac3b5657`.
`node tools/test-tanker-valve-source.mjs` produces **30 checks: four intended
failures and 26 passing controls**, exit code 1, about 0.30 seconds.

Every failure message:

1. `small retained source recipe exists: verified valve donor recipe is missing`
2. `recipe preserves only the independently verified valve source: verified valve donor recipe is missing`
3. `existing Factory catalogue preserves the actual valve source file: verified pipe-large-valve GLB donor record is missing from the existing catalogue`
4. `existing Factory catalogue records actual valve inspection: actual 456-triangle valve inspection is missing from the existing catalogue`

The retained originals are read directly from the external
`C:/Users/kyleb/dev/art-library/kenney-factory-kit` library. Their actual
archive, licence, palette and GLB byte lengths and independently pinned
SHA-256 values match the reviewed source. The three extracted members match
their exact original ZIP member bytes and CRCs. The actual embedded licence
identifies Kenney, grants Creative Commons Zero 1.0 and explicitly allows
personal, educational and commercial use.

The test reads actual GLB binary vertex positions and index values, checks
finite coordinates and valid faces, and counts 456 real triangles. The source
retains its original pipe-large-valve mesh, rigid node and source palette URI.
No Blender import, exporter, geometry fabrication or runtime substitution
is needed for this bounded source-record card.

Ten meaningful negative controls pass: altered bytes in each of the four
original files, proprietary rights, noncommercial-only rights, broken ZIP
member CRC, truncated GLB, an out-of-range original vertex index and a
nonfinite actual source coordinate. Controls use in-memory copies; the
licensed originals are never written. No network, download or runtime
dependency is used.

## Small record contract for implementation

`tools/art/tanker-valve-source.json` contains:

```json
{
  "version": 1,
  "card": "ART-KEEP-VALVE-DONOR",
  "catalogId": "kenney-factory-kit",
  "source": {
    "id": "kenney-tanker-factory-valve",
    "author": "Kenney",
    "sourcePage": "https://kenney.nl/assets/factory-kit",
    "license": "CC0-1.0",
    "library": "C:/Users/kyleb/dev/art-library/kenney-factory-kit",
    "files": ["the four exact reviewed path/bytes/sha256 records"],
    "model": {
      "path": "unpacked/Models/GLB format/pipe-large-valve.glb",
      "triangles": 456
    }
  },
  "runtime": []
}
```

The example abbreviates `files`; implementation copies the four original
record objects exactly, rather than the example string. Path separators in
the external library can use the existing catalogue’s Windows style.

Keep the existing `kenney-factory-kit` catalogue entry. Append the valve GLB
file record and its inspection object only:

```json
{
  "model": "pipe-large-valve",
  "path": "unpacked/Models/GLB format/pipe-large-valve.glb",
  "triangles": 456,
  "evaluatedTriangles": 456,
  "armatures": 0,
  "actions": []
}
```

All existing catalogue fields, original file records, crane inspections and
other entries are protected by the new test’s frozen content fingerprints.
The small recipe references one valve source and empty runtime output; it
does not import the closed trailer/frame/hitch/hatch groups or readiness
flags. The obsolete manifest, inspector, sheet recipe and four-gap acceptance
suite remain excluded. Their genuine old failures are not rewritten.

## Evidence and limits

Catalogue SHA-256 before implementation: `727c6e690c230c7ca09f2fb9ba99f4fff520bde1efd51e00ccc8a64076eb6154`.
New test SHA-256 at RED freeze: `289507876f0cbe7e6ba7419aa050c54493066031966824154008cfb4af9807a8`.
Raw failure messages and assertion diffs are in the lane’s ignored
`.evidence/2026-09-30/ART-KEEP-VALVE-DONOR/red.txt` until review consumes them.

This freeze edits only the new test and this note. No catalogue, source recipe,
existing assertion, protected audio, runtime asset, save, live folder or
Preview is changed. Independent source review, lane tier, build and the
Director’s janitor action follow implementation; this RED freeze claims none
of those gates.

## Changed assertions

None. All checks are in a new suite. No replay signature is affected by a
source-only catalogue record.

## Sound

No new game event or sound cue is added.

## Removed

None in this tests-first freeze. After the donor record merges, the Director
removes the replaced tanker-parts lane and branch with plain git worktree
remove, while preserving the external licensed originals and Kyle’s decision.
