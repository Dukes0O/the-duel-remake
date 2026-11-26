import {learnerOf, GAS_ROUTINE} from '../../world/open/content/routines.js';
import {willingLearners, routineFor} from '../../world/open/routine-run-rule.js';

export const ROUTINE_CUES = Object.freeze({learnt: 'open.routine.learnt', home: 'open.routine.home'});

const line = (speaker, words) => ({speaker, words});
const cinder = words => line('cinder', words);
const moss = words => line('moss', words);
const choice = (id, words) => ({id, words});
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function routineOffer(world, player, row = GAS_ROUTINE) {
  const people = willingLearners(world, row);
  return {
    lines: [
      cinder(`${player}, there's hardly any fire left in the store, so somebody has to take Bess out for gas tomorrow. You've driven that road already, and you know where the trouble is.`),
      cinder("It's a routine by now, and a routine is something you can teach. I'm sure there are willing people in this town who would love to learn it from you. Then it needn't be you on that road every single time."),
    ],
    questions: [
      {id: 'who', words: 'Who would want to learn it?', lines: people.map(person => line(person.id, person.words))},
      {id: 'how', words: 'How do I teach somebody?', lines: [
        cinder("You take them with you on the next run and drive it the way you always do. They sit beside you and watch. Whatever you do out there is what they'll learn, so try not to hit anything."),
      ]},
      {id: 'how-much', words: 'Will they bring home as much as I do?', lines: [
        cinder("No, not at first, and maybe not ever. You'll get fewer embers from their run than from yours. What you get in return is the whole day to yourself."),
      ]},
    ],
    choices: [...people.map(person => choice('teach/' + person.id,
      person.id === row.learner.otherwise.id ? "Yes. You're coming with me tomorrow." : `Yes. ${person.name}, you're coming with me tomorrow.`)),
    choice('not-yet', "Not yet. I'll keep driving it myself for now.")],
  };
}

function learnerSubject(person) {
  return person.id === GAS_ROUTINE.learner.otherwise.id ? 'Your learner' : person.name;
}

export function morningLine(person, delivery) {
  return cinder(`${learnerSubject(person)} brought home ${delivery.gas} of gas yesterday, where you would have brought ${delivery.byHand}. That's ${count(delivery.embers, 'ember', 'embers')} baked in place of ${delivery.handEmbers}, and you had the whole day to yourself.`);
}

export function shortStoreLine(person) {
  return cinder(`Don't count the store just yet. ${learnerSubject(person)} took Bess out at first light, and there'll be new embers in it by dusk.`);
}

export function learnerTalk(record) {
  return {lines: [line(record.learner, `I've brought home ${record.tally.gas} of gas and baked ${count(record.tally.embers, 'ember', 'embers')} for the town.`)],
    choices: [
      record.running ? choice('stop', 'Leave Bess at home for now.') : choice('start', 'Take Bess out again.'),
      choice('leave', 'Thanks. I just wanted to know how it was going.'),
    ]};
}

export function mossTalk(world) {
  const record = routineFor(world);
  const learner = learnerOf(GAS_ROUTINE, record.learner);
  return {lines: [moss(learner && record.lessonPending ?
    `${learnerSubject(learner)} is ready to ride beside you. Which road are you taking?` :
    'Bess is ready to go if you want to take her out. Which road are you taking?')],
    choices: [
      choice('long', "I'll take the long road."),
      ...(world.routineRoads?.includes('boneyard') ? [choice('boneyard', "I'll take the Boneyard road.")] : []),
      ...(learner && !record.lessonPending ? [choice('teach-long', "I'll take the long road with my learner.")] : []),
      choice('wash', 'I came about a wash for my car.'),
      choice('leave', "I'll leave Bess here for now."),
    ]};
}

export const hearthTalk = {
  lines: [line('auntie-solder', 'The light is going. Shall we bank the hearth?')],
  choices: [choice('bank', "Yes. Let's bank the hearth."), choice('leave', "I'll come back when I'm ready.")],
};

export const firstHearthTalk = {
  lines: [line('auntie-solder', "We've still got the Walkers at the gate. Come back here after that night is over.")],
  choices: [], autoAdvance: true,
};

export function passengerLine(person, progress) {
  const who = learnerSubject(person);
  if (progress < .33) return `${who} is riding beside you and watching.`;
  if (progress < .67) return `${who} is watching how you take the road.`;
  return `${who} is watching. ${person.id === 'dace' ? 'He has' : 'They have'} most of it.`;
}
