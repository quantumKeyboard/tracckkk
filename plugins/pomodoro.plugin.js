/* ~track plugin : pomodoro
   A focus timer: work blocks, short breaks, and a long break every few
   sessions. The running timer is stored as an absolute end time (endsAt),
   not a countdown, so it stays correct across reloads, sleeping tabs and
   app restarts. Demonstrates a plugin with a live ticking display that
   updates text in place instead of re-rendering every second.
   See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  const PHASE_LABEL = { focus:'focus', short:'short break', long:'long break' };
  const ICON_PLAY  = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>`;
  const ICON_PAUSE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>`;
  const ICON_SKIP  = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M5 4.5v15l10-7.5z"/><rect x="16" y="4.5" width="3" height="15" rx="1"/></svg>`;
  const ICON_RESET = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9.5 9.5 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/></svg>`;

  function phaseMs(data, phase){
    const mins = Math.max(1, Number(data[phase]) || 1);
    return mins * 60 * 1000;
  }
  // ms left in the current phase, whether running or paused
  function remainingMs(data){
    if(data.endsAt) return Math.max(0, data.endsAt - Date.now());
    if(data.remaining != null) return data.remaining;
    return phaseMs(data, data.phase || 'focus');
  }
  function fmt(ms){
    const total = Math.ceil(ms / 1000);
    return String(Math.floor(total / 60)).padStart(2,'0') + ':' + String(total % 60).padStart(2,'0');
  }
  function nextPhase(data){
    if(data.phase === 'focus'){
      data.done = (data.done || 0) + 1;
      return (data.done % (data.every || 4) === 0) ? 'long' : 'short';
    }
    return 'focus';
  }
  function chime(){
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      const ctx = new Ctx();
      [0, 0.18, 0.36].forEach(t=>{
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.16);
      });
      setTimeout(()=> ctx.close(), 1000);
    }catch(err){ /* no audio available, the visual change is enough */ }
  }
  function notify(text){
    try{
      if('Notification' in window && Notification.permission === 'granted') new Notification('~track', { body: text });
    }catch(err){ /* not supported in this webview */ }
  }

  window.TrackPlugins.push({
    type: 'pomodoro',
    label: 'pomodoro',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>`,
    min: [220, 220],
    defaultSize: [260, 264],

    createData(){
      return { title: 'pomodoro', focus: 25, short: 5, long: 15, every: 4,
               phase: 'focus', endsAt: null, remaining: null, done: 0 };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const phase = data.phase || 'focus';
      const left = remainingMs(data);
      const pct = Math.min(100, Math.max(0, 100 - left / phaseMs(data, phase) * 100));
      const running = !!data.endsAt;
      const every = data.every || 4;
      const inCycle = (data.done || 0) % every;
      const dots = Array.from({length: every}, (_,i)=>`<span class="dot${i < inCycle ? ' on' : ''}"></span>`).join('');
      const numStyle = 'width:100%;border:2px solid var(--border);border-radius:var(--radius-base);background:var(--secondary-background);color:var(--foreground);padding:3px 4px;font-size:12px;text-align:center;';
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="font-size:12px;opacity:.65;">${PHASE_LABEL[phase]}</div>
          <div data-time style="font-size:38px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;">${fmt(left)}</div>
          <div class="carousel-dots" title="${data.done || 0} sessions done">${dots}</div>
        </div>
        <div class="progress-track" style="margin:10px 0 0;height:10px;"><div class="progress-fill" data-fill style="width:${pct}%;"></div></div>
        <div style="display:flex;gap:6px;">
          <button class="shuffle-btn" data-act="toggle" aria-label="${running ? 'pause' : 'start'}">${running ? ICON_PAUSE : ICON_PLAY}</button>
          <button class="shuffle-btn" data-act="skip" aria-label="skip to next phase">${ICON_SKIP}</button>
          <button class="shuffle-btn" data-act="reset" aria-label="reset">${ICON_RESET}</button>
        </div>
        <details style="margin-top:10px;font-size:11px;">
          <summary style="cursor:pointer;opacity:.65;">minutes</summary>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px;">
            ${['focus','short','long'].map(k=>`
              <label style="display:flex;flex-direction:column;gap:2px;opacity:.85;">${k}
                <input type="number" min="1" max="180" data-field="${k}" value="${Number(data[k]) || 1}" style="${numStyle}"/>
              </label>`).join('')}
          </div>
        </details>
      `;
    },

    init(body, id, api){
      // one interval per instance; it stops itself once this element's data
      // is gone (element removed, or a reset/import replaced everything)
      const timer = setInterval(()=>{
        const data = api.getData(id);
        if(!data){ clearInterval(timer); return; }
        if(!data.endsAt) return;
        const left = data.endsAt - Date.now();
        if(left <= 0){
          const finished = data.phase;
          data.phase = nextPhase(data);
          data.endsAt = null;
          data.remaining = null;
          api.save();
          api.rerender(id);
          chime();
          notify(finished === 'focus' ? 'focus done. take a break.' : 'break over. back to it.');
          return;
        }
        const timeEl = body.querySelector('[data-time]');
        if(timeEl) timeEl.textContent = fmt(left);
        const fillEl = body.querySelector('[data-fill]');
        if(fillEl) fillEl.style.width = Math.min(100, 100 - left / phaseMs(data, data.phase) * 100) + '%';
      }, 250);

      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act) return;
        const data = api.getData(id);
        if(!data) return;
        const a = act.dataset.act;
        if(a === 'toggle'){
          if(data.endsAt){
            data.remaining = Math.max(0, data.endsAt - Date.now());
            data.endsAt = null;
          } else {
            data.endsAt = Date.now() + remainingMs(data);
            data.remaining = null;
            // asked on the first start, from a click, which browsers require
            try{ if('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }catch(err){}
          }
        } else if(a === 'skip'){
          data.phase = nextPhase(data);
          data.endsAt = null; data.remaining = null;
        } else if(a === 'reset'){
          data.phase = 'focus'; data.endsAt = null; data.remaining = null; data.done = 0;
        }
        api.save();
        api.rerender(id);
      });

      body.addEventListener('change', e=>{
        const field = e.target.dataset && e.target.dataset.field;
        if(!field) return;
        const data = api.getData(id);
        if(!data) return;
        data[field] = Math.min(180, Math.max(1, parseInt(e.target.value, 10) || 1));
        // a new length only applies straight away if that phase hasn't started yet
        if(field === data.phase && !data.endsAt) data.remaining = null;
        api.save();
        api.rerender(id);
        const details = body.querySelector('details');
        if(details) details.open = true;
      });
    },
  });
})();
