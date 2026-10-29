# QA-MAP-FINISH-TABLE

The `map-finish` browser scenario fails with "Table landing reward/logbook missing", twice, on fc0e5325 and on the VARIANTS-RELEASE lane alike (28 October 2026). It may be stale after HELI-PAY-CONTINUE changed the Table's pay and result words, or a real fault in the Table landing reward. Done when the cause is named within 30 minutes; a stale check is updated without loosening it, a real fault gets its fix and a test.
