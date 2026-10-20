/* ~track plugin : quote
   A small rotating line of text with a shuffle button. This is the plugin
   walked through step-by-step in docs/PLUGIN_GUIDE.md -- read that file
   alongside this one. Demonstrates: an array in a plugin's own data,
   reusing an existing button class (.shuffle-btn) instead of inventing a
   new one, and styling a custom bit of markup with css variables instead
   of hardcoded colors. */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  const DEFAULT_QUOTES = [
    'small steps, repeated, beat big plans, abandoned.',
    'the tracker does not care about yesterday. only today\u2019s box.',
    'consistency is a series of small returns.',
    'progress hides inside boring days.',
    'you don\u2019t need motivation. you need a system.',
  ];

  window.TrackPlugins.push({
    type: 'quote',
    label: 'quote',
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 7h4v6H8c0 2-1 3-3 3v-2c1 0 2-1 2-2V7zm8 0h4v6h-3c0 2-1 3-3 3v-2c1 0 2-1 2-2V7z"/></svg>`,
    min: [220, 140],
    defaultSize: [260, 180],

    createData(){
      return { title: 'quote', quotes: DEFAULT_QUOTES.slice(), index: 0 };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const quotes = (data.quotes && data.quotes.length) ? data.quotes : DEFAULT_QUOTES;
      const i = ((data.index || 0) % quotes.length + quotes.length) % quotes.length;
      body.innerHTML = `
        <div style="font-size:13px;line-height:1.6;font-style:italic;color:var(--foreground);padding:2px 2px 12px;">
          ${api.escapeHtml(quotes[i])}
        </div>
        <button class="icon-btn shuffle-btn" data-act="next" aria-label="next quote">${api.icons.shuffle}</button>
      `;
    },

    init(body, id, api){
      body.addEventListener('click', e=>{
        if(!e.target.closest('[data-act="next"]')) return;
        const data = api.getData(id);
        if(!data) return;
        const quotes = (data.quotes && data.quotes.length) ? data.quotes : DEFAULT_QUOTES;
        data.index = ((data.index || 0) + 1) % quotes.length;
        api.save();
        api.rerender(id);
      });
    },
  });
})();
