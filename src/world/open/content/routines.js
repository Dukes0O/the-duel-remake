// The roads and the person they supply. Each routine casts its learners from its own table.
export const ROUTINES = Object.freeze([{
  id: 'gas-run', run: 'gas-run', offeredBy: 'cinder', handRunsFirst: 1, fullLoad: 60,
  learner: {
    from: 'people',
    where: {any: [{fact: 'favour', atLeast: 1}, {fact: 'word', atLeast: 'Friendly'}]},
    people: [
      {id: 'dace', of: 'walkers', name: 'Dace', words: "I would. I've been watching how you take the corners."},
      {id: 'rell', of: 'walkers', name: 'One of the Walkers', words: 'One of mine will ride with you, if you promise to bring her back.'},
    ],
    otherwise: {id: 'tin-cook', name: 'A townsperson',
      words: "I'll learn it. I'm tired of waiting at the gate to see whether Bess comes home."},
  },
  share: [.6, .85], every: 'banked night',
}]);
export const GAS_ROUTINE = ROUTINES[0];
export const learnerOf = (row, id) => [...row.learner.people, row.learner.otherwise].find(person => person.id === id);
