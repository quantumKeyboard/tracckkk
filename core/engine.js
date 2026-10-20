/* ~track : engine.
   This is the one file plugin authors never need to open. It owns state,
   persistence, drag/resize, the seven built-in system panels, and the
   plugin loader that turns window.TrackPlugins entries into real elements
   on the canvas. See docs/PLUGIN_GUIDE.md for the plugin contract itself. */
(function(){

  const ICONS = window.Track.ICONS;
  const THEMES = window.Track.THEMES;
  const THEME_NAMES = window.Track.THEME_NAMES;
  const applyTheme = window.Track.applyTheme;

  /* ---------- helpers ---------- */
  const GRID = 22;
  function snap(v){ return Math.round(v/GRID)*GRID; }
  function uid(){ return (window.crypto && crypto.randomUUID) ? crypto.randomUUID().slice(0,8) : Math.random().toString(36).slice(2,10); }
  function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function withAlpha(c,a){ if(!c) return `rgba(0,0,0,${a})`; return c.includes('/') ? c : c.replace(/\)\s*$/, ` / ${a})`); }
  function chartColor(i){ return cssVar('--chart-'+((i%5)+1)) || '#888'; }
  function randomImageUrl(){ return `https://picsum.photos/seed/${Math.random().toString(36).slice(2,9)}/600/450`; }

  /* ---------- state ---------- */
  function createDefaultState(){
    const now = new Date();
    const habitNames = ['track'];
    function el(type,x,y,w,h,z){ return {id:type, type, x,y,w,h,z, visible:true}; }
    return {
      version: 1,
      theme:'blue', dark:false, sharp:false, goal:80,
      month:{y:now.getFullYear(), m:now.getMonth()},
      habits: habitNames.map(n=>({id:uid(), name:n})),
      tracker:{},
      kanban:{ columns:[
        {id:uid(), title:'to do', cards:[]},
        {id:uid(), title:'doing', cards:[]},
        {id:uid(), title:'done', cards:[]},
      ]},
      notes:'',
      images:{ card:randomImageUrl(), carousel:[randomImageUrl(),randomImageUrl(),randomImageUrl(),randomImageUrl()] },
      elements:[
        el('tracker',24,24,900,420,10),
        el('kanban',948,24,420,500,11),
        el('insights',24,468,600,440,12),
        el('calendar',1392,24,280,300,13),
        el('notes',1392,340,280,220,14),
        el('carousel',648,468,340,320,15),
        el('imagecard',1012,468,280,320,16),
      ],
    };
  }
  /* migrate a previous save (object-map "widgets" + separate "blocks" array) into the
     unified "elements" array; safe no-op if the data is already in the new shape */
  function migrateElements(loaded, defaults){
    if(loaded && Array.isArray(loaded.elements)) return loaded.elements.slice();
    const els = [];
    if(loaded && loaded.widgets && typeof loaded.widgets==='object'){
      Object.keys(loaded.widgets).forEach(k=>{
        const w = loaded.widgets[k];
        els.push({ id:k, type:k, x:w.x, y:w.y, w:w.w, h:w.h, z:w.z||10, visible: w.visible!==false });
      });
      if(Array.isArray(loaded.blocks)){
        loaded.blocks.forEach(b=>{
          els.push({ id:b.id, type:'note', x:b.x, y:b.y, w:b.w, h:b.h, z:b.z||10, data:{title:b.title||'note', text:b.text||''} });
        });
      }
      return els;
    }
    return defaults.elements.slice();
  }
  function mergeState(defaults, loaded){
    const merged = Object.assign({}, defaults, loaded||{});
    merged.images = Object.assign({}, defaults.images, (loaded&&loaded.images)||{});
    if(!Array.isArray(merged.habits) || merged.habits.length===0) merged.habits = defaults.habits;
    if(!merged.kanban || !Array.isArray(merged.kanban.columns)) merged.kanban = defaults.kanban;
    if(!merged.month) merged.month = defaults.month;
    merged.elements = migrateElements(loaded, defaults);
    defaults.elements.forEach(d=>{
      const mod = MODULES[d.type];
      if(mod && mod.singleton && !merged.elements.some(e=>e.type===d.type)) merged.elements.push(Object.assign({}, d));
    });
    delete merged.widgets;
    delete merged.blocks;
    return merged;
  }

  let state = createDefaultState();
  let zCounter = 100;
  let sidebarOpen = false;
  let carouselIndex = 0;
  let storageStatus = { connected:false, name:null, needsPermission:false };
  const elEls = {};
  const charts = { bar:null, area:null };
  let saveTimer = null;

  /* ---------- persistence ---------- */
  const STORE_KEY = 'track-state';
  const Store = window.Track.createStore();
  async function loadState(){
    try{
      const raw = await Store.get(STORE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(err){ /* corrupt or missing, fall back to defaults */ }
    return null;
  }
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 500);
  }
  async function saveState(){
    clearTimeout(saveTimer); saveTimer=null;
    try{ await Store.set(STORE_KEY, JSON.stringify(state)); flashSaved(); }
    catch(err){ console.error('save failed', err); }
  }
  function flashSaved(){
    const dot = document.getElementById('save-dot');
    if(!dot) return;
    dot.title = storageStatus.connected ? ('saved to '+storageStatus.name) : 'saved locally';
    dot.classList.remove('pulse'); void dot.offsetWidth; dot.classList.add('pulse');
  }
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveState(); });
  window.addEventListener('pagehide', ()=>{ saveState(); });

  /* ---------- shell wiring (markup itself lives in index.html) ---------- */
  function wireShell(){
    document.getElementById('gear-btn').addEventListener('click', ()=> sidebarOpen ? closeSidebar() : openSidebar());
    document.getElementById('overlay').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    initSettingsEvents(document.getElementById('sidebar-body'));
  }
  function openSidebar(){ sidebarOpen=true; document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('show'); renderSettings(); }
  function closeSidebar(){ sidebarOpen=false; document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); }

  /* ---------- plugin loading ---------- */
  /* note/checklist/counter are always loaded via static <script> tags in
     index.html, so window.TrackPlugins already has them by the time this
     runs. this only needs to fetch whatever extra community plugins are
     listed in plugins/manifest.js (as window.TrackExtraPlugins).

     loaded one at a time, on purpose: a <script> tag's onload event only
     means "the file was fetched", not "it ran without errors" -- a typo or
     a forgotten window.TrackPlugins.push(...) still fires onload, so a
     broken plugin would otherwise fail completely silently. loading them
     sequentially lets us reliably tell which specific file didn't register
     anything, and surface that in settings instead of just doing nothing. */
  let pluginWarnings = [];
  function loadExtraPlugins(){
    const list = window.TrackExtraPlugins || [];
    pluginWarnings = [];
    return list.reduce((chain, name)=> chain.then(()=> loadOnePlugin(name)), Promise.resolve());
  }
  function loadOnePlugin(name){
    return new Promise(resolve=>{
      const before = (window.TrackPlugins || []).length;
      let runtimeError = null;
      function onWindowError(ev){
        if(ev && ev.filename && ev.filename.indexOf(name) !== -1) runtimeError = ev.message || 'script error';
      }
      window.addEventListener('error', onWindowError);
      const s = document.createElement('script');
      s.src = 'plugins/' + name;
      function finish(networkError){
        window.removeEventListener('error', onWindowError);
        const after = (window.TrackPlugins || []).length;
        if(networkError){
          pluginWarnings.push({ file:name, reason:'could not load the file -- check the filename in manifest.js matches the file in /plugins exactly, including capitalization and ".plugin.js".' });
        } else if(runtimeError){
          pluginWarnings.push({ file:name, reason:'error while running the file: '+runtimeError });
        } else if(after<=before){
          pluginWarnings.push({ file:name, reason:'the file loaded but never called window.TrackPlugins.push(...) -- check it follows the shape in docs/PLUGIN_GUIDE.md.' });
        }
        resolve();
      }
      s.onload = ()=> finish(false);
      s.onerror = ()=> finish(true);
      document.head.appendChild(s);
    });
  }
  const pluginApi = {
    getData(id){ const e = getElement(id); return e && e.data; },
    save: scheduleSave,
    rerender,
    escapeHtml,
    uid,
    icons: ICONS,
  };
  function buildModules(){
    // the seven built-in panels are defined further down as plain objects
    // shaped exactly like a plugin (label/min/defaultSize/render/init), just
    // marked singleton and never routed through window.TrackPlugins.
    Object.assign(MODULES, SYSTEM_MODULES);
    (window.TrackPlugins || []).forEach(p=>{
      if(!p || !p.type){ pluginWarnings.push({ file:'(unknown)', reason:'a plugin was missing a "type" field and was skipped.' }); return; }
      if(MODULES[p.type]) pluginWarnings.push({ file:p.type, reason:'this type is already used by another element -- the later one replaced it.' });
      MODULES[p.type] = {
        label: p.label || p.type,
        icon: p.icon || ICONS.grid,
        category: 'block',
        singleton: false,
        min: p.min || [200,160],
        defaultSize: p.defaultSize || p.min || [240,220],
        createData: p.createData ? p.createData.bind(p) : (()=>({title:p.label||p.type})),
        render: (body,id)=> p.render(body, id, pluginApi),
        init: p.init ? (body,id)=> p.init(body, id, pluginApi) : null,
      };
    });
  }

  /* ---------- element registry (the "modular" core) ---------- */
  const MODULES = {};
  function getElement(id){ return state.elements.find(e=>e.id===id); }
  function rerender(id){
    const entry = elEls[id];
    const inst = getElement(id);
    if(!entry || !inst) return;
    const mod = MODULES[inst.type];
    if(mod) mod.render(entry.body, id);
  }
  function rerenderAll(){ Object.keys(elEls).forEach(rerender); }

  function bringToFront(wrapper, id){
    zCounter++; wrapper.style.zIndex = zCounter;
    const el = getElement(id); if(el) el.z = zCounter;
  }
  function updateCanvasSize(){
    const inner = document.getElementById('canvas-inner');
    if(!inner) return;
    let maxX = 1760, maxY = 980;
    state.elements.forEach(inst=>{
      if(inst.visible===false) return;
      maxX = Math.max(maxX, inst.x+inst.w+80);
      maxY = Math.max(maxY, inst.y+inst.h+80);
    });
    inner.style.width = maxX+'px';
    inner.style.height = maxY+'px';
  }
  /* both take the STABLE id string -- never the mutable data object -- so a full state
     reassignment (loading saved data, importing, resetting) can never leave a drag or
     resize writing into an orphaned copy that never gets saved. */
  function makeDraggable(wrapper, id){
    const header = wrapper.querySelector('.widget-header');
    header.addEventListener('pointerdown', e=>{
      if(e.target.closest('button') || e.target.isContentEditable) return;
      e.preventDefault();
      const startX=e.clientX, startY=e.clientY;
      const startLeft=wrapper.offsetLeft, startTop=wrapper.offsetTop;
      bringToFront(wrapper, id);
      function move(ev){
        const dx=ev.clientX-startX, dy=ev.clientY-startY;
        wrapper.style.left = snap(Math.max(0, startLeft+dx))+'px';
        wrapper.style.top = snap(Math.max(0, startTop+dy))+'px';
        updateCanvasSize();
      }
      function up(){
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        const el = getElement(id);
        if(el){ el.x = wrapper.offsetLeft; el.y = wrapper.offsetTop; scheduleSave(); }
      }
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  }
  function makeResizable(wrapper, id, minW, minH){
    const handle = wrapper.querySelector('.resize-handle');
    handle.addEventListener('pointerdown', e=>{
      e.stopPropagation(); e.preventDefault();
      const startX=e.clientX, startY=e.clientY;
      const startW=wrapper.offsetWidth, startH=wrapper.offsetHeight;
      bringToFront(wrapper, id);
      function move(ev){
        const dw=ev.clientX-startX, dh=ev.clientY-startY;
        wrapper.style.width = snap(Math.max(minW, startW+dw))+'px';
        wrapper.style.height = snap(Math.max(minH, startH+dh))+'px';
        if(id==='insights') resizeCharts();
        updateCanvasSize();
      }
      function up(){
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        const el = getElement(id);
        if(el){ el.w = wrapper.offsetWidth; el.h = wrapper.offsetHeight; scheduleSave(); }
      }
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  }
  function createElementEl(inst){
    const mod = MODULES[inst.type];
    const wrapper = document.createElement('div');
    wrapper.className='widget'; wrapper.dataset.id=inst.id; wrapper.dataset.type=inst.type;
    const titleHtml = mod.singleton
      ? `<span class="widget-title">${mod.label}</span>`
      : `<span class="widget-title block-title" contenteditable="true">${escapeHtml((inst.data&&inst.data.title)||mod.label)}</span>`;
    wrapper.innerHTML = `
      <div class="widget-header">
        <span class="grip-ico">${ICONS.grip}</span>
        ${titleHtml}
        <button class="hide-btn" aria-label="${mod.singleton?'hide':'remove'}">${ICONS.close}</button>
      </div>
      <div class="widget-body"></div>
      <div class="resize-handle" aria-hidden="true">${ICONS.resize}</div>
    `;
    const body = wrapper.querySelector('.widget-body');
    if(!mod.singleton){
      const titleEl = wrapper.querySelector('.block-title');
      titleEl.addEventListener('input', ()=>{
        const cur = getElement(inst.id);
        if(cur){ cur.data.title = titleEl.textContent; scheduleSave(); }
      });
    }
    wrapper.querySelector('.hide-btn').addEventListener('click', ()=>{
      if(mod.singleton){
        const cur = getElement(inst.id);
        if(cur) cur.visible = false;
        layoutElements(); renderSettings(); scheduleSave();
      } else {
        removeElement(inst.id);
      }
    });
    makeDraggable(wrapper, inst.id);
    makeResizable(wrapper, inst.id, mod.min[0], mod.min[1]);
    return { wrapper, body };
  }
  function layoutElements(){
    const inner = document.getElementById('canvas-inner');
    state.elements.forEach(inst=>{
      const mod = MODULES[inst.type];
      if(!mod) return;
      let entry = elEls[inst.id];
      if(inst.visible===false){
        if(entry) entry.wrapper.style.display='none';
        return;
      }
      if(!entry){
        entry = createElementEl(inst);
        elEls[inst.id] = entry;
        inner.appendChild(entry.wrapper);
        if(mod.init) mod.init(entry.body, inst.id);
        mod.render(entry.body, inst.id);
      }
      entry.wrapper.style.display='flex';
      entry.wrapper.style.left = snap(inst.x)+'px';
      entry.wrapper.style.top = snap(inst.y)+'px';
      entry.wrapper.style.width = Math.max(mod.min[0], snap(inst.w))+'px';
      entry.wrapper.style.height = Math.max(mod.min[1], snap(inst.h))+'px';
      entry.wrapper.style.zIndex = inst.z;
    });
    Object.keys(elEls).forEach(id=>{
      if(!state.elements.some(e=>e.id===id)){ elEls[id].wrapper.remove(); delete elEls[id]; }
    });
    updateCanvasSize();
  }
  function addElement(type){
    const mod = MODULES[type];
    if(!mod || mod.singleton) return;
    const count = state.elements.filter(e=>e.type===type).length;
    const inst = {
      id: uid(), type,
      x: snap(120 + (count*28)%520), y: snap(120 + (count*28)%360),
      w: mod.defaultSize[0], h: mod.defaultSize[1], z: ++zCounter,
      data: mod.createData ? mod.createData() : {},
    };
    state.elements.push(inst);
    layoutElements();
    renderSettings();
    scheduleSave();
  }
  function removeElement(id){
    state.elements = state.elements.filter(e=>e.id!==id);
    if(elEls[id]){ elEls[id].wrapper.remove(); delete elEls[id]; }
    renderSettings();
    scheduleSave();
  }

  /* ---------- month nav ---------- */
  function shiftMonth(delta){
    let {y,m} = state.month; m+=delta;
    if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
    state.month = {y,m};
    rerender('tracker');
    rerender('calendar');
    refreshInsights();
    scheduleSave();
  }
  function clearMonth(){
    if(!confirm('clear this month?')) return;
    const {y,m} = state.month;
    const prefix = `${y}-${m}-`;
    Object.keys(state.tracker).forEach(k=>{ if(k.startsWith(prefix)) delete state.tracker[k]; });
    rerender('tracker'); refreshInsights(); scheduleSave();
  }

  /* ---------- habits ---------- */
  function addHabit(){
    state.habits.push({id:uid(), name:'habit'});
    rerender('tracker');
    renderSettings(); refreshInsights(); scheduleSave();
  }
  function delHabit(id){
    state.habits = state.habits.filter(h=>h.id!==id);
    rerender('tracker');
    renderSettings(); refreshInsights(); scheduleSave();
  }

  /* ---------- kanban actions ---------- */
  function addKanbanColumn(){
    state.kanban.columns.push({id:uid(), title:'list', cards:[]});
    rerender('kanban');
    renderSettings(); scheduleSave();
  }
  function delKanbanColumn(id){
    state.kanban.columns = state.kanban.columns.filter(c=>c.id!==id);
    rerender('kanban');
    renderSettings(); scheduleSave();
  }
  function addCard(colId, text){
    if(!text || !text.trim()) return;
    const col = state.kanban.columns.find(c=>c.id===colId);
    if(!col) return;
    col.cards.push({id:uid(), text:text.trim(), done:false});
    rerender('kanban'); scheduleSave();
  }
  function delCard(colId, cardId){
    const col = state.kanban.columns.find(c=>c.id===colId);
    if(!col) return;
    col.cards = col.cards.filter(c=>c.id!==cardId);
    rerender('kanban'); scheduleSave();
  }
  function tickCard(colId, cardId){
    const col = state.kanban.columns.find(c=>c.id===colId);
    if(!col) return;
    const card = col.cards.find(c=>c.id===cardId);
    if(!card) return;
    card.done = !card.done;
    rerender('kanban'); scheduleSave();
  }
  function moveCard(cardId, fromColId, toColId){
    if(fromColId===toColId) return;
    const from = state.kanban.columns.find(c=>c.id===fromColId);
    const to = state.kanban.columns.find(c=>c.id===toColId);
    if(!from || !to) return;
    const idx = from.cards.findIndex(c=>c.id===cardId);
    if(idx===-1) return;
    const card = from.cards.splice(idx,1)[0];
    to.cards.push(card);
    rerender('kanban'); scheduleSave();
  }

  /* ---------- system modules: tracker ---------- */
  function renderTracker(body){
    const {y,m} = state.month;
    const days = new Date(y, m+1, 0).getDate();
    const monthName = new Date(y,m,1).toLocaleString('default',{month:'long'});
    body.innerHTML = `
      <div class="tracker-toolbar">
        <button class="icon-btn" data-act="prevm" aria-label="previous month">${ICONS.chevLeft}</button>
        <div class="tracker-month">${monthName} ${y}</div>
        <button class="icon-btn" data-act="nextm" aria-label="next month">${ICONS.chevRight}</button>
        <div class="spacer"></div>
        <button class="icon-btn" data-act="addhabit" aria-label="add habit">${ICONS.plus}</button>
        <button class="icon-btn" data-act="clearmonth" aria-label="clear month">${ICONS.trash}</button>
      </div>
      <div class="tracker-scroll"><div class="tgrid" id="tgrid"></div></div>
    `;
    const grid = body.querySelector('#tgrid');
    grid.style.gridTemplateColumns = `44px repeat(${state.habits.length}, 56px)`;
    const corner = document.createElement('div'); corner.className='tcell thead tcorner'; grid.appendChild(corner);
    state.habits.forEach(h=>{
      const cell = document.createElement('div'); cell.className='tcell thead';
      cell.innerHTML = `<span class="hname" contenteditable="true" data-hid="${h.id}">${escapeHtml(h.name)}</span><button class="mini-x floating" data-act="delhabit" data-hid="${h.id}" aria-label="remove">${ICONS.close}</button>`;
      grid.appendChild(cell);
    });
    for(let d=1; d<=days; d++){
      const dayCell=document.createElement('div'); dayCell.className='tcell daylabel'; dayCell.textContent=String(d).padStart(2,'0');
      grid.appendChild(dayCell);
      state.habits.forEach(h=>{
        const key = `${y}-${m}-${d}`;
        const on = !!(state.tracker[key] && state.tracker[key][h.id]);
        const c = document.createElement('button');
        c.className = 'hcell'+(on?' on':'');
        c.dataset.date = key; c.dataset.hid = h.id;
        grid.appendChild(c);
      });
    }
  }
  function initTrackerEvents(body){
    body.addEventListener('click', e=>{
      const cell = e.target.closest('.hcell');
      if(cell){
        const {date, hid} = cell.dataset;
        state.tracker[date] = state.tracker[date] || {};
        const now = !state.tracker[date][hid];
        state.tracker[date][hid] = now;
        cell.classList.toggle('on', now);
        cell.classList.remove('pop'); void cell.offsetWidth; cell.classList.add('pop');
        scheduleSave(); refreshInsights();
        return;
      }
      const act = e.target.closest('[data-act]');
      if(!act) return;
      const a = act.dataset.act;
      if(a==='prevm') shiftMonth(-1);
      else if(a==='nextm') shiftMonth(1);
      else if(a==='clearmonth') clearMonth();
      else if(a==='addhabit') addHabit();
      else if(a==='delhabit') delHabit(act.dataset.hid);
    });
    body.addEventListener('input', e=>{
      const span = e.target.closest('.hname');
      if(span){
        const h = state.habits.find(x=>x.id===span.dataset.hid);
        if(h){ h.name = span.textContent; scheduleSave(); refreshInsights(); }
      }
    });
  }

  /* ---------- system modules: kanban ---------- */
  function renderKanban(body){
    body.innerHTML = `<div class="kboard" id="kboard"></div>`;
    const board = body.querySelector('#kboard');
    state.kanban.columns.forEach(col=>{
      const colEl = document.createElement('div');
      colEl.className='kcol'; colEl.dataset.col=col.id;
      colEl.innerHTML = `
        <div class="kcol-head">
          <span class="kcol-title" contenteditable="true" data-col="${col.id}">${escapeHtml(col.title)}</span>
          <span class="kcount">${col.cards.length}</span>
          <button class="mini-x" data-act="delcol" data-col="${col.id}" aria-label="remove list">${ICONS.close}</button>
        </div>
        <div class="kcards" data-col="${col.id}"></div>
        <div class="kadd">
          <input type="text" placeholder="add card" data-col="${col.id}"/>
          <button class="icon-btn small" data-act="addcard" data-col="${col.id}" aria-label="add card">${ICONS.plus}</button>
        </div>`;
      const cardsWrap = colEl.querySelector('.kcards');
      col.cards.forEach(card=>{
        const cardEl = document.createElement('div');
        cardEl.className='kcard'+(card.done?' done':'');
        cardEl.draggable = true;
        cardEl.dataset.card = card.id; cardEl.dataset.col = col.id;
        cardEl.innerHTML = `<span class="grip">${ICONS.grip}</span>
          <button class="ktick ${card.done?'on':''}" data-act="tickcard" data-card="${card.id}" data-col="${col.id}" aria-label="done"></button>
          <span class="ktext" contenteditable="true" data-card="${card.id}">${escapeHtml(card.text)}</span>
          <button class="mini-x" data-act="delcard" data-card="${card.id}" data-col="${col.id}" aria-label="remove">${ICONS.close}</button>`;
        cardsWrap.appendChild(cardEl);
      });
      board.appendChild(colEl);
    });
    const addColBtn = document.createElement('button');
    addColBtn.className='addcol-btn'; addColBtn.dataset.act='addcol'; addColBtn.setAttribute('aria-label','add list');
    addColBtn.innerHTML = ICONS.plus;
    board.appendChild(addColBtn);
  }
  function initKanbanEvents(body){
    body.addEventListener('click', e=>{
      const act = e.target.closest('[data-act]');
      if(!act) return;
      const a = act.dataset.act;
      if(a==='addcard'){
        const input = body.querySelector(`.kadd input[data-col="${act.dataset.col}"]`);
        addCard(act.dataset.col, input ? input.value : '');
      } else if(a==='delcol') delKanbanColumn(act.dataset.col);
      else if(a==='addcol') addKanbanColumn();
      else if(a==='delcard') delCard(act.dataset.col, act.dataset.card);
      else if(a==='tickcard') tickCard(act.dataset.col, act.dataset.card);
    });
    body.addEventListener('keydown', e=>{
      if(e.key==='Enter' && e.target.matches('.kadd input')){
        e.preventDefault();
        addCard(e.target.dataset.col, e.target.value);
      }
    });
    body.addEventListener('input', e=>{
      const t = e.target;
      if(t.classList.contains('kcol-title')){
        const col = state.kanban.columns.find(c=>c.id===t.dataset.col);
        if(col){ col.title=t.textContent; scheduleSave(); }
      } else if(t.classList.contains('ktext')){
        const col = state.kanban.columns.find(c=>c.cards.some(cd=>cd.id===t.dataset.card));
        if(col){ const card=col.cards.find(cd=>cd.id===t.dataset.card); if(card){ card.text=t.textContent; scheduleSave(); } }
      }
    });
    body.addEventListener('dragstart', e=>{
      const card = e.target.closest('.kcard');
      if(!card) return;
      e.dataTransfer.setData('text/plain', JSON.stringify({cardId:card.dataset.card, fromCol:card.dataset.col}));
      setTimeout(()=>card.classList.add('dragging'), 0);
    });
    body.addEventListener('dragend', e=>{
      const card = e.target.closest('.kcard'); if(card) card.classList.remove('dragging');
    });
    body.addEventListener('dragover', e=>{
      if(e.target.closest('.kcards')) e.preventDefault();
    });
    body.addEventListener('drop', e=>{
      const zone = e.target.closest('.kcards');
      if(!zone) return;
      e.preventDefault();
      let data;
      try{ data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(err){ return; }
      moveCard(data.cardId, data.fromCol, zone.dataset.col);
    });
  }

  /* ---------- system modules: insights ---------- */
  function renderInsights(body){
    body.innerHTML = `
      <div class="insight-top">
        <div class="stat"><div class="stat-num" id="stat-pct">0%</div><div class="stat-lbl">complete</div></div>
        <div class="stat"><div class="stat-num" id="stat-streak">0</div><div class="stat-lbl">streak</div></div>
        <div class="stat"><div class="stat-num" id="stat-goal">${state.goal}%</div><div class="stat-lbl">goal</div></div>
      </div>
      <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
      <div class="chart-row">
        <div class="chart-box"><canvas id="chart-bar"></canvas></div>
        <div class="chart-box"><canvas id="chart-area"></canvas></div>
      </div>`;
    refreshInsights();
  }
  function refreshInsights(){
    const entry = elEls['insights'];
    if(!entry) return;
    const body = entry.body;
    const {y,m} = state.month;
    const days = new Date(y, m+1, 0).getDate();
    const habits = state.habits;
    const hCount = habits.length;
    let totalDone = 0;
    const perHabit = habits.map(()=>0);
    const dailyCompleted = [], dailyRemaining = [], dayLabels = [];
    for(let d=1; d<=days; d++){
      const key = `${y}-${m}-${d}`;
      const rec = state.tracker[key] || {};
      let count = 0;
      habits.forEach((h,i)=>{ if(rec[h.id]){ count++; perHabit[i]++; totalDone++; } });
      dailyCompleted.push(count);
      dailyRemaining.push(Math.max(0, hCount-count));
      dayLabels.push(String(d).padStart(2,'0'));
    }
    const totalPossible = days*hCount;
    const pct = totalPossible ? Math.round(totalDone/totalPossible*100) : 0;
    let streak=0, best=0;
    for(let d=0; d<days; d++){
      if(hCount>0 && dailyCompleted[d]===hCount){ streak++; best=Math.max(best,streak); } else streak=0;
    }
    const pctEl = body.querySelector('#stat-pct'); if(pctEl) pctEl.textContent = pct+'%';
    const streakEl = body.querySelector('#stat-streak'); if(streakEl) streakEl.innerHTML = `${ICONS.flame}<span>${best}</span>`;
    const goalEl = body.querySelector('#stat-goal'); if(goalEl) goalEl.textContent = state.goal+'%';
    const fillEl = body.querySelector('#progress-fill'); if(fillEl) fillEl.style.width = pct+'%';
    if(typeof Chart === 'undefined') return;
    const barCanvas = body.querySelector('#chart-bar');
    const areaCanvas = body.querySelector('#chart-area');
    if(!barCanvas || !areaCanvas) return;
    const fg = cssVar('--foreground') || '#000';
    const mainColor = cssVar('--main');
    const dotColor = cssVar('--chart-active-dot') || '#000';
    if(charts.bar) charts.bar.destroy();
    charts.bar = new Chart(barCanvas.getContext('2d'), {
      type:'bar',
      data:{ labels: habits.map(h=>h.name.toLowerCase()), datasets:[{ data:perHabit, backgroundColor: habits.map((_,i)=>chartColor(i)), borderRadius:5, maxBarThickness:26 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{ticks:{color:fg,font:{family:"'DM Sans'",size:10}},grid:{display:false}},
                 y:{beginAtZero:true, ticks:{color:fg,precision:0,font:{family:"'DM Sans'",size:10}},grid:{color:'rgba(128,128,128,.25)'}} } }
    });
    if(charts.area) charts.area.destroy();
    charts.area = new Chart(areaCanvas.getContext('2d'), {
      type:'line',
      data:{ labels:dayLabels, datasets:[
        {label:'done', data:dailyCompleted, fill:true, backgroundColor:withAlpha(mainColor,0.35), borderColor:mainColor, borderWidth:2, tension:.35, pointRadius:0, pointHoverRadius:4, pointHoverBackgroundColor:dotColor, stack:'s'},
        {label:'left', data:dailyRemaining, fill:true, backgroundColor:'rgba(140,140,140,0.22)', borderColor:'rgba(140,140,140,0.6)', borderWidth:1.5, tension:.35, pointRadius:0, stack:'s'}
      ]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, interaction:{mode:'index',intersect:false},
        scales:{ x:{ticks:{color:fg,maxTicksLimit:8,font:{family:"'DM Sans'",size:10}},grid:{display:false}},
                 y:{stacked:true,beginAtZero:true,max:Math.max(hCount,1),ticks:{color:fg,precision:0,font:{family:"'DM Sans'",size:10}},grid:{color:'rgba(128,128,128,.25)'}} } }
    });
  }
  function resizeCharts(){ charts.bar && charts.bar.resize(); charts.area && charts.area.resize(); }

  /* ---------- system modules: calendar ---------- */
  function renderCalendar(body){
    const {y,m} = state.month;
    const first = new Date(y,m,1);
    const startDow = first.getDay();
    const days = new Date(y,m+1,0).getDate();
    const today = new Date();
    const monthName = first.toLocaleString('default',{month:'long'});
    let cells='';
    ['s','m','t','w','t','f','s'].forEach(d=> cells += `<div class="cal-dow">${d}</div>`);
    for(let i=0;i<startDow;i++) cells += `<div class="cal-cell empty"></div>`;
    for(let d=1; d<=days; d++){
      const isToday = today.getFullYear()===y && today.getMonth()===m && today.getDate()===d;
      cells += `<div class="cal-cell${isToday?' today':''}">${d}</div>`;
    }
    body.innerHTML = `
      <div class="cal-toolbar">
        <button class="icon-btn" data-act="prevm" aria-label="previous month">${ICONS.chevLeft}</button>
        <div class="cal-month">${monthName} ${y}</div>
        <button class="icon-btn" data-act="nextm" aria-label="next month">${ICONS.chevRight}</button>
      </div>
      <div class="cal-grid">${cells}</div>`;
  }
  function initCalendarEvents(body){
    body.addEventListener('click', e=>{
      const act = e.target.closest('[data-act]');
      if(!act) return;
      shiftMonth(act.dataset.act==='nextm' ? 1 : -1);
    });
  }

  /* ---------- system modules: notes ---------- */
  function renderNotes(body){
    body.innerHTML = `<textarea id="notes-area" placeholder="write something">${escapeHtml(state.notes)}</textarea>`;
  }
  function initNotesEvents(body){
    body.addEventListener('input', e=>{
      if(e.target.id==='notes-area'){ state.notes = e.target.value; scheduleSave(); }
    });
  }

  /* ---------- system modules: carousel ---------- */
  function renderCarousel(body){
    const imgs = state.images.carousel;
    if(imgs.length===0) return;
    carouselIndex = ((carouselIndex % imgs.length) + imgs.length) % imgs.length;
    body.innerHTML = `
      <div class="carousel-frame"><img src="${imgs[carouselIndex]}" alt=""/></div>
      <div class="carousel-nav">
        <button class="icon-btn" data-act="prev" aria-label="previous">${ICONS.chevLeft}</button>
        <div class="carousel-dots">${imgs.map((_,i)=>`<span class="dot${i===carouselIndex?' on':''}"></span>`).join('')}</div>
        <button class="icon-btn" data-act="next" aria-label="next">${ICONS.chevRight}</button>
      </div>`;
  }
  function initCarouselEvents(body){
    body.addEventListener('click', e=>{
      const act = e.target.closest('[data-act]');
      if(!act) return;
      carouselIndex += act.dataset.act==='next' ? 1 : -1;
      renderCarousel(body);
    });
  }

  /* ---------- system modules: image card ---------- */
  function renderImageCard(body){
    body.innerHTML = `<div class="imgcard-frame"><img src="${state.images.card}" alt=""/></div>
      <button class="icon-btn shuffle-btn" data-act="shuffle">${ICONS.shuffle}</button>`;
  }
  function initImageCardEvents(body){
    body.addEventListener('click', e=>{
      if(e.target.closest('[data-act="shuffle"]')){
        state.images.card = randomImageUrl();
        scheduleSave();
        renderImageCard(body);
      }
    });
  }

  const SYSTEM_MODULES = {
    tracker:   { label:'tracker',  category:'system', singleton:true, min:[560,300], defaultSize:[900,420], render:renderTracker,   init:initTrackerEvents },
    kanban:    { label:'board',    category:'system', singleton:true, min:[420,320], defaultSize:[420,500], render:renderKanban,    init:initKanbanEvents },
    insights:  { label:'insights', category:'system', singleton:true, min:[420,340], defaultSize:[600,440], render:renderInsights,  init:null },
    calendar:  { label:'calendar', category:'system', singleton:true, min:[260,300], defaultSize:[280,300], render:renderCalendar,  init:initCalendarEvents },
    notes:     { label:'notes',    category:'system', singleton:true, min:[220,180], defaultSize:[280,220], render:renderNotes,     init:initNotesEvents },
    carousel:  { label:'moments',  category:'system', singleton:true, min:[260,260], defaultSize:[340,320], render:renderCarousel,  init:initCarouselEvents },
    imagecard: { label:'focus',    category:'system', singleton:true, min:[220,220], defaultSize:[280,320], render:renderImageCard, init:initImageCardEvents },
  };

  /* ---------- export / import ---------- */
  function downloadFile(filename, content, mime){
    // the native app's webview has no download bar (android ignores <a download>
    // entirely), so it gets a real "save as" dialog instead -- see core/platform.js
    const platform = window.Track.platform;
    if(platform && platform.isNative){
      platform.saveFile(filename, content).catch(err=>{ console.error('save failed', err); alert('could not save that file'); });
      return;
    }
    const blob = new Blob([content], {type: mime || 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }
  function exportTrackerCSV(){
    const {y,m} = state.month;
    const days = new Date(y, m+1, 0).getDate();
    const rows = [['day', ...state.habits.map(h=>h.name)].join(',')];
    for(let d=1; d<=days; d++){
      const rec = state.tracker[`${y}-${m}-${d}`] || {};
      rows.push([d, ...state.habits.map(h=> rec[h.id] ? '1':'0')].join(','));
    }
    downloadFile(`tracker-${y}-${String(m+1).padStart(2,'0')}.csv`, rows.join('\n'), 'text/csv');
  }
  function exportKanbanJSON(){
    downloadFile('board.json', JSON.stringify(state.kanban, null, 2), 'application/json');
  }
  function exportNotesTXT(){
    downloadFile('notes.txt', state.notes || '', 'text/plain');
  }
  function exportInsightsJSON(){
    const {y,m} = state.month;
    const days = new Date(y, m+1, 0).getDate();
    const habits = state.habits;
    const perHabit = habits.map(()=>0);
    let totalDone = 0;
    const daily = [];
    for(let d=1; d<=days; d++){
      const rec = state.tracker[`${y}-${m}-${d}`] || {};
      let count = 0;
      habits.forEach((h,i)=>{ if(rec[h.id]){ count++; perHabit[i]++; totalDone++; } });
      daily.push({day:d, completed:count});
    }
    const totalPossible = days*habits.length;
    const summary = {
      month: `${y}-${String(m+1).padStart(2,'0')}`,
      completion_percent: totalPossible ? Math.round(totalDone/totalPossible*100) : 0,
      goal_percent: state.goal,
      per_habit_totals: habits.map((h,i)=>({habit:h.name, total:perHabit[i]})),
      daily,
    };
    downloadFile(`insights-${summary.month}.json`, JSON.stringify(summary,null,2), 'application/json');
  }
  function exportAll(){
    downloadFile('track-backup.json', JSON.stringify(state, null, 2), 'application/json');
  }
  function importAll(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        state = mergeState(createDefaultState(), data);
        zCounter = Math.max(100, ...state.elements.map(e=>e.z||0)) + 1;
        applyTheme(state.theme, state.dark, state.sharp);
        layoutElements();
        rerenderAll();
        renderSettings();
        scheduleSave();
      }catch(err){ alert('could not read that file'); }
    };
    reader.readAsText(file);
  }

  /* ---------- settings sidebar ---------- */
  function storageSectionHtml(){
    if(!Store.fsaSupported){
      return `<div class="s-row"><span>browser storage</span></div>`;
    }
    if(storageStatus.connected){
      return `
        <div class="s-row"><span>${escapeHtml(storageStatus.name)}</span></div>
        <button class="add-row-btn" data-act="disconnectstorage">${ICONS.file} disconnect</button>
      `;
    }
    if(storageStatus.needsPermission){
      return `
        <div class="s-row"><span>${escapeHtml(storageStatus.name||'local file')}</span></div>
        <button class="add-row-btn" data-act="grantpermission">${ICONS.file} reconnect</button>
      `;
    }
    return `<button class="add-row-btn" data-act="connectstorage">${ICONS.file} connect a file</button>`;
  }
  function renderSettings(){
    const el = document.getElementById('sidebar-body');
    if(!el) return;
    const systemTypes = Object.keys(MODULES).filter(k=>MODULES[k].singleton);
    const blockInstances = state.elements.filter(e=> MODULES[e.type] && !MODULES[e.type].singleton);
    const blockTypes = Object.keys(MODULES).filter(k=>!MODULES[k].singleton);
    el.innerHTML = `
      <section class="s-sec">
        <h3>appearance</h3>
        <div class="theme-row">${THEME_NAMES.map(t=>`<button class="theme-dot${state.theme===t?' active':''}" data-act="theme" data-theme="${t}" style="--dot-color:${THEMES[t][state.dark?'dark':'light'].main}" aria-label="${t}"></button>`).join('')}</div>
        <div class="switch-row"><span>dark</span><button class="switch${state.dark?' on':''}" data-act="toggledark" aria-label="dark mode"><span class="knob"></span></button></div>
        <div class="switch-row"><span>sharp</span><button class="switch${state.sharp?' on':''}" data-act="togglesharp" aria-label="sharp mode"><span class="knob"></span></button></div>
      </section>
      <section class="s-sec">
        <h3>elements</h3>
        ${pluginWarnings.length ? `<div class="plugin-warn">${pluginWarnings.map(w=>`<div class="plugin-warn-row"><b>${escapeHtml(w.file)}</b> ${escapeHtml(w.reason)}</div>`).join('')}</div>` : ''}
        ${systemTypes.map(k=>{
          const inst = state.elements.find(e=>e.type===k);
          const visible = inst ? inst.visible!==false : true;
          return `<div class="switch-row"><span>${MODULES[k].label}</span><button class="switch${visible?' on':''}" data-act="togglesystem" data-type="${k}" aria-label="${MODULES[k].label}"><span class="knob"></span></button></div>`;
        }).join('')}
        ${blockInstances.length ? `<div class="s-list">${blockInstances.map(e=>`<div class="s-row"><span>${escapeHtml((e.data&&e.data.title)||MODULES[e.type].label)}</span><button class="mini-x" data-act="removeelement" data-id="${e.id}" aria-label="remove">${ICONS.close}</button></div>`).join('')}</div>` : ''}
        <div class="add-type-row">
          ${blockTypes.map(k=>`<button class="add-row-btn compact" data-act="addelement" data-type="${k}" aria-label="add ${MODULES[k].label}">${MODULES[k].icon||ICONS.grid} ${MODULES[k].label}</button>`).join('')}
        </div>
      </section>
      <section class="s-sec">
        <h3>habits</h3>
        <div class="s-list">${state.habits.map(h=>`<div class="s-row"><span class="s-text" contenteditable="true" data-habit="${h.id}">${escapeHtml(h.name)}</span><button class="mini-x" data-act="delhabit" data-hid="${h.id}" aria-label="remove">${ICONS.close}</button></div>`).join('')}</div>
        <button class="add-row-btn" data-act="addhabit">${ICONS.plus} habit</button>
      </section>
      <section class="s-sec">
        <h3>board</h3>
        <div class="s-list">${state.kanban.columns.map(c=>`<div class="s-row"><span class="s-text" contenteditable="true" data-col="${c.id}">${escapeHtml(c.title)}</span><button class="mini-x" data-act="delcol" data-col="${c.id}" aria-label="remove">${ICONS.close}</button></div>`).join('')}</div>
        <button class="add-row-btn" data-act="addcol">${ICONS.plus} list</button>
      </section>
      <section class="s-sec">
        <h3>goal</h3>
        <input type="range" min="0" max="100" value="${state.goal}" id="goal-slider"/>
        <div class="goal-val">${state.goal}%</div>
      </section>
      <section class="s-sec">
        <h3>images</h3>
        <button class="add-row-btn" data-act="shuffleimgs">${ICONS.shuffle} shuffle</button>
      </section>
      <section class="s-sec">
        <h3>storage</h3>
        ${storageSectionHtml()}
      </section>
      <section class="s-sec">
        <h3>export</h3>
        <div class="s-row"><span>everything</span><button class="icon-btn" data-act="exportall" aria-label="export everything">${ICONS.download}</button></div>
        <div class="s-row"><span>tracker</span><button class="icon-btn" data-act="exporttracker" aria-label="export tracker">${ICONS.download}</button></div>
        <div class="s-row"><span>board</span><button class="icon-btn" data-act="exportboard" aria-label="export board">${ICONS.download}</button></div>
        <div class="s-row"><span>notes</span><button class="icon-btn" data-act="exportnotes" aria-label="export notes">${ICONS.download}</button></div>
        <div class="s-row"><span>insights</span><button class="icon-btn" data-act="exportinsights" aria-label="export insights">${ICONS.download}</button></div>
        <button class="add-row-btn" data-act="importall">${ICONS.upload} import backup</button>
        <input type="file" id="import-file" accept="application/json" style="display:none"/>
      </section>
      <section class="s-sec">
        <button class="reset-btn" data-act="reset">reset everything</button>
      </section>
    `;
  }
  function initSettingsEvents(el){
    el.addEventListener('click', async e=>{
      const act = e.target.closest('[data-act]');
      if(!act) return;
      const a = act.dataset.act;
      if(a==='theme'){ state.theme=act.dataset.theme; applyTheme(state.theme,state.dark,state.sharp); renderSettings(); refreshInsights(); scheduleSave(); }
      else if(a==='toggledark'){ state.dark=!state.dark; applyTheme(state.theme,state.dark,state.sharp); renderSettings(); refreshInsights(); scheduleSave(); }
      else if(a==='togglesharp'){ state.sharp=!state.sharp; applyTheme(state.theme,state.dark,state.sharp); renderSettings(); scheduleSave(); }
      else if(a==='togglesystem'){
        const inst = state.elements.find(e=>e.type===act.dataset.type);
        if(inst){ inst.visible = inst.visible===false ? true : false; layoutElements(); renderSettings(); scheduleSave(); }
      }
      else if(a==='addhabit') addHabit();
      else if(a==='delhabit') delHabit(act.dataset.hid);
      else if(a==='addcol') addKanbanColumn();
      else if(a==='delcol') delKanbanColumn(act.dataset.col);
      else if(a==='addelement') addElement(act.dataset.type);
      else if(a==='removeelement') removeElement(act.dataset.id);
      else if(a==='exportall') exportAll();
      else if(a==='exporttracker') exportTrackerCSV();
      else if(a==='exportboard') exportKanbanJSON();
      else if(a==='exportnotes') exportNotesTXT();
      else if(a==='exportinsights') exportInsightsJSON();
      else if(a==='importall'){ const f=document.getElementById('import-file'); if(f) f.click(); }
      else if(a==='connectstorage'){
        const res = await Store.connect();
        if(res.ok){
          if(res.existingContent){
            try{
              const data = JSON.parse(res.existingContent);
              state = mergeState(createDefaultState(), data);
              zCounter = Math.max(100, ...state.elements.map(e=>e.z||0)) + 1;
              applyTheme(state.theme, state.dark, state.sharp);
              layoutElements();
              rerenderAll();
            }catch(err){ /* not valid track data -- keep current state, write it out below */ }
          }
          storageStatus = Store.getStatus();
          renderSettings();
          await saveState();
        } else if(!res.aborted){
          alert('could not connect to that file');
        }
      }
      else if(a==='disconnectstorage'){
        await Store.disconnect();
        storageStatus = Store.getStatus();
        renderSettings();
      }
      else if(a==='grantpermission'){
        const res = await Store.requestPermission();
        storageStatus = Store.getStatus();
        if(res.ok){
          const loaded = await loadState();
          if(loaded){
            state = mergeState(createDefaultState(), loaded);
            zCounter = Math.max(100, ...state.elements.map(e=>e.z||0)) + 1;
            applyTheme(state.theme, state.dark, state.sharp);
            layoutElements();
            rerenderAll();
          }
        }
        renderSettings();
      }
      else if(a==='shuffleimgs'){
        state.images.card = randomImageUrl();
        state.images.carousel = state.images.carousel.map(()=>randomImageUrl());
        rerender('imagecard');
        carouselIndex = 0;
        rerender('carousel');
        scheduleSave();
      }
      else if(a==='reset'){
        if(confirm('reset everything?')){
          state = createDefaultState();
          zCounter = 100;
          applyTheme(state.theme, state.dark, state.sharp);
          layoutElements();
          rerenderAll();
          renderSettings();
          scheduleSave();
        }
      }
    });
    el.addEventListener('change', e=>{
      if(e.target.id==='import-file' && e.target.files && e.target.files[0]){
        importAll(e.target.files[0]);
        e.target.value='';
      }
    });
    el.addEventListener('input', e=>{
      const t = e.target;
      if(t.id==='goal-slider'){
        state.goal = parseInt(t.value,10);
        const lbl = el.querySelector('.goal-val'); if(lbl) lbl.textContent = state.goal+'%';
        refreshInsights(); scheduleSave();
      } else if(t.dataset.habit){
        const h = state.habits.find(x=>x.id===t.dataset.habit);
        if(h){ h.name = t.textContent; rerender('tracker'); refreshInsights(); scheduleSave(); }
      } else if(t.dataset.col && t.classList.contains('s-text')){
        const col = state.kanban.columns.find(c=>c.id===t.dataset.col);
        if(col){ col.title = t.textContent; rerender('kanban'); scheduleSave(); }
      }
    });
  }

  /* ---------- boot ---------- */
  async function init(){
    await loadExtraPlugins();
    buildModules();
    pluginWarnings.forEach(w=> console.warn('~track plugin warning:', w.file, '--', w.reason));

    if(typeof Chart !== 'undefined'){ Chart.defaults.font.family = "'DM Sans', sans-serif"; }
    applyTheme(state.theme, state.dark, state.sharp);
    wireShell();
    layoutElements();
    renderSettings();

    // silently reattach to a previously-connected local file if the browser
    // still remembers permission for it -- no user gesture needed for this
    // part; if permission needs re-granting, that's surfaced in settings.
    if(Store.fsaSupported){
      const restored = await Store.restoreConnection();
      if(restored.ok) storageStatus = Store.getStatus();
    }

    const loaded = await loadState();
    if(loaded){
      state = mergeState(createDefaultState(), loaded);
      zCounter = Math.max(100, ...state.elements.map(e=>e.z||0)) + 1;
      applyTheme(state.theme, state.dark, state.sharp);
      layoutElements();
      rerenderAll();
    }
    renderSettings();
    const dot = document.getElementById('save-dot');
    if(dot) dot.title = storageStatus.connected ? ('using '+storageStatus.name) : 'using browser storage';
    const inner = document.getElementById('canvas-inner');
    if(inner) inner.style.visibility = 'visible';
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
