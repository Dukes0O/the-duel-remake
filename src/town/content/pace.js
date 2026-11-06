// Arrival pace is tuned to the town milestones in docs/WASTELAND_TOWN.md, section 2.
// This is a growth rate, not a limit: later years keep increasing arrivals.
export const TOWN_PACE=Object.freeze({
  arrivalMoodBase:3,
  arrivalMoodScale:100,
  arrivalYearScale:1.5,
});
