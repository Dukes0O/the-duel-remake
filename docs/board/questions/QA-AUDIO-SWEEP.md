# QA-AUDIO-SWEEP: scope decisions

The baseline control renders an OfflineAudioContext, without a live recorder. Its compressor repeat failure cannot be called cured by a live sample witness. Options: infer a cure from clean runs, or leave the cause open. Pick: measure the existing baseline and leave it open unless evidence establishes the cause.

The Arsenal and crash meters still use callback labels to judge PCM continuity. Options: retain those labels as the verdict, or apply QA-AUDIO-UNDER-LOAD's existing sample witness. Pick: apply the witness in these check tools, retaining raw labels as notes, all measurements, sound limits and deadlines. Three isolated passes are required to report the small migration complete. Readiness or six-blast dispatch failures remain open if they recur; a witness does not excuse missing stimuli.

GATE-CALLBACK-DIAGNOSTICS names a test file absent from current integration. Pick: add its requested focused PCM/callback tests alongside the existing crash meter migration; no new harness or framework.

Temporary browser profiles stay inside this lane's evidence folder. The QA build clears .qa-dist, so profiles cannot live inside that build output.
