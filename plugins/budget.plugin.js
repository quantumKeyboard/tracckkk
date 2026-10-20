/* ~track plugin : budget
   A small money log, one month at a time: type what it was and how much,
   then hit - for spent or + for earned. Shows in / out / net for the month
   using the same .stat blocks as the insights panel. The currency symbol
   is just text you can edit, so it works for any currency.
   See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  function pad(n){ return String(n).padStart(2,'0'); }
  function todayKey(){ const t = new Date(); return t.getFullYear() + '-' + pad(t.getMonth()+1) + '-' + pad(t.getDate()); }
  function money(n, sym){
    const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return (n < 0 ? '-' : '') + sym + abs;
  }

  window.TrackPlugins.push({
    type: 'budget',
    label: 'budget',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/></svg>`,
    min: [260, 300],
    defaultSize: [300, 374],

    createData(){
      const t = new Date();
      return { title: 'budget', symbol: '$', entries: [], view: { y: t.getFullYear(), m: t.getMonth() } };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const sym = data.symbol == null ? '$' : data.symbol;
      const t = new Date();
      const { y, m } = data.view || { y: t.getFullYear(), m: t.getMonth() };
      const prefix = y + '-' + pad(m+1) + '-';
      const rows = (data.entries || []).filter(e => (e.date || '').startsWith(prefix))
        .sort((a, b) => b.date.localeCompare(a.date));
      let inc = 0, out = 0;
      rows.forEach(r => { if(r.amount >= 0) inc += r.amount; else out -= r.amount; });
      const monthName = new Date(y, m, 1).toLocaleString('default', { month: 'long' });
      const inputStyle = 'border:2px solid var(--border);border-radius:var(--radius-base);padding:5px 7px;font-size:12px;background:var(--secondary-background);color:var(--foreground);outline:none;min-width:0;';

      body.innerHTML = `
        <div class="cal-toolbar" style="margin-bottom:6px;">
          <button class="icon-btn" data-act="prev" aria-label="previous month">${api.icons.chevLeft}</button>
          <div class="cal-month">${monthName} ${y}</div>
          <button class="icon-btn" data-act="next" aria-label="next month">${api.icons.chevRight}</button>
        </div>
        <div class="insight-top" style="gap:6px;">
          <div class="stat"><div class="stat-num" style="font-size:16px;">${money(inc, api.escapeHtml(sym))}</div><div class="stat-lbl">in</div></div>
          <div class="stat"><div class="stat-num" style="font-size:16px;">${money(out, api.escapeHtml(sym))}</div><div class="stat-lbl">out</div></div>
          <div class="stat"><div class="stat-num" style="font-size:16px;color:var(--main);">${money(inc - out, api.escapeHtml(sym))}</div><div class="stat-lbl">net</div></div>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:8px;">
          <input data-field="text" type="text" placeholder="what" style="${inputStyle}flex:2;"/>
          <input data-field="amount" type="number" inputmode="decimal" step="any" min="0" placeholder="0" style="${inputStyle}flex:1;width:60px;"/>
          <button class="icon-btn small" data-act="spend" aria-label="add as spent" title="spent" style="border:2px solid var(--border);">${api.icons.minus}</button>
          <button class="icon-btn small" data-act="earn" aria-label="add as earned" title="earned" style="border:2px solid var(--border);">${api.icons.plus}</button>
        </div>
        <div class="check-list">
          ${rows.length ? rows.map(r => `
            <div class="check-row" style="font-size:12px;">
              <span style="opacity:.5;font-variant-numeric:tabular-nums;">${r.date.slice(8)}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${api.escapeHtml(r.text)}</span>
              <span style="font-weight:700;font-variant-numeric:tabular-nums;${r.amount >= 0 ? 'color:var(--main);' : ''}">${r.amount >= 0 ? '+' : ''}${money(r.amount, api.escapeHtml(sym))}</span>
              <button class="mini-x" data-act="del" data-entry="${r.id}" aria-label="remove">${api.icons.close}</button>
            </div>`).join('') : '<div style="font-size:11px;opacity:.55;text-align:center;">nothing logged this month</div>'}
        </div>
        <div style="font-size:11px;opacity:.6;margin-top:10px;display:flex;align-items:center;gap:6px;">
          currency <span contenteditable="true" data-field="symbol" style="outline:none;border-bottom:1px dashed var(--border);min-width:10px;text-transform:none;">${api.escapeHtml(sym)}</span>
        </div>
      `;
    },

    init(body, id, api){
      function add(sign){
        const data = api.getData(id);
        if(!data) return;
        const textEl = body.querySelector('[data-field="text"]');
        const amountEl = body.querySelector('[data-field="amount"]');
        const amount = Math.abs(parseFloat(amountEl && amountEl.value));
        if(!Number.isFinite(amount) || amount === 0){ if(amountEl) amountEl.focus(); return; }
        const t = new Date();
        const view = data.view || { y: t.getFullYear(), m: t.getMonth() };
        // entries logged while looking at another month land on its 1st (or today, for the current month)
        const isCurrent = view.y === t.getFullYear() && view.m === t.getMonth();
        const date = isCurrent ? todayKey() : view.y + '-' + pad(view.m+1) + '-01';
        data.entries = data.entries || [];
        data.entries.push({ id: api.uid(), date, text: (textEl && textEl.value.trim()) || (sign > 0 ? 'income' : 'expense'), amount: sign * amount });
        api.save();
        api.rerender(id);
        const next = body.querySelector('[data-field="text"]');
        if(next) next.focus();
      }
      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act) return;
        const data = api.getData(id);
        if(!data) return;
        const a = act.dataset.act;
        if(a === 'spend') return add(-1);
        if(a === 'earn') return add(1);
        if(a === 'del') data.entries = (data.entries || []).filter(x => x.id !== act.dataset.entry);
        else if(a === 'prev' || a === 'next'){
          const t = new Date();
          let { y, m } = data.view || { y: t.getFullYear(), m: t.getMonth() };
          m += a === 'next' ? 1 : -1;
          if(m < 0){ m = 11; y--; } else if(m > 11){ m = 0; y++; }
          data.view = { y, m };
        }
        api.save();
        api.rerender(id);
      });
      // enter in either field logs it as spent, the far more common case
      body.addEventListener('keydown', e=>{
        if(e.key !== 'Enter') return;
        if(e.target.matches('[data-field="text"], [data-field="amount"]')){ e.preventDefault(); add(-1); }
        else if(e.target.dataset.field === 'symbol'){ e.preventDefault(); e.target.blur(); }
      });
      body.addEventListener('focusout', e=>{
        if(e.target.dataset.field !== 'symbol') return;
        const data = api.getData(id);
        if(!data) return;
        data.symbol = e.target.textContent.trim().slice(0, 4);
        api.save();
        api.rerender(id);
      });
    },
  });
})();
