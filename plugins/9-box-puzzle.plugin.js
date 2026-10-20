/* ~track plugin : puzzle
   A 3x3 sliding puzzle. Uses an image of your choice if you give it a url,
   otherwise numbered tiles shaded from the theme's chart colors. */
(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  // only http(s)/data image urls are used, and quotes are percent-encoded, so a
  // url can never break out of the css url("...") it gets placed in
  function safeImageUrl(raw){
    try{
      const u = new URL(String(raw || '').trim());
      if(!['http:','https:','data:'].includes(u.protocol)) return '';
      return u.href.replace(/["'\\()\s]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2,'0'));
    }catch(err){ return ''; }
  }

  window.TrackPlugins.push({
    type: '9-box-puzzle',
    label: 'puzzle',
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="16" y="2" width="6" height="6" rx="1"/><rect x="2" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/><rect x="16" y="9" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/></svg>',
    min: [260, 300],
    defaultSize: [300, 360],

    createData(){
      const tiles = [0,1,2,3,4,5,6,7,8];
      return {
        title: 'puzzle',
        imageUrl: '',
        tiles: tiles,
        solved: true,
      };
    },

    render(body, id, api){
      const data = api.getData(id) || {};
      const tiles = data.tiles || [0,1,2,3,4,5,6,7,8];
      const imageUrl = data.imageUrl || '';
      const bgUrl = safeImageUrl(imageUrl);
      const solved = data.solved || false;

      const containerStyle =
        'display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:6px;gap:6px;';

      const gridStyle =
        'display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);' +
        'gap:3px;flex:1;min-height:0;';

      let tilesHtml = '';
      for(let pos = 0; pos < 9; pos++){
        const tile = tiles[pos];
        const isEmpty = tile === 8;
        const col = tile % 3;
        const row = Math.floor(tile / 3);
        const bgPct = (100 / 2);
        const bgX = col * bgPct;
        const bgY = row * bgPct;

        let tileStyle =
          'border-radius:var(--radius-base);cursor:pointer;position:relative;overflow:hidden;' +
          'transition:opacity 0.1s;';

        if(isEmpty){
          tileStyle += 'background:var(--secondary-background);cursor:default;opacity:0.3;';
        } else if(bgUrl){
          tileStyle +=
            'background-image:url(&quot;' + bgUrl + '&quot;);' +
            'background-size:300% 300%;' +
            'background-position:' + bgX + '% ' + bgY + '%;';
        } else {
          // five theme chart colors, the last four repeated lighter
          const shade = tile < 5 ? 100 : 60;
          tileStyle += 'background:color-mix(in oklch, var(--chart-' + ((tile % 5) + 1) + ') ' + shade + '%, var(--secondary-background));' +
            'display:flex;align-items:center;justify-content:center;';
        }

        if(!isEmpty){
          const numStyle =
            'position:absolute;bottom:2px;right:4px;font-size:10px;color:rgba(255,255,255,0.7);' +
            'font-weight:bold;text-shadow:0 0 3px rgba(0,0,0,0.6);line-height:1;';
          tilesHtml +=
            '<div data-act="move" data-pos="' + pos + '" style="' + tileStyle + '">' +
            '<span style="' + numStyle + '">' + (tile + 1) + '</span>' +
            '</div>';
        } else {
          tilesHtml += '<div style="' + tileStyle + '"></div>';
        }
      }

      let statusHtml = '';
      if(solved){
        statusHtml =
          '<div style="font-size:11px;color:var(--foreground);text-align:center;opacity:0.7;">solved!</div>';
      }

      const btnRowStyle =
        'display:flex;gap:6px;align-items:center;';

      const inputStyle =
        'flex:1;font-size:11px;padding:3px 6px;border-radius:var(--radius-base);' +
        'border:1px solid var(--border);background:var(--secondary-background);' +
        'color:var(--foreground);min-width:0;';

      body.innerHTML =
        '<div style="' + containerStyle + '">' +
          '<div style="' + gridStyle + '">' + tilesHtml + '</div>' +
          statusHtml +
          '<div style="' + btnRowStyle + '">' +
            '<input data-act="url-input" type="text" placeholder="image url (optional)" value="' +
              api.escapeHtml(imageUrl) +
            '" style="' + inputStyle + '"/>' +
            '<button class="icon-btn" data-act="set-url" aria-label="set image" title="set image" style="flex-shrink:0;">' +
              api.icons.upload +
            '</button>' +
          '</div>' +
          '<button class="shuffle-btn" data-act="shuffle" style="width:100%;">' +
            api.icons.shuffle +
            '<span style="margin-left:4px;">shuffle &amp; play</span>' +
          '</button>' +
        '</div>';
    },

    init(body, id, api){
      function getEmptyPos(tiles){
        return tiles.indexOf(8);
      }

      function canMove(pos, emptyPos){
        const pr = Math.floor(pos / 3), pc = pos % 3;
        const er = Math.floor(emptyPos / 3), ec = emptyPos % 3;
        return (pr === er && Math.abs(pc - ec) === 1) ||
               (pc === ec && Math.abs(pr - er) === 1);
      }

      function isSolved(tiles){
        for(let i = 0; i < 9; i++){
          if(tiles[i] !== i) return false;
        }
        return true;
      }

      function shuffle(tiles){
        const arr = tiles.slice();
        // do many random valid moves to ensure solvable state
        let emptyPos = arr.indexOf(8);
        for(let i = 0; i < 500; i++){
          const neighbors = [];
          const er = Math.floor(emptyPos / 3), ec = emptyPos % 3;
          if(er > 0) neighbors.push(emptyPos - 3);
          if(er < 2) neighbors.push(emptyPos + 3);
          if(ec > 0) neighbors.push(emptyPos - 1);
          if(ec < 2) neighbors.push(emptyPos + 1);
          const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
          const tmp = arr[emptyPos];
          arr[emptyPos] = arr[pick];
          arr[pick] = tmp;
          emptyPos = pick;
        }
        // make sure it didn't accidentally end up solved
        if(isSolved(arr)) return shuffle(arr);
        return arr;
      }

      body.addEventListener('click', e => {
        const data = api.getData(id);
        if(!data) return;

        if(e.target.closest('[data-act="shuffle"]')){
          data.tiles = shuffle(data.tiles || [0,1,2,3,4,5,6,7,8]);
          data.solved = false;
          api.save();
          api.rerender(id);
          return;
        }

        if(e.target.closest('[data-act="set-url"]')){
          const input = body.querySelector('[data-act="url-input"]');
          if(input){
            data.imageUrl = input.value.trim();
            api.save();
            api.rerender(id);
          }
          return;
        }

        const moveEl = e.target.closest('[data-act="move"]');
        if(moveEl){
          if(data.solved) return;
          const pos = parseInt(moveEl.dataset.pos, 10);
          const tiles = data.tiles || [0,1,2,3,4,5,6,7,8];
          const emptyPos = getEmptyPos(tiles);
          if(!canMove(pos, emptyPos)) return;
          const arr = tiles.slice();
          arr[emptyPos] = arr[pos];
          arr[pos] = 8;
          data.tiles = arr;
          data.solved = isSolved(arr);
          api.save();
          api.rerender(id);
          return;
        }
      });

      body.addEventListener('keydown', e => {
        if(e.target.closest('[data-act="url-input"]') && e.key === 'Enter'){
          const data = api.getData(id);
          if(!data) return;
          data.imageUrl = e.target.value.trim();
          api.save();
          api.rerender(id);
        }
      });
    },
  });
})();