/* ~track plugin : links
   A short list of bookmarks you open every day. Only http(s) and mailto
   links are accepted, so a pasted "javascript:" url can never end up
   behind a click. A bare "example.com" gets https:// added.
   See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  function normalize(raw){
    let url = (raw || '').trim();
    if(!url) return null;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    try{
      const u = new URL(url);
      return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : null;
    }catch(err){ return null; }
  }
  function host(url){
    try{ const u = new URL(url); return u.protocol === 'mailto:' ? u.pathname : u.hostname.replace(/^www\./, ''); }
    catch(err){ return url; }
  }

  window.TrackPlugins.push({
    type: 'links',
    label: 'links',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1"/></svg>`,
    min: [220, 180],
    defaultSize: [260, 242],

    createData(){
      return { title: 'links', items: [] };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const items = data.items || [];
      body.innerHTML = `
        <div class="check-list">
          ${items.map(it => `
            <div class="check-row">
              <a href="${api.escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer"
                 style="flex:1;min-width:0;color:var(--foreground);text-decoration:none;display:flex;flex-direction:column;border:2px solid var(--border);border-radius:var(--radius-base);padding:5px 8px;background:var(--background);">
                <span style="font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${api.escapeHtml(it.name)}</span>
                <span style="font-size:10.5px;opacity:.55;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${api.escapeHtml(host(it.url))}</span>
              </a>
              <button class="mini-x" data-act="del" data-item="${it.id}" aria-label="remove">${api.icons.close}</button>
            </div>`).join('')}
        </div>
        <div class="kadd" style="flex-direction:column;">
          <input type="text" data-field="url" placeholder="paste a link" style="text-transform:none;"/>
          <div style="display:flex;gap:4px;">
            <input type="text" data-field="name" placeholder="name (optional)"/>
            <button class="icon-btn small" data-act="add" aria-label="add link">${api.icons.plus}</button>
          </div>
        </div>
      `;
    },

    init(body, id, api){
      function add(){
        const data = api.getData(id);
        if(!data) return;
        const urlEl = body.querySelector('[data-field="url"]');
        const nameEl = body.querySelector('[data-field="name"]');
        const url = normalize(urlEl && urlEl.value);
        if(!url){ if(urlEl){ urlEl.focus(); urlEl.select(); } return; }
        data.items = data.items || [];
        data.items.push({ id: api.uid(), url, name: (nameEl && nameEl.value.trim()) || host(url) });
        api.save();
        api.rerender(id);
      }
      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act) return;
        const data = api.getData(id);
        if(!data) return;
        if(act.dataset.act === 'add') return add();
        if(act.dataset.act === 'del'){
          data.items = (data.items || []).filter(x => x.id !== act.dataset.item);
          api.save();
          api.rerender(id);
        }
      });
      body.addEventListener('keydown', e=>{
        if(e.key === 'Enter' && e.target.matches('.kadd input')){ e.preventDefault(); add(); }
      });
    },
  });
})();
