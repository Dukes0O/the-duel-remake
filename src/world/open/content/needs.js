import {checkNeed, checkSentence, requireSound} from '../check-tables.js';

export const mendedMark = id => id + '-mended';
export const deliveredMark = id => id + '-delivered';
export const brokenMark = id => id + '-broken';

const mend = (site, item, by, what, done, targets, wrenchSeconds, scrap, remembered, thanksBy = by) => {
  const id = site + '/' + item;
  return {id, site, kind: 'mend', by, what, done, thanksBy, targets, wrenchSeconds, scrap, remembered,
    gives: [{type: 'mark', id: mendedMark(id)}]};
};

const supply = (site, item, by, what, done, dueNights, promise, accepted, acceptReply, refused, refuseReply, broken, source) => {
  const id = site + '/' + item;
  return {id, site, kind: 'supply', by, what, done, dueNights, promise, accepted, acceptReply, refused, refuseReply, broken, source,
    gives: [{type: 'mark', id: deliveredMark(id)}]};
};

export const SITE_NEEDS = Object.freeze(requireSound([
  mend('glasshouse', 'pump', 'marigold',
    'The wind pump has seized, and without it we carry every drop of water by hand. I don\'t suppose you know anything about pumps?',
    'Listen to that. It\'s turning as sweetly as the day we put it up. I shan\'t forget this, and neither will the beans.',
    ['pump'], 12, 8, 'You mended the wind pump.'),
  mend('glasshouse', 'cart-axle', 'marigold',
    'The water cart\'s axle has cracked, and Finch has been dragging it along on one wheel. Could you look at it for us?',
    'It rolls straight now! I\'d got so used to it pulling to the left that I nearly fell over.',
    ['cart'], 10, 6, 'You mended the water cart axle.', 'finch'),
  mend('glasshouse', 'frames', 'marigold',
    'The wind got under three of the glass frames last night and split them. If they aren\'t wired up before dark, the cold will have the young plants.',
    'That\'s the frames safe, and the little ones under them. You\'ve a good pair of hands for a driver.',
    ['frame-1', 'frame-2', 'frame-3'], 4, 4, 'You wired up the three glass frames.'),
  supply('glasshouse', 'seed', 'marigold',
    'We\'ve nearly finished our seed beans, and Dot at the diner keeps a sack of the old kind. It\'s a long way, and I\'m not asking you to go today. Would you bring us a sack when you\'re next passing her door?',
    'These are the old seed, the kind my mother grew. You went all that way and you remembered. We don\'t have a word for what you are to us now, so I\'ll just say that you\'re ours.',
    3, 'You promised the Glasshouse a sack of seed beans.',
    'I\'ll bring you a sack of seed beans. You have my word.', 'Then I\'ll keep a row dug and waiting for them.',
    'I can\'t promise that. It\'s too far out of my way.', 'That\'s an honest answer, and I\'d rather have one of those than a promise that comes to nothing.',
    'I kept a row dug for your seed, and it\'s still empty. I told the others that you\'d come. I shan\'t be telling them that again.',
    {person: 'dot', place: 'tin-town', price: 10}),
  mend('radio-hill', 'generator', 'bern',
    'The generator has been coughing since the dust storm, and I can\'t hold the housing and turn the bolts at the same time. Could you lend me a pair of hands?',
    'That\'s running clean. Thank you. I don\'t say much, but I do remember things.',
    ['generator'], 14, 10, 'You mended the generator.'),
  mend('radio-hill', 'guy-wire', 'bern',
    'One of the wires that hold the mast has come loose at the ground. If the wind gets up tonight, the whole mast will lean.',
    'The mast has stopped humming! I\'d got so used to the noise that the quiet gave me a fright.',
    ['anchor'], 8, 3, 'You fixed the wire that holds up the mast.', 'hetty'),
  mend('radio-hill', 'aerial', 'hetty',
    'The top aerial blew down in the night, and I can only hear half the land without it. Bern won\'t let me climb the mast any more, because of my knees.',
    'Listen, that\'s the ships! I haven\'t heard the ships in a month. Oh, they\'re still arguing about the same thing.',
    ['mast'], 10, 5, 'You put the aerial back up.'),
  supply('radio-hill', 'copper', 'bern',
    'I\'m nearly out of copper wire, and the only place left with any is the Boneyard, inside the old airliners. It isn\'t work for today. Would you bring me a coil, when you\'re next over that way?',
    'That\'s good copper, and there\'s a lot of it. Hetty, put the kettle on. This driver can come up our hill for as long as there\'s a hill.',
    4, 'You promised Radio Hill a coil of copper wire.',
    'I\'ll bring you a coil of copper wire. You have my word.', 'Then I\'ll leave the last of mine on the mast, and trust you for the rest.',
    'I can\'t promise that. I\'ve too much to do for my own town.', 'That\'s fair. I\'d sooner hear it now than wait for a coil that isn\'t coming.',
    'I left a gap in the wiring for your copper, and the gap is still there. Hetty made excuses for you. I\'ve asked her to stop.',
    {place: 'boneyard', onFoot: true, price: 0}),
], row => [...checkNeed(row), ...[row.done, row.remembered, row.promise, row.accepted, row.acceptReply, row.refused, row.refuseReply, row.broken]
  .filter(line => line !== undefined).flatMap(checkSentence)], 'Camp needs'));

export const siteNeed = id => SITE_NEEDS.find(need => need.id === id) ?? null;
