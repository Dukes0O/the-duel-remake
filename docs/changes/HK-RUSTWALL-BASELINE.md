# HK-RUSTWALL-BASELINE

status: ready-for-review

## Decision

Keep the existing synthetic numerical recipe and full reviewed baseline identity in a small JSON fixture. These inputs test the report validator; they are not recorded browser timings. Keep every original verdict and comparison threshold.

## Removed

Remove the historical Git lookup for 5a994ad. Preserve the full identity as provenance in the fixture. No game source, images or replay signatures change.

## Verification

Tests first: a84042b failed both new regression checks before implementation. The original frame suite passed 2/2 before and after. The new suite passes 2/2 in a throwaway repository with one new commit, no remote and no historical baseline commit. Removing that temporary fixture fails as expected. All original comparison assertions are retained; only data generation reads the same numbers from JSON. No browser or gameplay change. Lane tier, build and independent review pending.

Independent review found that nested Node test contexts suppressed the child TAP reporter. The child now clears NODE_TEST_CONTEXT, keeping both original verdict checks active under node --test as well as the project runner. The reviewer also proved original A1/B/A2 reports and both original assertion bodies byte-identical.
