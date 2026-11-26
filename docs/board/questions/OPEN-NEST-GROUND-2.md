# OPEN-NEST-GROUND-2

- The normal lane found an unrelated failure in `tools/test-open-doors.mjs:192`. After leaving the forge the fixture expects HOLD AIM ON A CAR and receives an empty prompt. Node 22.23.5 reproduces it on untouched integration `3f2a800a1`. Pick a separate Open Doors follow-up. The assertion, replay fingerprints and world signatures stay as published.
