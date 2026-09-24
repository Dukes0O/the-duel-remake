import assert from 'node:assert/strict';
import {ownTestCourses,testCourseAccess} from './career-fixture.mjs';
import {App,ROUTE_PREFERENCE_KEY} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {PLAYERS_KEY,createProfile,createPlayerRegistry,createPlayer,savePlayers,normalizeProfile} from '../src/progression.js';
import {DEFAULT_RACE_SETTINGS,normalizeRaceSettings,raceSettingsChoices} from '../src/race-settings.js';
import {syncRaceChoiceButtons} from '../src/race-settings-ui.js';

let checks=0;const ok=(v,label)=>{assert.ok(v,label);checks++;},same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};globalThis.localStorage=storage;
const setup={startStage:1,car:'stuttgart_959s',difficulty:'pro',cpuDifficulty:'medium',mode:'timetrial'};
let app=new App();const first=app.player.id;
same(app.getRaceChoices(),raceSettingsChoices(DEFAULT_RACE_SETTINGS),'Fresh player uses canonical defaults');
ownTestCourses(app);app.setRaceSettings(setup);app.setRouteVariant('route_b');app.setLightingMood('golden');app.setGhostEnabled(false);
const saved=JSON.parse(memory.get(PLAYERS_KEY)).players[0].profile.raceSettings;
same(saved,{version:1,eventId:COURSE[1].id,car:'stuttgart_959s',difficulty:'pro',cpuDifficulty:'medium',mode:'timetrial',routeVariant:'route_b',lightingMood:'golden',ghostEnabled:false,footCamera:'first-person'},'Every setup change saves before starting a race');
same(new App().getRaceChoices(),setup,'Reload restores full race choices');
const added=app.addPlayer('Second Driver');ok(added.ok,'Second player created');const second=app.player.id;
same(app.getRaceChoices(),raceSettingsChoices(DEFAULT_RACE_SETTINGS),'New player does not inherit another setup');same([app.menuRouteId,app.lightingMood,app.ghostEnabled],['route_a','clear',true],'New route and visual defaults are independent');
ownTestCourses(app);app.setRaceSettings({startStage:2,cpuDifficulty:'hard',difficulty:'casual',mode:'duel'});app.setRouteVariant('route_c');app.setLightingMood('overcast');
app.selectPlayer(first);same(app.getRaceChoices(),setup,'Player switch restores car, event, CPU, mode and transmission');same([app.menuRouteId,app.getMenuSeed(),app.lightingMood,app.ghostEnabled],['route_b',42,'golden',false],'Player switch restores route, lighting and ghost');
app.startCampaign();same([app.duel.state.stageIndex,app.duel.state.car,app.duel.state.difficulty,app.duel.state.cpuDifficulty,app.duel.state.mode,app.duel.state.seed],[1,'stuttgart_959s','pro','medium','timetrial',42],'Start without explicit options uses the visible restored setup');
const activeBefore=JSON.stringify(app.duel.state);ok(!app.setRaceSettings({car:'falcone_f42',startStage:0}),'Race settings cannot mutate a started simulation');same(JSON.stringify(app.duel.state),activeBefore,'Rejected menu change leaves the race untouched');
app.returnToMenu();app.selectPlayer(second);same(app.getRaceChoices(),{startStage:2,car:'falcone_f42',difficulty:'casual',cpuDifficulty:'hard',mode:'duel'},'Second setup survives first player racing');
same(new App().getRaceChoices(),app.getRaceChoices(),'Active player and preferences survive reload together');

// Challenge selections keep the chosen owned car and a natural route
// preference even though the challenge itself uses its fixed canonical course.
app.profile={...app.profile,unlockedCars:[...app.profile.unlockedCars,'banshee_muscle']};app._saveProfile();
const chase=COURSE.findIndex(stage=>stage.kind==='chase');app.setRaceSettings({startStage:chase,mode:'timetrial',car:'falcone_f42'});
same([app.getRaceChoices().car,app.getRaceChoices().mode,app.getMenuSeed(),app.menuRouteId],['falcone_f42','duel',1989,'route_c'],'Challenge preserves the chosen car and objective mode without losing the natural route');
const reloaded=new App();same(reloaded.getRaceChoices(),app.getRaceChoices(),'Owned challenge restores by stable event ID');same(reloaded.profile.raceSettings.eventId,COURSE[chase].id,'Saved event key is independent of menu index');
reloaded.setRaceSettings({startStage:0});same(reloaded.getMenuSeed(),17,'Returning to natural circuit restores its route context');
const invalid=normalizeProfile({...createProfile(),courses:testCourseAccess(),raceSettings:{version:1,eventId:COURSE[chase].id,car:'titan_monster',mode:'wrong',cpuDifficulty:'__proto__',difficulty:'manual',routeVariant:'route_z',lightingMood:'night',ghostEnabled:'false',seed:123,credits:99999}});
same(invalid.raceSettings,{...DEFAULT_RACE_SETTINGS,eventId:COURSE[chase].id},'Locked vehicle falls back safely while the chosen course stays available');
same(normalizeRaceSettings({eventId:COURSE[1].id,stageIndex:999,car:'stuttgart_959s'},{...createProfile(),courses:testCourseAccess()}).eventId,COURSE[1].id,'Stable event ID wins over stale numeric menu index');
for(const value of[null,[],false,'stuttgart_959s',42])same(normalizeRaceSettings(value,createProfile()),DEFAULT_RACE_SETTINGS,'Malformed stored preferences are safe');

// Every legacy profile receives the original global preferences once. Changes
// by one player cannot later be mistaken for another player's old preferences.
memory.clear();let registry=createPlayerRegistry();registry=createPlayer(registry,'Legacy Two').registry;registry.activePlayerId='player-1';savePlayers(registry);
memory.set(ROUTE_PREFERENCE_KEY,'route_c');memory.set('duel_lighting_mood','golden');memory.set('duel_ghost_enabled','false');app=new App();
same([app.menuRouteId,app.lightingMood,app.ghostEnabled],['route_c','golden',false],'Legacy browser preferences migrate');
app.setRouteVariant('route_b');app.setLightingMood('overcast');app.setGhostEnabled(true);app.selectPlayer(registry.players[1].id);
same([app.menuRouteId,app.lightingMood,app.ghostEnabled],['route_c','golden',false],'Legacy second player retains its migration snapshot');
ok(app.players.players.every(player=>player.profile.raceSettings?.version===1),'All migrated players now have their own versioned preferences');

// URL custom seeds remain session overrides and never become persisted route IDs.
globalThis.window={location:{search:'?seed=9999'},addEventListener(){}};app=new App();same(app.getMenuSeed(),9999,'Explicit custom URL retains its route');
app.setRaceSettings({difficulty:'pro'});same(app.getMenuSeed(),9999,'Changing transmission does not erase a custom URL route');same(app.profile.raceSettings.routeVariant,'route_c','Custom numeric seed does not corrupt saved curated preference');
app.addPlayer('URL Fresh');same(app.getMenuSeed(),1989,'New player does not inherit custom route from the former player');delete globalThis.window;

// Real UI helper restores all button groups; mode cannot silently show Duel
// while the actual restored start options say Time Trial, or vice versa.
const buttons=[];for(const[key,values]of Object.entries({mode:['duel','timetrial'],difficulty:['casual','pro'],cpuDifficulty:['easy','medium','hard']}))for(const value of values){const state={};buttons.push({dataset:{[key]:value},state,classList:{toggle:(name,on)=>state[name]=on},setAttribute:(name,value)=>state[name]=value});}
syncRaceChoiceButtons({querySelectorAll:()=>buttons},setup);
for(const button of buttons){const[key,value]=Object.entries(button.dataset)[0];same(button.state,{on:value===setup[key],'aria-pressed':String(value===setup[key])},'Restored control matches actual race option');}

globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};app=new App();const sessionFirst=app.player.id;ownTestCourses(app);app.setRaceSettings(setup);app.setRouteVariant('route_b');app.addPlayer('Session Two');app.setRaceSettings({cpuDifficulty:'hard'});app.selectPlayer(sessionFirst);
same(app.getRaceChoices(),setup,'Storage failure preserves each session-only setup');same(app.menuRouteId,'route_b','Session-only route remains per-player');ok(app.profileSaved===false,'Save failure stays visible to the app');same(new App().getRaceChoices(),raceSettingsChoices(DEFAULT_RACE_SETTINGS),'Unavailable storage cannot invent cross-session persistence');
delete globalThis.localStorage;
console.log(`Race settings: ${checks} per-player save/switch/reload, vehicle ownership, open course choice, route context, legacy migration, UI and session-only checks passed.`);
