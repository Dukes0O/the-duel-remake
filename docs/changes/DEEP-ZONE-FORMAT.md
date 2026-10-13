# DEEP-ZONE-FORMAT

The Director sliced the pure data format from DEEP-ZONE before code, while
Summit holds busy-game-files. THE_DEEP 10.1 and the detailed card settle the
contract. Version 1 is an exported constant, not an extra data field. Required
lists and exact plain-object fields are checked; unknown metadata is rejected.
Authored ids, names, numbers and list order survive unchanged. Only missing
kelp, grass and rock values default to zero. The independent copy is deeply
frozen. There are no production coast coordinates, registry or runtime hooks.

Validation covers lowercase slug zone/circuit/place ids; the-deep switch;
zone/place ids capped at the existing persisted 80-character boundary (circuit
metadata has no such bound here); finite ramp distance/depth, positive length
and left/right side; at least three
trail points with finite signed coordinates, nonnegative depth, positive width,
sea-floor surface and optional look amounts from zero to one. Neighboring x/z
positions must differ, including the implicit last-to-first closure. Places
can wrap the loop. Place and pearl ids are unique in their respective lists;
indices are whole numbers within the trail. Pearls use the nine settled ids
and finite signed offsets. Spots use the fourteen settled creatures and
positive whole counts; repeated clusters of one creature remain valid. No
arbitrary course length, geometry bound or count cap was invented.

## Checks

Tests were written first and failed because the module did not exist. After
implementation and review fix, all eleven pure Node contract groups pass. They check complete
metadata, every creature/pearl id, defaults, malformed metadata, wrapped place
ranges, independent frozen data, and the actual existing createZoneFloor loop.
The test-only loop has identical length, ground, look and seeded placement
results before/after validation, including positive-left offsets and closure.
No geometry or RNG implementation changed. A real diagnostic fault found by
the new test was fixed: duplicate segments now name both authored endpoints.

Independent review found a real interoperability fault: the initial validator
accepted zone/place ids longer than deep-discovery could remember. Under the
Director's exact card grant, only those two ids now match the existing maximum
of 80 characters. The new boundary regression failed first, then passed with
80 accepted and 81 rejected; an 81-character circuit id remains unchanged.
No discovery, save, count cap or other authored contract changed.

The existing test-deep-look passes all 5,287 checks. The card authorizes only
two new literal approved import pairs: test-deep-zone-format to deep-zone.js
and to zone-floor.js. All previous importer rejection, development switch,
geometry and numeric assertions remain exact. This permits only the pure
format test, with no runtime reachability added.

Frozen source: 6934122fe8a74228401697dd4246ff5bcd6c9543. Root's independent ordinary review
and same-reviewer persisted-id repair confirmation are clear. The original
unfiltered lane command --tier lane --changed --jobs 4 --json --keep-going
passed all 20 suites, zero failures and zero unrun, exit 0, in 380.079 seconds.
One npm run build passed on the same clean source, exit 0, in 1988.9206 ms.
The build reports its existing large-chunk warning. Complete original JSON
and build log are retained for integration acceptance. Root folds these final
facts into the owned note in the real source merge; no results-only commit.

## Removed

No code, assets or behavior was replaced. No scratch or test-only zone was
added outside the owned test. Root owns the accepted lane's final cleanup.

## Deferred

DEEP-ZONE owns runtime ramp, journey, menus, course and renderer hooks after
this format merges. Production coast data remains DEEP-TRAIL's work. Browser,
native, balance, frame and full checks stay on the night shift. No real saves,
live checkout, port 5174, release, push or history rewrite were used.
