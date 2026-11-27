import voice from '../../../story/threads/content/radio-hill-voice.js';
import {validateTalkScene} from '../../../story/talk.js';
import {checkSentence, checkTalkRow, requireSound} from '../check-tables.js';
import {isTrue} from '../facts.js';
import {SITE_NEEDS} from './needs.js';

const word = (of, is) => ({fact: 'word', of, is});
const mark = id => ({fact: 'mark', id});
const not = fact => ({not: fact});
const read = (scene, needs) => ({scene, needs});
const line = (speaker, words, radio = false) => ({speaker, words, radio});
const scene = (id, lines, choices = []) => ({id, lines, choices});
const speech = (id, speaker, words) => scene(id, [line(speaker, words)]);
const meetingMark = site => 'open/met/' + site;

const FIRST_GLASSHOUSE = [
  line('marigold', "You can stop right there, where I can see your hands. We've nothing here worth taking, unless you're very fond of beans."),
  line('finch', "Gran, that car isn't one of the buggies. It's too clean, and it only has one person in it."),
  line('marigold', "I'm Marigold, and that boy is my grandson Finch, who notices everything. We grow beans under old car windows, because glass keeps the wind off them. Who are you, and where have you come from?"),
];
const FIRST_ANSWERS = [
  {id: 'glasshouse/meet/town', words: "I'm from Tin Town. We have a hearth burning again.",
    reply: line('marigold', "Tin Town has a fire? Then somebody has done a brave thing, or a foolish one. I'd like to hear which it was, when you've time to sit down.")},
  {id: 'glasshouse/meet/traveller', words: "I'm only looking around. I didn't know anyone lived out here.",
    reply: line('marigold', "Nobody is meant to know, and that's how we've kept our glass in one piece. I'd thank you not to tell the whole road about us.")},
];

const MARIGOLD = {
  sworn: "Here's our driver! Finch, put the kettle on the stove, and bring out the good beans, not the ones we sell.",
  friendly: "It's good to see you again. The beans have come on well since you were last here, and I've told them that it's partly your doing.",
  strangers: "You've come back, then. Most people who find us by accident don't manage to find us twice.",
  wary: "I'd sooner you said what you want and went on your way. We've work to do, and I haven't made up my mind about you.",
  cold: "You aren't welcome here, and you know the reason. Please go, before I have to ask Finch to fetch the others.",
};
const HETTY = {
  sworn: "There's our driver! I had your engine on the set ten minutes ago. I'd know the sound of it anywhere now.",
  friendly: "Come in and sit down. I've three days of news saved up for you, and Bern has stopped listening to me.",
  strangers: "You came back up the hill. Hardly anybody climbs up here twice, because of the wind.",
  wary: "We heard what happened on the road, driver. We hear everything up here. I'd like you to tell me your side of it.",
  cold: "My sister doesn't want to talk to you, and so I don't either. I'd like you to go back down the hill, please.",
};

const greetings = (person, words) => Object.entries(words).map(([id, words]) =>
  speech(person + '/' + id, person === 'hetty' && id === 'cold' ? 'bern' : person, words));
const greetingRows = (person, people, words) => Object.keys(words).map(id =>
  read(person + '/' + id, word(people, id[0].toUpperCase() + id.slice(1))));

const scenes = requireSound([
  scene('glasshouse/first', FIRST_GLASSHOUSE, FIRST_ANSWERS),
  scene('glasshouse/ash', [
    line('marigold', "That's Ash ground all over your car. You can turn round and go back to Old Smoke, and you can tell him that we haven't any fire here for him to put out."),
    ...FIRST_GLASSHOUSE.slice(1),
  ], FIRST_ANSWERS),
  scene('radio-hill/first', [
    line('hetty', "Bern, there's somebody here! I told you that somebody was listening. I've been telling you that for eleven years."),
    line('bern', "You have. Hello, driver. Please mind the wires, because they're holding the mast up."),
    line('hetty', "I'm Hetty and this is my sister Bern. I do the listening and she does the mending. We hear every radio between the ships and the wall, and nobody ever answers us. Would you like a cup of something hot?"),
  ]),
  ...greetings('marigold', MARIGOLD), ...greetings('hetty', HETTY),
  speech('finch/first', 'finch', "Does your car go fast? I only drive the water cart, and it can't go any faster than I can run."),
  speech('finch/friendly', 'finch', "I've been watching the road for your dust. You always come from the same side, so I think I know where Tin Town is now."),
  speech('finch/pump', 'finch', "I oil the pump every morning now, the way you showed me. It hasn't stuck once since you were here."),
  speech('finch/rumour', 'finch', "At night there's a red light a long way off, high up, and it blinks. Gran says it's a star, but stars don't blink like that. I think it's on a hill to the {radio-hill.bearing}."),
  speech('hetty/glasshouse', 'hetty', "There's a camp out to the {glasshouse.bearing} that never uses a radio, but I can hear their wind pump squeaking on a still night. They grow something, I think."),
  speech('hetty/feud', 'hetty', "The {enemy.name} have been talking to each other all week, and your town's name keeps coming up. I'd keep to the wide roads if I were you."),
  speech('hetty/sign', 'hetty', "Somebody lit something big to the {sign.bearing} this morning. I can't see it from here, but two different drivers have mentioned the smoke."),
  speech('hetty/quiet', 'hetty', "It's been a slow week on the set. A trader lost a wheel on the Salt Road, and somebody's goat has learnt to answer to its name. That's all of it."),
  scene('radio-hill/voice-1', [line('hetty', "This is Radio Hill, calling anybody who can hear us. We can see dust on the road below us. If that's your dust, flash your lamps twice.", true)]),
  scene('radio-hill/voice-2', [line('hetty', "There's weather coming in from the west, and three buggies out on the Mall Road. That's all the news there is. Is there anybody out there to hear it?", true)]),
  speech('glasshouse/tow', 'marigold', "We saw your smoke from the rows and brought the water cart out. I know it isn't dignified, but it will get you home. We'll call it the favour we owed you."),
  scene('glasshouse/assist', [line('finch', "Gran says to hold on, because she's coming in the truck! She also says that she can't drive, so please keep out of her way.", true)]),
  speech('radio-hill/tow', 'bern', "We heard your engine stop, and then we didn't hear it start again. I've brought the winch truck. Hetty wanted to come too, but somebody has to mind the set."),
  scene('radio-hill/assist', [line('hetty', "Driver, there are two engines coming up behind you from the {encounter.bearing}, and they aren't traders. I thought you'd want to know before they arrived.", true)]),
  ...SITE_NEEDS.flatMap(need => [
    scene(need.id + '/ask', [line(need.by, need.what)], need.kind === 'supply' ? [
      {id: need.id + '/accept', words: need.accepted, reply: line(need.by, need.acceptReply)},
      {id: need.id + '/refuse', words: need.refused, reply: line(need.by, need.refuseReply)},
    ] : []),
    speech(need.id + '/done', need.thanksBy ?? need.by, need.done),
    ...(need.kind === 'supply' ? [speech(need.id + '/broken', need.by, need.broken)] : []),
  ]),
  scene('radio-hill-voice/fuel-news', voice.beats['talking-over'].lines),
], row => {
  validateTalkScene(row);
  return [
    ...row.lines.flatMap(item => checkSentence(item.words)),
    ...row.choices.flatMap(option => [...checkSentence(option.words), ...checkSentence(option.reply.words)]),
  ];
}, 'Camp scenes');

export const siteScene = id => scenes.find(scene => scene.id === id) ?? null;
export {meetingMark};

const friendly = of => ({fact: 'word', of, atLeast: 'Friendly'});
export const SITES_TALK = Object.freeze(Object.fromEntries(requireSound([
  {id: 'marigold', rows: [
    read('glasshouse/ash', {all: [not(mark(meetingMark('glasshouse'))), mark('open/ash/glasshouse')]}),
    read('glasshouse/first', not(mark(meetingMark('glasshouse')))),
    ...greetingRows('marigold', 'glasshouse', MARIGOLD),
  ]},
  {id: 'finch', rows: [
    read('finch/rumour', {all: [friendly('glasshouse'), not({fact: 'found', site: 'radio-hill'}), not(mark('rumour/radio-hill'))]}),
    read('finch/pump', mark('glasshouse/pump-mended')),
    read('finch/friendly', friendly('glasshouse')),
    read('finch/first'),
  ]},
  {id: 'hetty', rows: [
    read('radio-hill/first', not(mark(meetingMark('radio-hill')))),
    ...greetingRows('hetty', 'radio-hill', HETTY),
  ]},
], row => row.rows.flatMap(item => [
  ...checkTalkRow(item), ...(siteScene(item.scene) ? [] : ['Missing scene: ' + item.scene]),
]), 'Camp talk tables').map(({id, rows}) => [id, Object.freeze(rows)])));

export function siteGreeting(person, world) {
  return SITES_TALK[person]?.find(row => !row.needs || isTrue(row.needs, world))?.scene ?? null;
}
