/* ~track plugin : checklist
   A single freeform to-do list -- lighter than the full kanban board.
   Demonstrates a plugin with a list of sub-items, inline add/edit/remove,
   and re-rendering itself after each change. See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];
  window.TrackPlugins.push({
    type: 'checklist',
    label: 'checklist',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l1.5 1.5L8 5"/><path d="M4 12l1.5 1.5L8 11"/><path d="M4 18l1.5 1.5L8 16"/><path d="M12 6h8M12 12h8M12 18h8"/></svg>`,
    min: [220, 200],
    defaultSize: [260, 280],

    createData(){
      return { title: 'checklist', items: [] };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const items = data.items || [];
      body.innerHTML = `
        <div class="check-list">${items.map(it => `
          <div class="check-row" data-item="${it.id}">
            <button class="ktick ${it.done ? 'on' : ''}" data-act="toggleitem" data-item="${it.id}" aria-label="done"></button>
            <span class="ktext" contenteditable="true" data-item="${it.id}">${api.escapeHtml(it.text)}</span>
            <button class="mini-x" data-act="delitem" data-item="${it.id}" aria-label="remove">${api.icons.close}</button>
          </div>`).join('')}
        </div>
        <div class="kadd">
          <input type="text" placeholder="add item"/>
          <button class="icon-btn small" data-act="additem" aria-label="add item">${api.icons.plus}</button>
        </div>
      `;
    },

    init(body, id, api){
      function addItem(text){
        text = (text || '').trim();
        if(!text) return;
        const data = api.getData(id);
        if(!data) return;
        data.items.push({ id: api.uid(), text, done: false });
        api.save();
        api.rerender(id);
      }
      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act) return;
        const data = api.getData(id);
        if(!data) return;
        const a = act.dataset.act;
        if(a==='additem'){
          const input = body.querySelector('.kadd input');
          addItem(input ? input.value : '');
        } else if(a==='toggleitem'){
          const item = data.items.find(x=>x.id===act.dataset.item);
          if(item){ item.done = !item.done; api.save(); api.rerender(id); }
        } else if(a==='delitem'){
          data.items = data.items.filter(x=>x.id!==act.dataset.item);
          api.save(); api.rerender(id);
        }
      });
      body.addEventListener('keydown', e=>{
        if(e.key==='Enter' && e.target.matches('.kadd input')){
          e.preventDefault();
          addItem(e.target.value);
        }
      });
      body.addEventListener('input', e=>{
        if(!e.target.classList.contains('ktext')) return;
        const data = api.getData(id);
        if(!data) return;
        const item = data.items.find(x=>x.id===e.target.dataset.item);
        if(item){ item.text = e.target.textContent; api.save(); }
      });
    },
  });
})();
