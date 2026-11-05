// Every report and choice is a complete sentence a player can understand.
export const REPORT_TEXT = Object.freeze({
  'fire-at-site': {
    who: 'Odessa', what: 'A fire has started.', priority: 100, bad: true,
    requires: {fire: true},
    answers: [
      {id: 'send-fire-crew', label: 'The fire crew goes to the fire.', outcome: 'The fire crew goes to the fire.'},
      {id: 'go-yourself', label: 'You leave for the fire.', outcome: 'You leave for the fire.'},
      {id: 'leave', label: 'The fire spreads to the nearby site.', outcome: 'The fire spreads to the nearby site.'},
    ],
  },
  'sickness-in-town': {
    who: 'Odessa', what: 'Several people have become sick.', priority: 95, bad: true,
    requires: {sickness: true},
    answers: [
      {id: 'send-medic', label: 'The medic treats the sick people.', outcome: 'The medic treats the sick people.'},
      {id: 'bring-clean-water', label: 'The sick people get clean water.', outcome: 'The sick people get clean water.'},
      {id: 'leave', label: 'The sickness spreads to more people.', outcome: 'The sickness spreads to more people.'},
    ],
  },
  'trader-deal': {
    who: 'A trader', what: 'A trader has offered a deal.', priority: 40, bad: false,
    requires: {traderDeal: true},
    answers: [
      {id: 'accept-deal', label: 'The town accepts the trader’s deal.', outcome: 'The town accepts the trader’s deal.'},
      {id: 'ask-later', label: 'The trader will come back later.', outcome: 'The trader will come back later.'},
      {id: 'leave', label: 'The trader leaves without a deal.', outcome: 'The trader leaves without a deal.'},
    ],
  },
  'dust-storm': {
    who: 'Dune', what: 'A dust storm is moving across town.', priority: 75, bad: true,
    requires: {dustStorm: true},
    answers: [
      {id: 'secure-town', label: 'People secure loose things before the storm arrives.', outcome: 'People secure loose things before the storm arrives.'},
      {id: 'shelter', label: 'People shelter until the storm passes.', outcome: 'People shelter until the storm passes.'},
      {id: 'leave', label: 'The storm blows through town and leaves dust behind.', outcome: 'The storm blows through town and leaves dust behind.'},
    ],
  },
  'drought-warning': {
    who: 'Odessa', what: 'The wells are running low.', priority: 90, bad: true,
    requires: {droughtWarning: true},
    answers: [
      {id: 'save-water', label: 'The town saves its remaining water for drinking.', outcome: 'The town saves its remaining water for drinking.'},
      {id: 'send-water-team', label: 'A team goes to look for another water source.', outcome: 'A team goes to look for another water source.'},
      {id: 'leave', label: 'The wells keep falling and may run dry.', outcome: 'The wells keep falling and may run dry.'},
    ],
  },
  'road-rat-raid': {
    who: 'Hollis', what: 'Road Rats are approaching a town site.', priority: 85, bad: true,
    requires: {roadRatRaid: true},
    answers: [
      {id: 'send-guards', label: 'The guards go to protect the site.', outcome: 'The guards go to protect the site.'},
      {id: 'sound-alarm', label: 'People move to safety while the alarm sounds.', outcome: 'People move to safety while the alarm sounds.'},
      {id: 'leave', label: 'The Road Rats take supplies from the site.', outcome: 'The Road Rats take supplies from the site.'},
    ],
  },
  'child-drawing': {
    who: 'Miss Quill', what: 'A child has sent a drawing of the town.', priority: 25, bad: false,
    requires: {childDrawing: true},
    answers: [
      {id: 'put-on-wall', label: 'The drawing goes on the town wall.', outcome: 'The drawing goes on the town wall.'},
      {id: 'send-thanks', label: 'Miss Quill gives the child your thanks.', outcome: 'Miss Quill gives the child your thanks.'},
      {id: 'leave', label: 'Miss Quill keeps the drawing safe.', outcome: 'Miss Quill keeps the drawing safe.'},
    ],
  },
  'family-leaving': {
    who: 'Hollis', what: 'A family is thinking about leaving town.', priority: 80, bad: true,
    requires: {familyLeaving: true},
    answers: [
      {id: 'ask-why', label: 'The family explains what it needs before deciding.', outcome: 'The family explains what it needs before deciding.'},
      {id: 'offer-help', label: 'The town offers help to the family.', outcome: 'The town offers help to the family.'},
      {id: 'leave', label: 'The family leaves town.', outcome: 'The family leaves town.'},
    ],
  },
  'site-stopped': {
    who: 'Odessa', what: 'Work at a building site has stopped.', priority: 70, bad: true,
    requires: {siteStopped: true},
    answers: [
      {id: 'send-supplies', label: 'Supplies go to the building site.', outcome: 'Supplies go to the building site.'},
      {id: 'send-workers', label: 'More workers go to the building site.', outcome: 'More workers go to the building site.'},
      {id: 'leave', label: 'The site stays stopped until someone helps.', outcome: 'The site stays stopped until someone helps.'},
    ],
  },
  'vultures-saving': {
    who: 'The Vultures', what: 'The Vultures have found a way to save scrap.', priority: 35, bad: false,
    requires: {vulturesSaving: true},
    answers: [
      {id: 'make-change', label: 'The town makes the change and saves scrap.', outcome: 'The town makes the change and saves scrap.'},
      {id: 'check-ledger', label: 'The Vultures show you the numbers in the Ledger.', outcome: 'The Vultures show you the numbers in the Ledger.'},
      {id: 'leave', label: 'The town keeps spending the same amount.', outcome: 'The town keeps spending the same amount.'},
    ],
  },
});
