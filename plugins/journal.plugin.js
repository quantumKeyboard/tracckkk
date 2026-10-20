/* ~track plugin : journal
   One entry per day. Step back through earlier days with the arrows, jump
   back to today with the dot. Empty days get a small writing prompt as the
   placeholder (a different one each day) so the blank page is less blank.
   Follows the same "don't clobber the textarea while typing" rule as the
   note plugin. See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  const PROMPTS = [
    'three good things about today',
    'what took more energy than expected?',
    'one thing you learned',
    'what are you looking forward to?',
    'what would make tomorrow easier?',
    'who helped you today?',
    'what did you avoid, and why?',
  ];

  function keyOf(date){ return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0'); }
  function parseKey(key){ const [y, m, d] = key.split('-').map(Number); return new Date(y, m-1, d); }

  window.TrackPlugins.push({
    type: 'journal',
    label: 'journal',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4a2 2 0 012-2h12v18H7a2 2 0 00-2 2z"/><path d="M5 20V4M9 7h6M9 11h6"/></svg>`,
    min: [240, 240],
    defaultSize: [300, 308],

    createData(){
      return { title: 'journal', entries: {}, date: null };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const entries = data.entries || {};
      const today = keyOf(new Date());
      const key = data.date || today;
      const date = parseKey(key);
      const label = key === today ? 'today' : date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
      const written = Object.keys(entries).filter(k => (entries[k] || '').trim()).length;
      const prompt = PROMPTS[Math.floor(date.getTime() / 86400000) % PROMPTS.length];

      if(!body.querySelector('.block-text') || body.dataset.day !== key){
        body.dataset.day = key;
        body.innerHTML = `
          <div style="display:flex;flex-direction:column;height:100%;">
            <div class="cal-toolbar" style="margin-bottom:6px;">
              <button class="icon-btn" data-act="prev" aria-label="previous day">${api.icons.chevLeft}</button>
              <div class="cal-month" data-label></div>
              <button class="icon-btn" data-act="today" aria-label="back to today" title="today"><span class="dot on" style="width:8px;height:8px;"></span></button>
              <button class="icon-btn" data-act="next" aria-label="next day">${api.icons.chevRight}</button>
            </div>
            <textarea class="block-text" style="flex:1;min-height:0;"></textarea>
            <div data-count style="font-size:11px;opacity:.55;text-align:right;padding-top:4px;"></div>
          </div>
        `;
      }
      const ta = body.querySelector('.block-text');
      ta.placeholder = prompt;
      if(document.activeElement !== ta) ta.value = entries[key] || '';
      body.querySelector('[data-label]').textContent = label;
      body.querySelector('[data-count]').textContent = written + (written === 1 ? ' day written' : ' days written');
      const nextBtn = body.querySelector('[data-act="next"]');
      nextBtn.disabled = key >= today;
      nextBtn.style.opacity = key >= today ? '.3' : '';
    },

    init(body, id, api){
      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act || act.disabled) return;
        const data = api.getData(id);
        if(!data) return;
        const today = keyOf(new Date());
        const date = parseKey(data.date || today);
        if(act.dataset.act === 'prev') date.setDate(date.getDate() - 1);
        else if(act.dataset.act === 'next') date.setDate(date.getDate() + 1);
        const key = act.dataset.act === 'today' ? today : keyOf(date);
        // store null for "today" so the panel follows the calendar across midnight
        data.date = key >= today ? null : key;
        api.save();
        api.rerender(id);
      });
      body.addEventListener('input', e=>{
        if(!e.target.classList.contains('block-text')) return;
        const data = api.getData(id);
        if(!data) return;
        data.entries = data.entries || {};
        const key = data.date || keyOf(new Date());
        if(e.target.value.trim()) data.entries[key] = e.target.value;
        else delete data.entries[key];
        api.save();
        const written = Object.keys(data.entries).length;
        const countEl = body.querySelector('[data-count]');
        if(countEl) countEl.textContent = written + (written === 1 ? ' day written' : ' days written');
      });
    },
  });
})();
