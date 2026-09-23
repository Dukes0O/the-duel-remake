export const WEAPONS=Object.freeze({ufo:{name:'UFO JUMP',key:'1',cooldown:18},bomb:{name:'BOMB STORM',key:'2',cooldown:9},crossbow:{name:'CROSSBOW',key:'3',cooldown:4},star:{name:'STAR SHIELD',key:'4',cooldown:16}});
export const CPU_COMBAT=Object.freeze({
 easy:{interval:10,aimError:Math.PI/18,shieldReaction:.20,visionCos:.5},
 medium:{interval:7,aimError:.055,shieldReaction:.13,visionCos:.26},
 hard:{interval:5,aimError:.03,shieldReaction:.07,visionCos:.09},
});

// Gameplay values shared by the weapon, projectile, pickup and CPU systems.
// Zero and one in the callers are arithmetic identities or state defaults.
export const COMBAT_TUNING=Object.freeze({
 pointHeight:1,
 predictionCurveFloor:.25,
 burstLimit:32,
 projectileLimit:40,
 projectileSpawnOffset:3,
 projectileSpawnHeight:1,
 projectileInitialVerticalSpeed:13,
 projectileFloorClearance:.25,
 projectileBurstFloorClearance:.3,
 projectileHitHeight:4,
 projectileRadiusPadding:1.2,
 cooldownUpgradeDiscount:.15,
 shieldDuration:5,
 ufo:{baseDistance:12,distancePerLevel:4,gateMargin:2,scanStep:2,landingRadius:13,
  lateralClearance:2.7,obstacleReach:4,invulnerability:.35,calloutSeconds:2},
 bomb:{baseCount:8,countPerLevel:2,launchSpeed:27,gravity:18,lifetime:1.4,
  radius:22,radiusPerLevel:2,blastPower:1.3,powerPerLevel:.15,selfDamage:.25,
  impactCooldown:.3,soundCooldown:.12},
 crossbow:{baseSpeed:200,speedPerLevel:30,leadTime:.75,lifetime:2.5,
  power:.9,powerPerLevel:.2,aimHeightOffset:1},
 hit:{speedLoss:.65,pushImpulse:14,pushLimit:18,turnImpulse:.25,turnLimit:.65,
  damageLimit:5,flashSeconds:.35,calloutSeconds:1.3,overlapEpsilon:1e-8},
 pickup:{initialDelay:4,frontDistance:100,frontStep:40,frontCycle:3,
  interval:10,intervalStep:3,cycle:4,finishMargin:12,limit:4,
  contactDistance:3,lateralClearance:2.5,airClearance:3,
  lifetime:24,retentionBehind:30,chargeLimit:1,calloutSeconds:2},
 cpu:{boltLookahead:.4,attackRange:180,bombRange:35,pickupBombRange:50,
  aimSeedStageSalt:0x51ed,aimSeedShotSalt:0x9e3779b9},
 effects:{lifetime:1.4},
});
