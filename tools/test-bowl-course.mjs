import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {BOWL_COURSE} from '../src/bowl/bowl-course.js';
import {addArenaCrushables} from '../src/arena-props.js';

const check=(condition,message)=>assert.ok(condition,message);
const bowl=new Course(BOWL_COURSE,1989);
check(BOWL_COURSE.bowl&&BOWL_COURSE.timeOfDay==='night','The Bowl is a distinct night course.');
check(bowl.features.ramps.length===3,'The Bowl has three authored launch ramps.');
check(bowl.features.ramps.every(ramp=>bowl.jumpAt(ramp.start+(ramp.end-ramp.start)/2)>0),
  'Every ramp gives a positive launch surface.');
check(bowl.features.crushables.length===15,'The crush line grows through cars, larger shells and the burning heap.');
check(bowl.features.flameJets.length===3,'Flame jet positions are seeded course features.');

const world=new THREE.Group(),shells=addArenaCrushables(world,bowl);
check(shells.children.length===bowl.features.crushables.length,'Every crush target has a visible salvage shell.');
const crushed=bowl.features.crushables[0].id;
for(let i=0;i<120;i++)shells.userData.updateSimulation({crushedProps:[crushed]},1/60);
const bounds=new THREE.Box3().setFromObject(shells.children[0]);
check(bounds.max.y<1.3,'A crushed course item collapses below its intact height.');
check(shells.children[1].scale.y===1,'Crushing one item leaves the others intact.');

check(COURSE.slice(0,7).map(course=>course.id).join(',')===
  'pacific-canyon,high-country,harbor-highlands,titan-arena,midnight-chase,ridge-rally,titan-stunt-trial',
  'The existing course positions and identities are unchanged.');
console.log('Bowl course ramps, crush line, props and existing course order passed.');
