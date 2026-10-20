/* ~track plugin : counter
   A tiny numeric tally with +/- controls. Good example of a plugin whose
   entire state is a single number. See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];
  window.TrackPlugins.push({
    type: 'counter',
    label: 'counter',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/></svg>`,
    min: [180, 160],
    defaultSize: [220, 200],

    createData(){
      return { title: 'counter', count: 0, step: 1 };
    },

    render(body, id, api){
      const data = api.getData(id) || { count: 0 };
      body.innerHTML = `
        <div class="counter-wrap">
          <button class="icon-btn counter-btn" data-act="dec" aria-label="decrease">${api.icons.minus}</button>
          <div class="counter-num">${data.count}</div>
          <button class="icon-btn counter-btn" data-act="inc" aria-label="increase">${api.icons.plus}</button>
        </div>`;
    },

    init(body, id, api){
      body.addEventListener('click', e=>{
        const act = e.target.closest('[data-act]');
        if(!act) return;
        const data = api.getData(id);
        if(!data) return;
        const step = data.step || 1;
        if(act.dataset.act==='inc') data.count += step;
        else if(act.dataset.act==='dec') data.count -= step;
        api.save();
        api.rerender(id);
      });
    },
  });
})();
