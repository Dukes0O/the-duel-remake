// Market day: a storyline of the open Scablands, written as data (docs/story/open-scablands.md, section 18, "The one
// shape of a storyline's file").
// The page that explains every scene is docs/story/threads/market-day.md. Every line a player reads is here exactly as
// the page has it. Lines that only one people could say are written for that people and chosen by `when: {cast, is}`; a
// guest with no lines of its own answers with the line whose speaker is that role's leader: {first.leader},
// {second.leader} or {third.leader}. In a condition or an effect the odd one's people are '@odd.people'
// (src/world/open/roles.js).
// Nothing loads this file yet. It names no other storyline: it meets the others only through facts.

const ID = 'market-day';
// A mark with a sentence is one the player can read on the page What people remember. A mark without one is kept out of sight.
// The sentence is written on the first effect that makes the mark, and only there (the copies are listed in `notes`).
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, ...(text ? {text} : {})});
const marked = what => ({fact: 'mark', id: `${ID}/${what}`});
const say = (speaker, words, more = {}) => ({speaker, words, ...more});

const FRIENDLY = {fact: 'word', atLeast: 'Friendly'};
const GUESTS = ['first', 'second', 'third'];
// One of the guests is that people (any of the three roles may be filled by any people).
const guestIs = (...peoples) => ({any: GUESTS.flatMap(role => peoples.map(people => ({cast: role, is: people})))});
// Two of the three guests have agreed to come.
const comes = role => marked(`comes-${role}`);
const TWO_COME = {any: [['first', 'second'], ['first', 'third'], ['second', 'third']].map(([a, b]) => ({all: [comes(a), comes(b)]}))};
const RATS_RAIDING = {fact: 'feud', of: 'road-rats', atLeast: 'Raiding'};
// Both of the peoples who are at odds are in the yard, and where their stakes went.
const BOTH_HERE = {all: [marked('odd-asked'), {cast: 'odd'}]};
const BESIDE = marked('stood-beside');
const PROMISE_BROKEN = {all: [marked('told-no-tinkers'), marked('odd-asked')]};
// The quarrel is written for the growers and the tinkers.
const QUARREL = {all: [BOTH_HERE, guestIs('glasshouse'), {cast: 'odd', is: 'bus-ring'}]};
const SOMEBODY_WENT_HOME = {any: [marked('promise-broken'), marked('odd-sent-home'), marked('guest-sent-home'), marked('glass-broken')]};

const ASK = 'Will you come to a market at Tin Town?';

// What each guest says when asked. A guest is one of three roles, and any people may fill any of them, so the same
// talks are written once and made for each role. `when: {cast, is}` chooses the talk by the people who fill the role.
const guestTalks = role => {
  // A guest's mark is named for its role, so that the same three marks serve any three peoples.
  const text = `{${role}.name} will come to the market.`;
  const comes_ = mark(`comes-${role}`);
  const asked = people => ({cast: role, is: people});
  const OTHER = {all: ['glasshouse', 'walkers', 'radio-hill', 'deck-folk'].map(people => ({not: asked(people)}))};
  const ODD = id => ({all: [{asked: id}, {cast: 'odd'}]});
  const questions = [
    {id: `ask-glasshouse-${role}`, to: 'marigold', words: ASK, when: asked('glasshouse'),
      lines: [
        say('marigold', "Did you say a market? I haven't sold beans across a table since Finch's mother was small. We'll bring beans, and seedlings under glass for anybody who wants to grow their own."),
        say('marigold', 'Give us a wall that gets the sun, because seedlings sulk in the shade, and so do I. Tell me one thing first, though. Are the tinkers from the Bus Ring coming?', {when: {cast: 'odd'}}),
      ]},
    {id: `what-tinkers-did-${role}`, to: 'marigold', words: 'What did the tinkers do to you?', when: ODD(`ask-glasshouse-${role}`),
      lines: [say('marigold', 'Two winters ago a Road Rat drove a buggy straight through my frames. The tinkers had mended that buggy the week before, and they knew whose it was. They told me afterwards that a job was a job.')]},
    {id: `ask-walkers-${role}`, to: 'rell', words: ASK, when: asked('walkers'),
      lines: [
        say('rell', "We'll come. We have salt to sell, and my people will fetch and carry for anybody who is short of hands. Put us near the gate, will you? Walkers don't rest easy with a fence between them and the road."),
        say('wim', "Will there be pies? I've only ever had half of one."),
      ]},
    {id: `who-minds-${role}`, to: 'rell', words: 'Do you mind who stands next to you?', when: {all: [{asked: `ask-walkers-${role}`}, {cast: 'odd'}, {fact: 'found', site: 'bus-ring'}]},
      lines: [say('rell', "I don't mind anybody who minds their own cart. I'll tell you who does mind, though. The bean woman won't stand near the tinkers, and everybody on the road knows it except the tinkers.")]},
    {id: `ask-radio-hill-${role}`, to: 'hetty', words: ASK, when: asked('radio-hill'),
      lines: [
        say('hetty', "There's going to be a market! Bern, did you hear that? I've been listening to other people's lives for eleven years, and now I can go and look at some of them."),
        say('bern', "We can't both go. Somebody has to stay with the set, or nobody is listening to the roads for a whole day. You'll have to choose which of us you want."),
      ]},
    {id: `ask-deck-folk-${role}`, to: 'captain-imre', words: ASK, when: asked('deck-folk'),
      lines: [say('captain-imre', "The Deck Folk will send a shore party of four, with rope and salt. I'll enter it in the log as shore leave, which nobody on these ships has had in thirty years.")]},
    // Any other guest.
    {id: `ask-guest-${role}`, to: `{${role}.leader}`, words: ASK, when: OTHER,
      lines: [say(`{${role}.leader}`, "You're holding a market at Tin Town? Nobody has asked us anywhere in a long time. We'll come, and we'll bring what we have to sell.")]},
  ];
  const thoughts = [
    {thought: 'Hetty hears everything, and she repeats most of it. Bern mends everything, and she hardly says a word.', when: {asked: `ask-radio-hill-${role}`}},
  ];
  const choices = [
    {id: `no-tinkers-${role}`, when: ODD(`ask-glasshouse-${role}`), words: "No. I won't ask the tinkers.",
      thought: "That's easy to say today. I haven't been to the Bus Ring yet.",
      effects: [{...comes_, text}, mark('told-no-tinkers'), {type: 'promise', id: `${ID}/no-tinkers`, person: 'glasshouse', dueNights: 5,
        text: 'You told Marigold that the tinkers would not be at the market.'}],
      lines: [say('marigold', "That's good to hear. We'll be there at first light, and I'll bring the big basket.")]},
    {id: `tinkers-come-${role}`, when: ODD(`ask-glasshouse-${role}`), words: 'Yes. I mean to ask them, because a market is for everybody.',
      thought: 'She might not come at all if I say this.',
      effects: [comes_, mark('told-tinkers-come')],
      lines: [say('marigold', "Then put the whole yard between us and them, and I'll come for Dot's sake. I shan't promise you that I'll be civil.")]},
    {id: `not-decided-${role}`, when: ODD(`ask-glasshouse-${role}`), words: "I haven't decided yet.",
      effects: [comes_],
      lines: [say('marigold', "Then make up your mind before I've loaded the cart. I don't like surprises, and neither do beans.")]},
    {id: `hetty-comes-${role}`, when: {asked: `ask-radio-hill-${role}`}, words: 'Come yourself, Hetty, and bring the news.',
      thought: "A stall wants somebody who talks. I only hope she doesn't tell everybody everything.",
      effects: [comes_, mark('hetty-came', 'Hetty will come to the market.')],
      lines: [say('hetty', "I'll wear the good scarf. Bern, you'll write down everything you hear while I'm away, won't you? I want every word of it.")]},
    {id: `bern-comes-${role}`, when: {asked: `ask-radio-hill-${role}`}, words: 'Come yourself, Bern, and bring your tools.',
      thought: "Bern won't start any trouble. I'm not sure she'll start any talk, either.",
      effects: [comes_, mark('bern-came', 'Bern will come to the market.')],
      lines: [say('bern', "I'll bring the small soldering iron. Hetty, stop looking at me like that. You can go to the next one.")]},
  ];
  // What asking makes, without repeating the mark's sentence.
  const questionEffects = {
    [`what-tinkers-did-${role}`]: [mark('heard-marigold')],
    [`ask-walkers-${role}`]: [comes_],
    [`ask-deck-folk-${role}`]: [comes_],
    [`ask-guest-${role}`]: [comes_],
  };
  return {questions: questions.map(question => questionEffects[question.id]
    ? {...question, effects: questionEffects[question.id]} : question), thoughts, choices};
};

const talks = GUESTS.map(guestTalks);

export default {
  id: ID,
  title: 'Market day',
  kind: 'build',
  reads: ['word', 'found', 'stage', 'feud', 'night', 'mark'],
  writes: ['word', 'made', 'promise', 'settle', 'favour', 'mark'],

  cast: {
    // The host is Dot, who is named and is not a role. Tin Town is nobody's guest at its own market.
    first: {from: 'peoples', where: FRIENDLY, except: ['tin-town']},
    second: {from: 'peoples', where: FRIENDLY, except: ['tin-town'], apartFrom: ['first']},
    third: {from: 'peoples', where: FRIENDLY, except: ['tin-town'], apartFrom: ['first', 'second']},
    // A found camp whose people are at odds with one of the three, by the hostileTo of either. Nobody, when no camp is.
    odd: {from: 'sites', where: {all: [{fact: 'found'}, {fact: 'stage', is: 'camp'}]}, optional: true},
  },

  starts: {all: [
    {fact: 'night', atLeast: 2},
    {fact: 'word', of: 'dot', atLeast: 'Strangers'},
    {not: {fact: 'thread', id: ID, at: 'any'}},
  ]},

  sign: {kind: 'words', by: 'dot'},

  beats: {
    sign: {
      when: 'sign-seen',
      lines: [
        say('dot', "Do you know that you have three lots of people out there who'd cross the road to say hello to you? I hear it from every one of them, and I'm tired of carrying their messages to each other."),
        say('dot', "When my mother was young and three camps were on speaking terms, they held a market. I think Tin Town ought to hold one, and I think you're the one who ought to ask them."),
      ],
      thoughts: [
        {thought: 'Marigold, Rell and the sisters have never been in the same place at the same time. I wonder whether they would even like each other.', when: guestIs('glasshouse', 'walkers', 'radio-hill')},
      ],
      questions: [
        {id: 'what-is-a-market', words: 'What is a market?',
          lines: [say('dot', "It's a day when everybody brings what they have to one place, and nobody shoots at anybody until they've all gone home again. You're too young to have seen one, and so am I, very nearly.")]},
        {id: 'why-tin-town', words: 'Why should it be at Tin Town?',
          lines: [say('dot', 'Because Tin Town has a fence, a fire and Auntie Solder. Nobody misbehaves in front of Auntie Solder twice.')]},
        {id: 'what-dot-gets', words: 'What do you get out of it, Dot?',
          lines: [say('dot', 'I sell a hundred pies in one day, and I hear a whole year\'s gossip. I never said that I was doing this out of kindness.')]},
      ],
      choices: [
        {id: 'hold-one', words: "Let's hold one. I'll go and ask them myself.",
          thought: 'If I ask them all and then it never happens, Dot will have baked a hundred pies for nobody.',
          effects: [mark('asked', 'Dot asked you to hold a market at Tin Town.'), {type: 'promise', id: `${ID}/hold-market`, person: 'dot', dueNights: 5,
            text: 'You told Dot that Tin Town would hold a market within five nights.'}],
          lines: [say('dot', "Go and ask each of them yourself, to their face. People come to a market when they've been asked, and they stay at home when they've only been told.")],
          next: 'asking'},
        {id: 'not-now', words: "I can't do it now, Dot. Ask me another time.", effects: [], again: {afterNights: 3, times: 1}},
      ],
    },

    // Auntie Solder gives the yard and its rules, at the hearth, the same day or any day after.
    hearth: {
      when: {all: [{after: 'sign'}, marked('asked'), {reach: ['tin-town', 'hearth']}]},
      notes: {spotLabel: 'the hearth'},
      lines: [
        say('auntie-solder', 'You want to hold a market inside my fence? I suppose the pie woman put you up to it. I have two rules. Everybody leaves their guns at the gate with Moss, and nobody sells anything on my hearth stones.'),
        say('auntie-solder', "There's room for five pitches round the yard, besides Dot's van at the gate. Who stands next to whom is your business, and I'd thank you to get it right."),
      ],
      // With the rules known, the stakes are laid out in the yard.
      next: 'stakes',
    },

    // The asking. Each is a talk at that people's own place, in any order, on any day. No mission runs, so nothing is held.
    asking: {
      when: marked('asked'),
      // The odd one, written for the Bus Ring. Whether to ask is decided by driving there or by not driving there. Gasket
      // greets the player when they first walk up to the Bus Ring, before anything is asked.
      lines: [
        say('gasket', "I'm Gasket, and this is the Bus Ring. We mend anything with a wheel on it, and we don't ask whose wheel it is. People hold that against us.", {when: {all: [{cast: 'odd', is: 'bus-ring'}, {reach: 'bus-ring'}]}}),
      ],
      thoughts: [
        'Everybody I ask is going to want to know who else is coming.',
        ...talks.flatMap(talk => talk.thoughts),
        {thought: "If I ask the tinkers, Marigold will be angry. If I don't ask them, they'll hear about the market anyway.", when: {cast: 'odd', is: 'bus-ring'}},
      ],
      questions: [
        ...talks.flatMap(talk => talk.questions),
        {effects: [mark('odd-asked', 'The tinkers of the Bus Ring were asked to the market.')], id: 'ask-bus-ring', to: 'gasket', words: ASK, when: {cast: 'odd', is: 'bus-ring'},
          lines: [say('gasket', "Nobody has ever asked us to a market. People bring us their broken things after dark, and then they pretend that they've never met us. Yes, we'll come, and we'll mend whatever is put in front of us.")]},
        {effects: [mark('heard-gasket')], id: 'why-mend-for-rats', to: 'gasket', words: "Why do you mend the Road Rats' buggies?", when: {asked: 'ask-bus-ring'},
          lines: [say('gasket', "Because a tinker in the hill country who turns work away doesn't eat that week. I mended the buggy that went through the bean woman's glass. I've been sorry about that job ever since, and I've never found a way to say so.")]},
        {id: 'what-tinkers-need', to: 'gasket', words: 'What do you need at a market?', when: {asked: 'ask-bus-ring'},
          lines: [say('gasket', 'We need an anvil and a fire, or all we can do is sell parts out of a box. Put us by your forge, if your smith will have us.')]},
      ],
      choices: [
        ...talks.flatMap(talk => talk.choices),
        // The market can be called when two of the three have agreed. The player tells Dot.
        {id: 'call-market', when: TWO_COME, words: 'Tell Dot that the market is tomorrow',
          lines: [say('dot', "Then it's tomorrow. I'll light the oven tonight and I shan't sleep, and you'll owe me for that as well.")],
          next: 'stakes'},
      ],
      notes: {holds: []},
    },

    // The stakes, at dusk, in Tin Town's yard. The choice is made by carrying a stake to a pitch.
    stakes: {
      when: {reach: ['tin-town', 'yard']},
      cue: 'open.market.stake',
      lines: [say('auntie-solder', "Here are your stakes. Knock one in at each pitch, and that's where those people stand tomorrow. The sunny wall is right next to the forge wall, and I can't move either of them for you.")],
      thoughts: [
        {thought: 'Marigold wants the sun, and Gasket needs the forge. Those two pitches are side by side.', when: BOTH_HERE},
      ],
      choices: [
        {id: 'far', by: 'do', when: BOTH_HERE, words: "Put the Bus Ring's stake at Bess's shed, with the whole yard between it and the Glasshouse",
          thought: "They'll be as far apart as the yard allows. The tinkers won't be able to mend anything from there, though.",
          effects: [mark('stood-far', "The tinkers stood by Bess's shed.")], next: 'day'},
        {id: 'beside', by: 'do', when: BOTH_HERE, words: 'Put the Glasshouse at the sunny wall and the Bus Ring at the forge wall, side by side',
          thought: "If those two are going to shout at each other, they'll do it right beside the glass.",
          effects: [mark('stood-beside', 'The growers and the tinkers stood side by side.')], next: 'day'},
        {id: 'shade', by: 'do', when: BOTH_HERE, words: "Put the Glasshouse at the pump, in the shade, with Radio Hill's stall between it and the forge wall",
          thought: "Marigold asked me for the sun, and I'm giving her the pump.",
          effects: [mark('stood-in-shade', 'The growers stood in the shade by the pump.')], next: 'day'},
        {id: 'no-choice', by: 'do', when: {not: BOTH_HERE}, words: 'Knock in the stakes', effects: [], next: 'day'},
      ],
      notes: {
        // The five pitches round the yard, and the stakes that go to them.
        spotLabel: 'the yard', pitches: ['beside-the-gate', 'the-pump', 'the-sunny-wall', 'the-forge-wall', 'bess-shed'],
      },
    },

    // Market day: one mission, walked, inside Tin Town's fence. Its parts follow in order.
    day: {
      when: {part: 'dawn'},
      cues: ['open.market.open', 'open.market.crowd'],
      mission: {
        kind: 'market', id: `${ID}/day`, by: 'foot', minutes: 8, holds: ['checkpoints', 'signs'],
        lines: [
          say('dot', "Everything in this yard is a quarter cheaper today, and that includes my pies. Those are market prices, and there won't be any haggling, because I've no patience for it."),
          // Heard as the player walks the yard.
          say('wim', "I had a whole pie. Dot says it's the first whole pie that a Walker has eaten since the sea went. Is that true?", {when: guestIs('walkers')}),
          say('finch', "Dace says he can run faster than our water cart. I told him that everybody can, because it's a water cart.", {when: guestIs('glasshouse', 'walkers')}),
          say('hetty', "I've matched six voices to six faces this morning, and four of them look nothing like I pictured. The bean woman is a great deal shorter than she sounds.", {when: marked('hetty-came')}),
          say('bern', "I've mended three lamps and a radio. Nobody has asked me a single question, and it's the nicest morning I've had in years.", {when: marked('bern-came')}),
          say('cinder', "There are people from every corner of the land inside one fence, and nobody is shouting. I never expected to see it, and I'm trying not to expect it to last."),
        ],
      },
      next: 'rider',
      notes: {
        // Market prices: everything in the yard costs this much less.
        prices: {off: .25},
        // The lines after the first are heard as the player walks the yard.
        linesHeardFrom: 1,
      },
    },

    rider: {
      when: {part: 'noon'},
      cue: 'open.market.hush',
      lines: [
        say('moss', "There's a Road Rat at the gate, and he's on his own. He handed me his gun before I'd asked for it, and he says he only wants to buy a fan belt.", {when: {not: RATS_RAIDING}}),
        say('moss', "There's a Road Rat at the gate with his hands up. After everything that's happened on the road, I'm not opening this gate to him unless you tell me to.", {when: RATS_RAIDING}),
        say('lug', "My name's Lug. I have forty kilometres to drive home, and a fan belt that's held together with string. I have scrap to pay for a new one, and I'm not here for anything else.", {when: marked('odd-asked')}),
        say('lug', "My name's Lug. I could smell those pies from the Mall Road, and I have scrap to pay for two of them. I'm not here for anything else.", {when: {not: marked('odd-asked')}}),
      ],
      thoughts: ["He gave up his gun, and he only wants a fan belt. He's still a Road Rat, and half the people in this yard have a reason to hate them."],
      questions: [
        {id: 'ask-marigold', to: 'marigold', when: guestIs('glasshouse'), words: 'Marigold, what do you say?',
          lines: [say('marigold', "I say that one of his kind drove through my glass. I shan't sell beans in the same yard as him.")]},
        {id: 'ask-gasket', to: 'gasket', when: marked('odd-asked'), words: 'Gasket, would you sell to him?',
          lines: [say('gasket', "I'd sell a belt to anybody who hangs their gun on the rack. That's what the rack is for. It's your market, though, and I'll do as you say.")]},
        {id: 'ask-dot', to: 'dot', when: {not: marked('odd-asked')}, words: 'Dot, would you sell to him?',
          lines: [say('dot', "His scrap is as good as anybody's, and his manners can't be worse than some I've served. It's your market, though.")]},
        {id: 'ask-auntie', to: 'auntie-solder', words: 'Auntie, what are the rules?',
          lines: [say('auntie-solder', "My rules are about guns and hearth stones, and he hasn't broken either of them. Whether he comes in is yours to decide. That's what you get for having an idea.")]},
      ],
      choices: [
        {id: 'let-him-in', words: "He's hung up his gun like everybody else. Let him in to buy his belt.",
          thought: 'If a market is for everybody, then it has to be for him as well.',
          effects: [mark('rider-served', "A Road Rat bought a fan belt at Tin Town's market.")],
          lines: [
            say('lug', "Thank you. I'll tell Sump there's one gate on this road where a Rat can buy a fan belt without being shot at. He'll think I'm making it up."),
            say('marigold', 'I see how it is. This is a market for everybody, and that includes the people who smash other people\'s glass.', {low: true, when: guestIs('glasshouse')}),
          ],
          next: [{when: QUARREL, to: 'yard-quarrel'}, {to: 'dusk'}]},
        {id: 'turn-him-away', words: "He isn't coming in today. Moss, give him back his gun and see him on his way.",
          thought: "He'll tell Sump that Tin Town turned him away over a fan belt.",
          effects: [mark('rider-turned-away', "A Road Rat was turned away from Tin Town's market.")],
          lines: [
            say('lug', "All right, I'm going. It was only a fan belt. I'll remember which gate this was, though, when I'm walking the last ten kilometres home."),
            say('gasket', "I'd have liked to make that sale. You asked us to a market, and then you told us who we were allowed to sell to.", {when: marked('odd-asked')}),
          ],
          next: [{when: QUARREL, to: 'yard-quarrel'}, {to: 'dusk'}]},
        {id: 'at-the-fence', words: 'Moss, carry his scrap in and carry the belt out to him.',
          thought: 'That way, nobody has to stand next to him.',
          effects: [mark('rider-at-the-fence', "A Road Rat was served through the fence at Tin Town's market.")],
          lines: [say('lug', "So my scrap can come in, and I can't. That's how people feed a dog that they're afraid of.")],
          next: [{when: QUARREL, to: 'yard-quarrel'}, {to: 'dusk'}]},
      ],
    },

    // The quarrel, written for the growers and the tinkers. With no odd one in the yard, the day goes straight to dusk.
    'yard-quarrel': {
      when: QUARREL,
      cue: 'open.market.voices',
      lines: [
        say('marigold', "Half the parts on that table were paid for with a Road Rat's scrap. Every buggy that ever came at my glass was mended by your people first!"),
        say('gasket', "I sell to anybody, and I mend for anybody. That's an honest trade. It's a good deal more honest than standing behind a row of beans and calling people names."),
        say('marigold', 'It was eleven frames. I counted every one of them while I was sweeping them up.'),
      ],
      thoughts: ["If one of them knocks that table, there'll be glass all over the yard, and one of them will go home."],
      choices: [
        {id: 'enough', words: "That's enough, both of you. You're not doing this in Auntie Solder's yard.",
          thought: "They'll stop because of Auntie. They won't have changed their minds about anything.",
          effects: [mark('peace-kept', "The growers and the tinkers kept the peace at Tin Town's market.")],
          lines: [
            say('marigold', "I'll hold my tongue until dusk, for Dot's sake and for Auntie Solder's. I shan't hold it one minute longer than that."),
            say('gasket', "That suits me. I came here to sell parts, and selling parts is what I'll do."),
          ],
          next: 'dusk'},
        {id: 'tell-her', when: marked('heard-gasket'), words: 'Gasket, tell Marigold what you told me about that buggy.',
          thought: "Gasket said she'd been sorry ever since. Marigold has never heard her say so.",
          lines: [
            say('gasket', "I mended that buggy. I knew whose it was, and I took the job because we hadn't eaten properly in a week. I've been sorry every day since, and I didn't know how to come and tell you."),
            say('gasket', "I can't unbreak eleven frames. I can make you eleven new ones, with corners that a buggy would bounce off, and I'd want nothing for them."),
            say('marigold', "I've been angry with you for two winters, and I was getting good at it. Bring the frames up to the Glasshouse yourself, so that my beans can see who made them. Finch, give the woman some seedlings.", {when: {not: PROMISE_BROKEN}}),
            say('marigold', "I was told that the tinkers wouldn't be here, and I was told it to my face. I'm not taking frames or anything else from this market. Finch, load the cart.", {when: PROMISE_BROKEN}),
          ],
          effects: [
            {...mark('quarrel-mended', 'Gasket said she was sorry, and Marigold took her frames.'), when: {not: PROMISE_BROKEN}},
            {type: 'word', person: 'bus-ring', set: 'Friendly', when: {not: PROMISE_BROKEN}},
            {type: 'favour', person: 'glasshouse', by: 1, when: {not: PROMISE_BROKEN}},
            {...mark('promise-broken', 'Marigold went home from the market because the tinkers were there.'), when: PROMISE_BROKEN},
            {type: 'word', person: 'glasshouse', by: -1, when: PROMISE_BROKEN},
            {type: 'settle', id: `${ID}/no-tinkers`, when: PROMISE_BROKEN},
          ],
          next: 'dusk'},
        {id: 'send-tinkers-home', words: 'Marigold has a right to be angry. Gasket, pack up your parts.',
          thought: 'Somebody has to go home, or this will go on all afternoon.',
          effects: [mark('odd-sent-home', 'You sent the tinkers home from the market.'), {type: 'word', person: 'bus-ring', by: -1}, {type: 'favour', person: 'glasshouse', by: 1}],
          lines: [say('gasket', "So that's how it is. We were asked to a market, and we're being sent home from it before noon. I'll know better the next time anybody from Tin Town asks me anywhere.")],
          next: 'dusk'},
        {id: 'send-growers-home', words: "Gasket has broken no rule here. Marigold, the gate is open if you can't bear it.",
          thought: "I asked the tinkers to come. I can't send them home for coming.",
          effects: [mark('guest-sent-home', 'You let the growers go home from the market.'), {type: 'word', person: 'glasshouse', by: -1}, {type: 'word', person: 'bus-ring', set: 'Friendly'}],
          lines: [say('marigold', "You'd keep the tinkers and send the growers home? Then you can eat tinkers' beans this winter, and I hope they're as good as a tinker's word.")],
          next: 'dusk'},
      ],
      notes: {
        // Seconds from the first raised voice until it is too late. Starting values for the builder and for Claude's walk.
        reachWithin: {beside: 25, apart: 45, lessIf: {any: [marked('hetty-came'), marked('rider-served')]}, less: 20},
      },
    },

    // Side by side, and the player did not reach them in time.
    glass: {
      when: {all: [{after: 'yard-quarrel'}, BESIDE, {seconds: 25, since: 'yard-quarrel'}]},
      cue: 'open.market.glass',
      lines: [say('marigold', "That's a frame gone, and a tray of seedlings gone with it! I knew how it would be the moment I saw where you'd put us. Finch, load the cart. We're going home.")],
      effects: [mark('glass-broken', 'A frame was broken at the market, and the growers went home.'), {type: 'word', person: 'glasshouse', by: -1}],
      next: 'dusk',
    },

    dusk: {
      when: {part: 'dusk'},
      cue: 'open.market.close',
      lines: [
        say('dot', "That's a hundred and four pies sold, and one given away to a child who looked at me. I haven't had a day like this one in twenty years."),
        say('auntie-solder', "Nobody was shot, nobody was robbed, and nobody stood on my hearth stones. I'm not saying that we should do it again. I'm saying that I've seen worse days."),
        say('cinder', "Did you see the bean woman handing seedlings to the tinker? I'd have bet an ember against that this morning, and I never bet embers.", {when: marked('quarrel-mended')}),
        say('cinder', "Somebody went home early today, and everybody else watched them go. A market shows you who your friends are. It shows them each other as well.",
          {when: SOMEBODY_WENT_HOME}),
      ],
      effects: [
        {type: 'made', id: `${ID}/market`, text: 'A market has been held at Tin Town.'}, {type: 'settle', id: `${ID}/hold-market`}, {type: 'word', person: 'dot', by: 1},
        // A found people who are at odds with a guest, and who were never asked, hear of it.
        {...mark('left-out', 'The tinkers of the Bus Ring were left out of the market.'), when: {all: [{cast: 'odd'}, {not: marked('odd-asked')}]}},
        {type: 'word', person: '@odd.people', by: -1, when: {all: [{cast: 'odd'}, {not: marked('odd-asked')}]}},
      ],
      next: [
        {when: marked('quarrel-mended'), to: 'mended'},
        {when: SOMEBODY_WENT_HOME, to: 'quarrel'},
        {to: 'peaceful'},
      ],
    },

    // The promise to Dot was not kept by its night.
    calledOff: {
      when: {all: [{after: 'asking'}, {due: `${ID}/hold-market`}]},
      lines: [say('dot', "I baked for a market that never came. I have a hundred pies going stale, and nobody to blame for it except you. Don't ask me to bake for one of your ideas again.")],
      effects: [mark('called-off'), {type: 'settle', id: `${ID}/hold-market`}, {type: 'word', person: 'dot', by: -1}],
      next: 'called-off',
    },
  },

  ends: ['mended', 'peaceful', 'quarrel', 'called-off', 'dots-own-market'],

  // What happens when the sign is never followed: Dot holds a small market at the diner, and Tin Town is not in it.
  ignored: [
    {afterChoice: {id: 'not-now', times: 2}, effects: [mark('dots-own-market')], next: 'dots-own-market'},
    {afterNights: 6, effects: [mark('dots-own-market')], next: 'dots-own-market'},
  ],

  // What somebody says afterwards.
  later: [
    {id: 'gasket-left-out', by: 'gasket', when: {all: [marked('left-out'), {cast: 'odd', is: 'bus-ring'}]},
      lines: [say('gasket', "We heard there was a market at Tin Town. Everybody in the land was asked to it, except the people who mend their axles. I shan't forget that, and I shan't pretend to.")]},
    {id: 'marigold-dots-market', by: 'marigold', when: {all: [marked('dots-own-market'), guestIs('glasshouse'), {cast: 'odd'}]},
      lines: [say('marigold', "Dot held a market at her diner. I went, and so did the tinkers, and nobody had thought about where to put us. I shan't be going to another one.")]},
  ],

  notes: {
    // The odd one is cast from the camps that are at odds with one of the three guests.
    castHostileWith: {odd: ['first', 'second', 'third']},
  },
};
