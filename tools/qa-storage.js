// Install before importing App/main. QA never reads or writes the real origin's
// storage, even if a developer opens a test page on the live game's port.
export function installIsolatedStorage(target = window) {
  // Keep the disposable career and database namespace together in this tab.
  // A new tab gets a new id, while a same-tab reload can restore both.
  const prefix='__duel_qa_tab_v2:';
  let saved=null;
  try{if(target.name?.startsWith(prefix))saved=JSON.parse(target.name.slice(prefix.length));}catch{}
  if(typeof saved?.id!=='string'||!Array.isArray(saved.rows))saved={id:target.crypto?.randomUUID?.()??Math.random().toString(36).slice(2),rows:[]};
  const memory = new Map(saved.rows);
  const sync=()=>{target.name=prefix+JSON.stringify({id:saved.id,rows:[...memory]});};
  const storage = {
    get length() { return memory.size; },
    key(index) { return [...memory.keys()][index] ?? null; },
    getItem(key) { return memory.get(String(key)) ?? null; },
    setItem(key, value) { memory.set(String(key), String(value));sync(); },
    removeItem(key) { memory.delete(String(key));sync(); },
    clear() { memory.clear();sync(); },
  };
  // Failure stops the caller before it imports game code. Never fall back to
  // the user's localStorage if the isolated replacement cannot be installed.
  Object.defineProperty(target, 'localStorage', { configurable:true,value: storage });
  const databaseName=name=>`${String(name)}__qa_tab_${saved.id}`;
  target.__qaIndexedDbName=databaseName;
  const native=target.indexedDB;
  if(native){
    const isolated=new Proxy(native,{get(factory,property){
      if(property==='open')return (name,version)=>version===undefined?
        factory.open(databaseName(name)):factory.open(databaseName(name),version);
      if(property==='deleteDatabase')return name=>factory.deleteDatabase(databaseName(name));
      const value=Reflect.get(factory,property,factory);
      return typeof value==='function'?value.bind(factory):value;
    }});
    Object.defineProperty(target,'indexedDB',{configurable:true,value:isolated});
  }
  sync();
  return memory;
}
