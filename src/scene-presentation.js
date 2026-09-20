// Use the same scene pass in both presets so shadows, clearing and profiling
// stay consistent. Direct canvas rendering supplies tone mapping, sRGB output
// without the off-screen bloom/composite passes.
export function renderMainView(renderer,composer,high){
  if(high){composer.render();return;}
  const pass=composer.passes[0],toScreen=pass.renderToScreen,autoClear=renderer.autoClear;
  pass.renderToScreen=true;
  try{pass.render(renderer,null,null);}
  finally{pass.renderToScreen=toScreen;renderer.autoClear=autoClear;}
}
