const chapter = (id, title, fact, lineIds, next, mapTarget) => Object.freeze({
  id, title, when:fact ? Object.freeze({path:`story.facts.${fact}`, equals:true}) : Object.freeze({path:'id', truthy:true}),
  lineIds:Object.freeze(lineIds), next, mapTarget,
});

// Facts are supplied by the town systems as they land. A missing fact is false.
export const ACT1_CHAPTERS = Object.freeze([
  chapter('town.act1.twelve', 'The Twelve', null, ['town.1.twelve', 'town.1.pits'], 'Mark three places for test pits.', 'town'),
  chapter('town.act1.water', 'Down to Water', 'pitsDug', ['town.2.well'], 'Dig and line the best test pit.', 'best-test-pit'),
  chapter('town.act1.salvage', 'What We Can Find', 'wellBuilt', ['town.3.nothing'], 'Take the flatbed to the Boneyard and bring home salvage.', 'boneyard'),
  chapter('town.act1.soup', 'Soup', 'salvageDelivered', ['town.4.soup'], 'Build a soup kitchen and paint ground for homes.', 'town'),
  chapter('town.act1.smell', 'The Smell', 'soupBuilt', ['town.5.smell'], 'Build a latrine downhill and well away from the well.', 'town'),
  chapter('town.act1.winter', 'The First Winter', 'latrineBuilt', ['town.6.winter'], 'Get the people under tin before the frost.', 'town'),
  chapter('town.act1.fire', 'First Fire', 'winterPassed', ['town.7.fire', 'town.7.spray'], 'Drive the old fire engine to the soup kitchen.', 'soup-kitchen'),
  chapter('town.act1.payday', 'Pay Day', 'firstFireOut', ['town.8.payday'], 'Read the Ledger and make the town pay for itself.', 'town'),
  chapter('town.act1.pipes', 'Pipes', 'goodYear', ['town.9.pipes'], 'Lay a pipe and raise a tower to carry water to taps.', 'town'),
  chapter('town.act1.proper-town', 'A Proper Town', 'towerRunning', ['town.10.hall'], 'Build a Town Hall in real brick.', 'town'),
]);

export default ACT1_CHAPTERS;
