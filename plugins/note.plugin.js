/* ~track plugin : note
   The simplest possible plugin -- a title and a freeform textarea.
   Good starting point to copy when building your own. See docs/PLUGIN_GUIDE.md */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];
  window.TrackPlugins.push({
    type: 'note',
    label: 'note',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
    min: [220, 180],
    defaultSize: [260, 220],

    createData(){
      return { title: 'note', text: '' };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      if(!body.querySelector('.block-text')){
        body.innerHTML = `<textarea class="block-text" placeholder="write something"></textarea>`;
      }
      const ta = body.querySelector('.block-text');
      // don't clobber what the user is mid-typing on an external re-render
      if(document.activeElement !== ta) ta.value = data.text || '';
    },

    init(body, id, api){
      body.addEventListener('input', e=>{
        if(!e.target.classList.contains('block-text')) return;
        const data = api.getData(id);
        if(data){ data.text = e.target.value; api.save(); }
      });
    },
  });
})();
