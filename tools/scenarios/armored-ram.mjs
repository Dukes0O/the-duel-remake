// Exercise the real Wasteland car models after an off-centre rear ram.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled", 'isolated menu and renderer', 60_000);
  const result = await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',seed:1989}))throw Error('Wasteland race did not start');
    app.stop();
    const duel=app.duel,player=duel.state,rival=player.rival;
    Object.assign(player,{status:'racing',s:100,prevS:80,lateral:0,prevLateral:0,
      speedMph:125,invulnerableSec:0,traffic:[]});
    Object.assign(rival,{s:102.5,prevS:102.5,lateral:.6,prevLateral:.6,
      speedMph:25,headingError:0,pushVelocity:0,contactCooldown:0});
    player.input.steer=1;
    if(!duel._vehicleContact(player,rival,'rival'))throw Error('Rear ram missed the rival');
    if(player.impactTimer>0||!(rival._ramVerticalSpeed>0))throw Error('Protected ram failed: '+JSON.stringify({impactTimer:player.impactTimer,launch:rival._ramVerticalSpeed,push:rival.pushVelocity,playerSpeed:player.speedMph,rivalSpeed:rival.speedMph}));
    duel._rival(.2);
    if(!(rival.airHeight>.1))throw Error('Rival launch did not rise above the road');
    const point=duel.course.groundAt(rival.s,rival.lateral);
    app.inspectionCamera={position:[point.x+16,point.y+7,point.z+11],target:[point.x,point.y+2,point.z]};
    app.onFrame?.(player);
    window.__render.renderFrame();
    return {height:rival.airHeight,shove:rival.pushVelocity,playerCrashes:player.stageCrashes};
  })()`);
  if(result.playerCrashes!==0||!(result.shove>0))throw Error(`Ram response was not playable: ${JSON.stringify(result)}`);
  await context.screenshot('armored-ram');
  console.log(`Armored ram: rival ${result.height.toFixed(2)} m airborne and shoved, player keeps control.`);
}
