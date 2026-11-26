import {checkSentence, checkTalkRow, requireSound} from '../check-tables.js';

const words = {
  odessa: {
    Sworn: "Bring that poor car in here. For you it's {price} scrap, and I'll straighten the bumper as well, because I can't stand looking at it.",
    Friendly: "Somebody has been hitting your car with other cars. I can have it right again for {price} scrap, if you can spare it.",
    Strangers: "I can mend that. It will cost you {price} scrap, and I'd like to see the scrap before I pick up a hammer.",
    Wary: "I'll mend it for {price} scrap. That's more than I'd charge a friend, and I think you know why.",
    Cold: "I'm busy today, and I expect I'll be busy tomorrow as well.",
    yes: "Yes, please mend it.",
    no: "Not today, thank you.",
    decline: "Suit yourself. The car knows where to find me, even if you don't.",
    done: "There, that's every panel back where it belongs. Try to bring it home in one piece this time, because I get attached.",
    short: "You're {short} scrap short, and I don't mend half a car. Come back when you have it, and I'll keep the bay free.",
    clean: "There isn't a mark on it. Either you've been driving very carefully, or you haven't been anywhere interesting.",
    bay: "I can't mend a car from across the yard. Park it on the marked patch outside my door, and then we'll talk.",
    patch: "I can see you've been at this with a wrench. It's a fair patch, and it will hold for a while, but a wrench out on the road only ever does about half the job.",
    idle: "Mind the sparks. If you're only here to watch me work, then stand over by the door.",
    dark: "The forge is cold and so am I. Whatever it is, bring it to me in the morning.",
  },
  moss: {
    Sworn: "I'll wash it for {price} scrap, and I'll do it properly, the way I do Bess. I don't say that to everybody.",
    Friendly: "That car could do with a wash. It's {price} scrap for the brush and the bucket, and I'll throw in the wheels for nothing.",
    Strangers: "I wash Bess every evening, so one more won't hurt me. It will be {price} scrap, and the water is grey before I even start.",
    Wary: "I'll wash it for {price} scrap. Bess has first go at the clean water, though, and you'll have what's left.",
    Cold: "I've only enough water for Bess today. I'm sorry, but that's how it is.",
    yes: "Yes, please give it a wash.",
    no: "No, thank you, I'll leave it as it is.",
    decline: "Then leave it dirty. Bess won't mind being the best-looking thing in the yard.",
    done: "There you are. I'd forgotten what colour it was under all that, and I think the car had forgotten as well.",
    short: "You haven't got {price} scrap, and water doesn't come free out here. I'd let you off if it were up to me, but it's Auntie who counts the tin.",
    clean: "There's nothing on it for me to wash. Come back when you've been somewhere dusty, which won't take you long round here.",
    ash: "That's ash on your car, and plenty of it. I'd know that grey anywhere. It comes from the burn, where Old Smoke's people drive. Shall I take it off for you?",
    idle: "Bess is resting. She likes company, as long as nobody mentions hills in front of her.",
    dark: "Bess is asleep, and I ought to be. Could it wait until the morning?",
  },
};

export const WIM_CLEAN = "Your car is clean today. I liked it better when it was dirty, because then I could draw on it.";
export const FORGE_TALK = Object.freeze(Object.fromEntries(Object.entries(words).map(([person, lines]) => {
  requireSound(Object.entries(lines).map(([id, text]) => ({id, text})), row => checkSentence(row.text), person);
  const scene = person + '/service';
  return [person, requireSound([{id: scene, scene}], checkTalkRow, person)];
})));

export function forgeLine(person, key, values = {}) {
  return {speaker: person, words: words[person][key].replace(/\{(price|short)\}/g, (_, name) => values[name])};
}
