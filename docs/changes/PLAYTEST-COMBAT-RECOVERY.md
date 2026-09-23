# Shorter combat wreck recovery

Mad Max Duel inherited the ordinary race's 30-second crash penalty. That
made a single impact decide many two-lap races and exaggerated the benefit
of avoiding traffic with the UFO.

Combat impacts now add two seconds to race time. The existing roughly
1.7–2-second skid and control lock remain, giving a real recovery cost near
the 3.5-second combat target in SPEC.md section 3.2. Ordinary races and
their 30-second penalty keep the old rule. A combat wreck still leaves the
driver in the event and does not spend a life.

Focused armored-impact and combat suites pass. The exact combined balance
check is pending the separately approved short tactical UFO implementation.
No existing test target changed; the focused test now asserts both time costs.
