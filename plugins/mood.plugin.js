/* ~track plugin : mood
   One mood per day, from 1 (rough) to 5 (great), shown as a month of
   shaded squares. The shade is var(--main) mixed into the panel color, so
   it follows every theme and dark mode without a single hardcoded color.
   Click today's face to log it; click any past day to cycle its value.
   See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  const LEVELS = ['rough','low','okay','good','great'];
  const FACES = ['😞','🙁','😐','🙂','😄'];

  function dayKey(y, m, d){ return y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0'); }
  function todayKey(){ const t = new Date(); return dayKey(t.getFullYear(), t.getMonth(), t.getDate()); }
  function shade(level){
    if(!level) return 'transparent';
    return `color-mix(in oklch, var(--main) ${level * 20}%, var(--secondary-background))`;
  }

  window.TrackPlugins.push({
    type: 'mood',
    label: 'mood',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>`,
    min: [240, 320],
    defaultSize: [264, 352],

    createData(){
      const t = new Date();
      return { title: 'mood', entries: {}, view: { y: t.getFullYear(), m: t.getMonth() } };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const entries = data.entries || {};
      const t = new Date();
      const view = data.view || { y: t.getFullYear(), m: t.getMonth() };
      const { y, m } = view;
      const first = new Date(y, m, 1);
      const days = new Date(y, m+1, 0).getDate();
      const today = todayKey();
      const current = entries[today] || 0;

      let cells = '';
      ['s','m','t','w','t','f','s'].forEach(d=> cells += `<div class="cal-dow">${d}</div>`);
      for(let i = 0; i < first.getDay(); i++) cells += `<div class="cal-cell empty"></div>`;
      let sum = 0, logged = 0;
      for(let d = 1; d <= days; d++){
        const key = dayKey(y, m, d);
        const level = entries[key] || 0;
        if(level){ sum += level; logged++; }
        const future = key > today;
        const ring = key === today ? 'border-color:var(--border);font-weight:700;' : 'border-color:rgba(128,128,128,.25);';
        cells += `<button class="cal-cell" data-act="cycle" data-day="${key}" ${future ? 'disabled' : ''}
          title="${key}${level ? ' -- ' + LEVELS[level-1] : ''}"
          style="${ring}background:${shade(level)};color:var(--foreground);padding:0;font-family:inherit;${future ? 'opacity:.35;cursor:default;' : ''}">${d}</button>`;
      }
      const avg = logged ? sum / logged : 0;
      const monthName = first.toLocaleString('default', { month: 'long' });

      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:4px;margin-bottom:10px;">
          ${FACES.map((f,i)=>`<button data-act="today" data-level="${i+1}" aria-label="${LEVELS[i]}" title="${LEVELS[i]}"
            style="flex:1;font-size:18px;line-height:1;padding:6px 0;border:2px solid var(--border);border-radius:var(--radius-base);
            background:${current === i+1 ? 'var(--main)' : 'var(--background)'};">${f}</button>`).join('')}
        </div>
        <div class="cal-toolbar">
          <button class="icon-btn" data-act="prev" aria-label="previous month">${api.icons.chevLeft}</button>
          <div class="cal-month">${monthName} ${y}</div>
          <button class="icon-btn" data-act="next" aria-label="next month">${api.icons.chevRight}</button>
        </div>
        <div class="cal-grid">${cells}</div>
        <div style="font-size:11px;opacity:.65;text-align:center;margin-top:8px;">
          ${logged ? `${logged} day${logged === 1 ? '' : 's'} logged · mostly ${LEVELS[Math.round(avg)-1]}` : 'nothing logged this month'}
        </div>
      `;
    },

    init(body, id, api){
      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act || act.disabled) return;
        const data = api.getData(id);
        if(!data) return;
        data.entries = data.entries || {};
        const t = new Date();
        data.view = data.view || { y: t.getFullYear(), m: t.getMonth() };
        const a = act.dataset.act;
        if(a === 'today'){
          const level = parseInt(act.dataset.level, 10);
          const key = todayKey();
          // clicking the face that's already set clears it
          if(data.entries[key] === level) delete data.entries[key];
          else data.entries[key] = level;
        } else if(a === 'cycle'){
          const key = act.dataset.day;
          const next = ((data.entries[key] || 0) + 1) % 6;
          if(next) data.entries[key] = next; else delete data.entries[key];
        } else if(a === 'prev' || a === 'next'){
          let { y, m } = data.view;
          m += a === 'next' ? 1 : -1;
          if(m < 0){ m = 11; y--; } else if(m > 11){ m = 0; y++; }
          data.view = { y, m };
        }
        api.save();
        api.rerender(id);
      });
    },
  });
})();
