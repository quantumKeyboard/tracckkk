/* ~track : storage.
   A layered key/value store. Nothing app-specific lives here.

   Backends, in priority order for reads (writes go to all of them, for
   redundancy):
     1. File System Access -- a real local file the person explicitly chose,
        if their browser supports it and they've connected one.
     2. window.storage -- present inside the claude.ai artifact sandbox.
     3. localStorage -- works whenever this file is opened on its own,
        from disk or a static host.
     4. an in-memory object -- so a read/write can never throw, no matter
        what's blocked in the current environment.

   Track.createStore() returns a fresh instance. The File System Access
   handle is remembered in IndexedDB (the handle itself isn't JSON-safe, so
   it can't live in the same key/value string store as everything else). */
(function(){
  window.Track = window.Track || {};

  const DB_NAME = 'track-fsa';
  const STORE_NAME = 'handles';
  const HANDLE_KEY = 'data-file';

  function idbOpen(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)) return reject(new Error('no indexeddb'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = ()=>{ req.result.createObjectStore(STORE_NAME); };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }
  async function idbSet(key, value){
    const db = await idbOpen();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE_NAME,'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }
  async function idbGet(key){
    const db = await idbOpen();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE_NAME,'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = ()=> resolve(req.result || null);
      req.onerror = ()=> reject(req.error);
    });
  }
  async function idbDelete(key){
    const db = await idbOpen();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE_NAME,'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }

  function createStore(){
    let hasWS = !!(window.storage && typeof window.storage.get==='function');
    let hasLocal = false;
    try{ const k='__track_probe__'; localStorage.setItem(k,'1'); localStorage.removeItem(k); hasLocal = true; }
    catch(err){ hasLocal = false; }
    const memory = {};

    const fsaSupported = !!(window.isSecureContext && window.showSaveFilePicker);
    let fileHandle = null;
    let filePermitted = false; // cached result of the last permission check

    async function readFile(){
      if(!fileHandle || !filePermitted) return null;
      try{
        const file = await fileHandle.getFile();
        const text = await file.text();
        return (text && text.trim()) ? text : null;
      }catch(err){ return null; }
    }
    async function writeFile(value){
      if(!fileHandle || !filePermitted) return false;
      try{
        const writable = await fileHandle.createWritable();
        await writable.write(value);
        await writable.close();
        return true;
      }catch(err){ return false; }
    }

    return {
      fsaSupported,

      async get(key){
        const fromFile = await readFile();
        if(fromFile != null) return fromFile;
        if(hasWS){
          try{
            const res = await window.storage.get(key, false);
            if(res && res.value) return res.value;
          }catch(err){ /* not found in this backend, keep trying others */ }
        }
        if(hasLocal){
          try{
            const v = localStorage.getItem(key);
            if(v!=null) return v;
          }catch(err){ /* storage blocked, fall through */ }
        }
        return (key in memory) ? memory[key] : null;
      },
      async set(key, value){
        memory[key] = value;
        await writeFile(value); // best-effort; localStorage below still catches it if this fails
        if(hasWS){ try{ await window.storage.set(key, value, false); }catch(err){ /* other layers still hold it */ } }
        if(hasLocal){ try{ localStorage.setItem(key, value); }catch(err){ /* quota or blocked, ignore */ } }
      },

      /* ---- file-connection surface, used by the "storage" settings section ---- */

      // called once at boot: silently reattaches to a previously-connected file
      // if the browser still remembers permission for it (no user gesture yet).
      async restoreConnection(){
        if(!fsaSupported) return { ok:false };
        let handle;
        try{ handle = await idbGet(HANDLE_KEY); }catch(err){ handle = null; }
        if(!handle) return { ok:false };
        fileHandle = handle;
        try{
          const perm = await handle.queryPermission({mode:'readwrite'});
          filePermitted = (perm === 'granted');
        }catch(err){ filePermitted = false; }
        return { ok:true, name:handle.name, needsPermission: !filePermitted };
      },

      // must be called from a user gesture (a click) -- re-shows the browser's
      // permission prompt for the already-remembered file.
      async requestPermission(){
        if(!fileHandle) return { ok:false };
        try{
          const perm = await fileHandle.requestPermission({mode:'readwrite'});
          filePermitted = (perm === 'granted');
        }catch(err){ filePermitted = false; }
        return { ok: filePermitted };
      },

      // opens the browser's file picker so the person can create a new file or
      // choose an existing one. returns any content already in that file so the
      // caller can decide whether to load it instead of overwriting it.
      async connect(){
        if(!fsaSupported) return { ok:false, error:'not supported' };
        try{
          const handle = await window.showSaveFilePicker({
            suggestedName: 'track-data.json',
            types: [{ description:'track data', accept:{'application/json':['.json']} }],
          });
          fileHandle = handle;
          filePermitted = true; // picking it via the dialog itself grants this session's permission
          try{ await idbSet(HANDLE_KEY, handle); }catch(err){ /* it'll just ask again next session */ }
          let existingContent = null;
          try{
            const file = await handle.getFile();
            const text = await file.text();
            if(text && text.trim()) existingContent = text;
          }catch(err){ /* brand new or unreadable, treat as empty */ }
          return { ok:true, name:handle.name, existingContent };
        }catch(err){
          if(err && err.name==='AbortError') return { ok:false, aborted:true };
          return { ok:false, error:String(err) };
        }
      },

      async disconnect(){
        fileHandle = null;
        filePermitted = false;
        try{ await idbDelete(HANDLE_KEY); }catch(err){ /* ignore */ }
      },

      getStatus(){
        return { connected: !!(fileHandle && filePermitted), name: fileHandle ? fileHandle.name : null, needsPermission: !!fileHandle && !filePermitted };
      },
    };
  }

  window.Track.createStore = createStore;
})();
