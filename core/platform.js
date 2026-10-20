/* ~track : platform bridge.
   The same files run in three places: a plain browser tab, an installed PWA,
   and the native desktop/android app (Tauri). This file hides the few
   differences so engine.js doesn't have to know where it's running.

   Exposes Track.platform:
     isNative            true inside the Tauri app
     saveFile(name, text) native "save as" dialog; resolves false if cancelled

   And, as side effects:
     - inside the native app, links with target="_blank" open in the system
       browser instead of trying (and failing) to open a new webview window
     - in a browser served over http(s), registers sw.js so the app works
       offline and can be installed as a PWA */
(function(){
  window.Track = window.Track || {};

  // present because src-tauri/tauri.conf.json sets app.withGlobalTauri
  const tauri = window.__TAURI__ || null;
  const isNative = !!tauri;

  async function saveFile(filename, content){
    if(!isNative) throw new Error('saveFile is only used inside the native app');
    const ext = (filename.split('.').pop() || 'txt').toLowerCase();
    const path = await tauri.dialog.save({ defaultPath: filename, filters: [{ name: ext, extensions: [ext] }] });
    if(!path) return false;
    await tauri.fs.writeTextFile(path, content);
    return true;
  }

  if(isNative){
    document.addEventListener('click', e=>{
      const a = e.target.closest && e.target.closest('a[target="_blank"][href]');
      if(!a) return;
      e.preventDefault();
      tauri.opener.openUrl(a.href).catch(err=> console.error('could not open link', err));
    });
  } else if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(err=> console.warn('service worker not registered', err));
    });
  }

  window.Track.platform = { isNative, saveFile };
})();
