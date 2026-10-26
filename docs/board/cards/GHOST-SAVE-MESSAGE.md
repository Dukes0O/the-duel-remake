# GHOST-SAVE-MESSAGE

The short board entry controls current state, ownership, dependencies and locks.

Found in GP-CAREER-LIVE (26 October 2026): since SAVE-RECORDS-IDB (live)
moved ghosts to the browser's database, saving is asynchronous. The results
screen labels a pending save as "this session only" or "failed", and the
result screen's render cache leaves out the save status, so the message never
updates when the save succeeds. Players see a false failure.

Fix: while saving, say "SAVING BEST GHOST…"; on success "BEST GHOST SAVED";
on a real failure, say what failed and that the race result itself is safe.
Include the save status in the result render cache key so the line updates.
Covers Duel, Time Trial and Grand Prix results. Tests for pending, saved and
failed; the grand-prix-pay scenario shows "saved". Lane tier and build. Live.
