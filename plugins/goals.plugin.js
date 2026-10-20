/* ~track plugin : goals
   A list of measurable goals, each with a current value, a target and a
   progress bar ("read 12 books", "run 100 km"). Names, values and targets
   are all edited in place. Reuses .progress-track/.progress-fill from the
   insights panel and .kadd from the checklist. See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  function num(v, fallback){ const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : fallback; }

  window.TrackPlugins.push({
    type: 'goals',
    label: 'goals',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`,
    min: [240, 200],
    defaultSize: [300, 286],

    createData(){
      return { title: 'goals', items: [] };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const items = data.items || [];
      const editable = 'contenteditable="true" style="outline:none;min-width:12px;display:inline-block;"';
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${items.map(g=>{
            const pct = g.target > 0 ? Math.min(100, Math.max(0, g.current / g.target * 100)) : 0;
            return `
            <div data-goal="${g.id}">
              <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;">
                <span class="ktext" contenteditable="true" data-field="name" data-goal="${g.id}">${api.escapeHtml(g.name)}</span>
                <button class="mini-x" data-act="del" data-goal="${g.id}" aria-label="remove">${api.icons.close}</button>
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
                <button class="icon-btn small" data-act="dec" data-goal="${g.id}" aria-label="decrease">${api.icons.minus}</button>
                <div class="progress-track" style="flex:1;margin:0;height:12px;"><div class="progress-fill" style="width:${pct}%;"></div></div>
                <button class="icon-btn small" data-act="inc" data-goal="${g.id}" aria-label="increase">${api.icons.plus}</button>
              </div>
              <div style="font-size:11px;opacity:.7;text-align:right;margin-top:2px;font-variant-numeric:tabular-nums;">
                <span ${editable} data-field="current" data-goal="${g.id}">${g.current}</span> /
                <span ${editable} data-field="target" data-goal="${g.id}">${g.target}</span>
                · ${Math.round(pct)}%${pct >= 100 ? ' ✓' : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <div class="kadd" style="margin-top:8px;">
          <input type="text" placeholder="add goal, e.g. read 12 books"/>
          <button class="icon-btn small" data-act="add" aria-label="add goal">${api.icons.plus}</button>
        </div>
      `;
    },

    init(body, id, api){
      function addGoal(text){
        text = (text || '').trim();
        if(!text) return;
        const data = api.getData(id);
        if(!data) return;
        // "read 12 books" -> target 12; anything without a number defaults to 10
        const match = text.match(/(\d+(?:\.\d+)?)/);
        data.items = data.items || [];
        data.items.push({ id: api.uid(), name: text, current: 0, target: match ? parseFloat(match[1]) : 10 });
        api.save();
        api.rerender(id);
      }
      function findGoal(gid){
        const data = api.getData(id);
        return data && (data.items || []).find(g => g.id === gid);
      }
      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act) return;
        const data = api.getData(id);
        if(!data) return;
        const a = act.dataset.act;
        if(a === 'add'){
          const input = body.querySelector('.kadd input');
          addGoal(input ? input.value : '');
          return;
        }
        const g = findGoal(act.dataset.goal);
        if(a === 'del') data.items = data.items.filter(x => x.id !== act.dataset.goal);
        else if(g && a === 'inc') g.current = +(g.current + 1).toFixed(2);
        else if(g && a === 'dec') g.current = Math.max(0, +(g.current - 1).toFixed(2));
        api.save();
        api.rerender(id);
      });
      body.addEventListener('keydown', e=>{
        if(e.key !== 'Enter') return;
        if(e.target.matches('.kadd input')){ e.preventDefault(); addGoal(e.target.value); }
        else if(e.target.isContentEditable){ e.preventDefault(); e.target.blur(); }
      });
      body.addEventListener('input', e=>{
        const t = e.target;
        if(t.dataset.field !== 'name') return;
        const g = findGoal(t.dataset.goal);
        if(g){ g.name = t.textContent; api.save(); }
      });
      // numbers are only parsed once you leave the field, so typing "1" on
      // the way to "12" doesn't redraw the bar under your cursor
      body.addEventListener('focusout', e=>{
        const t = e.target;
        const field = t.dataset && t.dataset.field;
        if(field !== 'current' && field !== 'target') return;
        const g = findGoal(t.dataset.goal);
        if(!g) return;
        g[field] = Math.max(0, num(t.textContent, g[field]));
        api.save();
        api.rerender(id);
      });
    },
  });
})();
