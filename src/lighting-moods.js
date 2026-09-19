// Pure, shared settings for the renderer and menu. Colours use the renderer's
// existing hex/CSS convention; cloudTint is linear RGB for the sky shader.
export const LIGHTING_MOODS=Object.freeze({
  clear:Object.freeze({label:'Clear'}),
  golden:Object.freeze({label:'Golden hour'}),
  overcast:Object.freeze({label:'Overcast'}),
});
export const DEFAULT_SUN_OFFSET=Object.freeze({x:-75,y:90,z:50});
const GOLDEN_SUN_OFFSET=Object.freeze({x:-90,y:36,z:65});
const OVERCAST_SUN_OFFSET=Object.freeze({x:-60,y:105,z:45});
const CLEAR_CLOUD_TINT=Object.freeze([.88,.89,.86]);
const GOLDEN_CLOUD_TINT=Object.freeze([1,.82,.64]);
const OVERCAST_CLOUD_TINT=Object.freeze([.82,.85,.86]);
const BASE={
  desert:{fog:0xdec1a0,top:'#466d86',horizon:'#f6bc82',ground:0x714226,sun:3.3,hemi:1.65,env:.85},
  alpine:{fog:0xb5c6ca,top:'#426e87',horizon:'#c4d4d8',ground:0x526153,sun:3.05,hemi:1.8,env:.8},
  coast:{fog:0xa6c8ce,top:'#326e92',horizon:'#bcd7d8',ground:0x647658,sun:3.6,hemi:1.7,env:.9},
  city:{fog:0x1a2839,top:'#0d1c32',horizon:'#3c4b61',ground:0x202a36,sun:.18,hemi:.65,env:.32},
  arena:{fog:0x8396a8,top:'#254361',horizon:'#d4b5a1',ground:0x705442,sun:2.1,hemi:1.6,env:.85},
};
const GOLDEN={
  desert:{fog:0xe2b08a,top:'#486a85',horizon:'#efae76',ground:0x86523b},
  alpine:{fog:0xc5b9ae,top:'#426b89',horizon:'#edbf95',ground:0x62604c},
  coast:{fog:0xbab6a8,top:'#3c6d91',horizon:'#ecc596',ground:0x7b7454},
  arena:{fog:0xbeaca4,top:'#3b526d',horizon:'#e9b183',ground:0x7a5848},
};
const OVERCAST={
  desert:{fog:0xb5bcbd,top:'#7c8d98',horizon:'#bac3c2',ground:0x665e51},
  alpine:{fog:0xb6c3c6,top:'#748894',horizon:'#c0cdcf',ground:0x566458},
  coast:{fog:0xb2c7cc,top:'#728d9c',horizon:'#c6d4d5',ground:0x647263},
  arena:{fog:0xa4b3bc,top:'#718390',horizon:'#b8c2c7',ground:0x625e55},
};

export function normalizeLightingMood(value){
  return typeof value==='string'&&Object.hasOwn(LIGHTING_MOODS,value)?value:'clear';
}

const settings=new Map();
for(const[theme,base]of Object.entries(BASE))for(const mood of Object.keys(LIGHTING_MOODS)){
  const night=theme==='city';
  if(night&&mood!=='clear')continue;
  let outside={...base,fogNear:night?160:260,fogFar:night?1250:1650,
    sunColor:night?0xa2bde6:theme==='alpine'?0xf1f0df:0xffddac,
    exposure:night?1.12:1.04,bloom:night?.32:.18,sunOffset:DEFAULT_SUN_OFFSET,
    sunStrength:night?.03:1,cloudCover:1,cloudTint:CLEAR_CLOUD_TINT};
  if(mood==='golden')outside={...outside,...GOLDEN[theme],sun:base.sun*.9,hemi:base.hemi*.82,env:base.env*.9,
    sunColor:0xffb76b,exposure:1.09,bloom:.22,fogNear:240,fogFar:1550,
    sunOffset:GOLDEN_SUN_OFFSET,sunStrength:.95,cloudCover:.75,cloudTint:GOLDEN_CLOUD_TINT};
  if(mood==='overcast')outside={...outside,...OVERCAST[theme],sun:base.sun*.16,hemi:base.hemi*1.18,env:base.env*.9,
    sunColor:0xe1eaf0,exposure:1.07,bloom:.12,fogNear:230,fogFar:1450,
    sunOffset:OVERCAST_SUN_OFFSET,sunStrength:.22,cloudCover:1.35,cloudTint:OVERCAST_CLOUD_TINT};
  settings.set(`${theme}:${mood}:outside`,Object.freeze(outside));
  settings.set(`${theme}:${mood}:tunnel`,Object.freeze({...outside,hemi:.32,sun:.15,env:.28,exposure:1.3,bloom:.32}));
}

// Results and nested values are immutable and cached: this lookup does not
// allocate new materials, colours, vectors or setting objects each frame.
export function resolveLightingSettings(theme,options={}){
  const{mood='clear',night=false,tunnel=false}=options||{};
  const key=theme==='city'||night===true?'city':Object.hasOwn(BASE,theme)?theme:'desert';
  return settings.get(`${key}:${key==='city'?'clear':normalizeLightingMood(mood)}:${tunnel===true?'tunnel':'outside'}`);
}
