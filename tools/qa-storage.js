// Install before importing App/main. QA never reads or writes the real origin's
// storage, even if a developer opens a test page on the live game's port.
export function installIsolatedStorage(target = window) {
  // Keep only this private tab's disposable storage across a QA reload. A
  // fresh tab/profile still starts empty and never touches real localStorage.
  const prefix='__duel_qa_memory_only_v1:';
  let saved=[];
  try{if(target.name.startsWith(prefix))saved=JSON.parse(target.name.slice(prefix.length));}catch{}
  const memory = new Map(Array.isArray(saved)?saved:[]);
  const storage = {
    get length() { return memory.size; },
    key(index) { return [...memory.keys()][index] ?? null; },
    getItem(key) { return memory.get(String(key)) ?? null; },
    setItem(key, value) { memory.set(String(key), String(value)); },
    removeItem(key) { memory.delete(String(key)); },
    clear() { memory.clear(); },
  };
  // Failure stops the caller before it imports game code. Never fall back to
  // the user's localStorage if the isolated replacement cannot be installed.
  Object.defineProperty(target, 'localStorage', { configurable:true,value: storage });
  if(typeof target.addEventListener==='function')target.addEventListener('beforeunload',()=>{
    target.name=prefix+JSON.stringify([...memory]);
  });
  return memory;
}
