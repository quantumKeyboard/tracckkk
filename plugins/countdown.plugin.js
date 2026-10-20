(function(){
  window.TrackPlugins = window.TrackPlugins || [];

  window.TrackPlugins.push({
    type: 'countdown',
    label: 'countdown',

    icon:
      '<svg viewBox="0 0 24 24" width="14" height="14" ' +
      'stroke="currentColor" stroke-width="2" fill="none">' +
        '<circle cx="12" cy="12" r="9"/>' +
        '<polyline points="12,7 12,12 15,15"/>' +
      '</svg>',

    min: [200, 140],
    defaultSize: [260, 170],


    createData(){

      const soon =
        new Date(
          Date.now() +
          7 * 24 * 60 * 60 * 1000
        );

      const pad =
        n => String(n).padStart(2, '0');

      const defaultTarget =
        soon.getFullYear() + '-' +
        pad(soon.getMonth() + 1) + '-' +
        pad(soon.getDate()) + 'T' +
        pad(soon.getHours()) + ':' +
        pad(soon.getMinutes());

      return {
        title: 'countdown',
        target: defaultTarget,
        editing: false
      };
    },


    render(body, id, api){

      const data =
        api.getData(id) || {};

      const target =
        data.target
          ? new Date(data.target).getTime()
          : null;

      const diff =
        target
          ? target - Date.now()
          : null;

      const reached =
        diff !== null &&
        diff <= 0;


      /*
       * ========================================================
       * EDIT MODE
       * ========================================================
       */

      if(data.editing){

        const val =
          data.target || '';

        body.innerHTML =

          '<div style="' +
            'display:flex;' +
            'flex-direction:column;' +
            'gap:8px;' +
            'padding:4px;' +
          '">' +

            '<label style="' +
              'font-size:11px;' +
              'color:var(--foreground);' +
              'opacity:.7;' +
            '">' +
              'event name' +
            '</label>' +

            '<input ' +
              'data-field="title" ' +
              'type="text" ' +
              'value="' +
                api.escapeHtml(
                  data.title || ''
                ) +
              '" ' +
              'style="' +
                'background:var(--secondary-background);' +
                'border:1px solid var(--border);' +
                'border-radius:var(--radius-base);' +
                'color:var(--foreground);' +
                'padding:4px 7px;' +
                'font-size:13px;' +
                'width:100%;' +
                'box-sizing:border-box;' +
              '" ' +
              'placeholder="event name"' +
            '/>' +

            '<label style="' +
              'font-size:11px;' +
              'color:var(--foreground);' +
              'opacity:.7;' +
            '">' +
              'target date &amp; time' +
            '</label>' +

            '<input ' +
              'data-field="target" ' +
              'type="datetime-local" ' +
              'value="' +
                api.escapeHtml(val) +
              '" ' +
              'style="' +
                'background:var(--secondary-background);' +
                'border:1px solid var(--border);' +
                'border-radius:var(--radius-base);' +
                'color:var(--foreground);' +
                'padding:4px 7px;' +
                'font-size:13px;' +
                'width:100%;' +
                'box-sizing:border-box;' +
              '" ' +
            '/>' +

            '<button ' +
              'data-act="save-edit" ' +
              'style="' +
                'margin-top:2px;' +
                'background:var(--main);' +
                'color:var(--background);' +
                'border:none;' +
                'border-radius:var(--radius-base);' +
                'padding:5px 10px;' +
                'font-size:12px;' +
                'cursor:pointer;' +
              '">' +
              'done' +
            '</button>' +

          '</div>';

        return;
      }


      /*
       * ========================================================
       * REACHED STATE
       * ========================================================
       */

      if(reached){

        body.innerHTML =

          '<div style="' +
            'display:flex;' +
            'flex-direction:column;' +
            'align-items:center;' +
            'justify-content:center;' +
            'height:100%;' +
            'gap:6px;' +
            'padding:8px;' +
            'text-align:center;' +
          '">' +

            '<div style="' +
              'font-size:22px;' +
              'font-weight:700;' +
              'color:var(--main);' +
            '">' +

              api.escapeHtml(
                data.title || 'countdown'
              ) +

            '</div>' +

            '<div style="' +
              'font-size:11px;' +
              'color:var(--main);' +
              'opacity:.8;' +
            '">' +

              'reached' +

            '</div>' +

            '<button ' +
              'data-act="edit" ' +
              'class="icon-btn" ' +
              'style="' +
                'margin-top:6px;' +
                'font-size:11px;' +
                'padding:3px 8px;' +
                'opacity:.6;' +
              '" ' +
              'aria-label="edit">' +

              'edit' +

            '</button>' +

          '</div>';

        return;
      }


      /*
       * ========================================================
       * NORMAL COUNTDOWN
       * ========================================================
       */

      const values =
        calculateValues(
          diff
        );


      body.innerHTML =

        '<div style="' +
          'display:flex;' +
          'flex-direction:column;' +
          'height:100%;' +
          'padding:4px 6px;' +
          'box-sizing:border-box;' +
          'gap:4px;' +
        '">' +

          /*
           * Header
           */
          '<div style="' +
            'display:flex;' +
            'align-items:center;' +
            'justify-content:space-between;' +
          '">' +

            '<div style="' +
              'font-size:12px;' +
              'color:var(--foreground);' +
              'opacity:.75;' +
              'overflow:hidden;' +
              'text-overflow:ellipsis;' +
              'white-space:nowrap;' +
            '">' +

              api.escapeHtml(
                data.title || 'countdown'
              ) +

            '</div>' +

            '<button ' +
              'data-act="edit" ' +
              'class="icon-btn" ' +
              'style="' +
                'font-size:10px;' +
                'padding:2px 6px;' +
                'opacity:.55;' +
                'flex-shrink:0;' +
              '" ' +
              'aria-label="edit">' +

              'edit' +

            '</button>' +

          '</div>' +


          /*
           * Countdown display
           */
          '<div style="' +
            'display:flex;' +
            'align-items:flex-end;' +
            'justify-content:center;' +
            'gap:6px;' +
            'flex:1;' +
          '">' +

            _unit(
              values.days,
              'days',
              'days'
            ) +

            _sep() +

            _unit(
              values.hours,
              'hrs',
              'hours'
            ) +

            _sep() +

            _unit(
              values.minutes,
              'min',
              'minutes'
            ) +

            _sep() +

            _unit(
              values.seconds,
              'sec',
              'seconds'
            ) +

          '</div>' +

        '</div>';
    },


    init(body, id, api){

      let timer = null;

      let animationFrame = null;

      let lastValues = null;


      /*
       * ========================================================
       * VALUE CALCULATION
       * ========================================================
       */

      function getTarget(){

        const data =
          api.getData(id);

        if(
          !data ||
          !data.target
        ){
          return null;
        }

        const target =
          new Date(
            data.target
          ).getTime();

        return Number.isFinite(target)
          ? target
          : null;
      }


      /*
       * ========================================================
       * REAL-TIME COUNTDOWN VALUES
       * ========================================================
       */

      function getCurrentValues(){

        const target =
          getTarget();

        if(target === null){
          return null;
        }

        const diff =
          target - Date.now();

        return calculateValues(diff);
      }


      /*
       * ========================================================
       * UPDATE A SINGLE DIGIT GROUP
       * ========================================================
       *
       * We animate only when the displayed value changes.
       *
       * The DOM itself is NOT recreated.
       */

      function updateUnit(
        key,
        value
      ){

        const unit =
          body.querySelector(
            '[data-unit="' +
            key +
            '"]'
          );

        if(!unit){
          return;
        }


        const valueEl =
          unit.querySelector(
            '[data-value]'
          );

        if(!valueEl){
          return;
        }


        const current =
          valueEl.textContent;


        /*
         * Nothing changed.
         */
        if(current === value){
          return;
        }


        /*
         * Remove any previous animation.
         */
        valueEl.classList.remove(
          'countdown-number-change'
        );

        /*
         * Force the browser to recognize the removal
         * before adding the class again.
         */
        void valueEl.offsetWidth;


        valueEl.textContent =
          value;

        valueEl.classList.add(
          'countdown-number-change'
        );
      }


      /*
       * ========================================================
       * UPDATE COUNTDOWN
       * ========================================================
       */

      function update(){

        const data =
          api.getData(id);

        if(!data){
          stopTimer();
          return;
        }


        /*
         * NEVER update while editing.
         */
        if(data.editing){
          stopTimer();
          return;
        }


        const values =
          getCurrentValues();

        if(!values){
          return;
        }


        /*
         * Countdown reached zero.
         */
        if(values.reached){

          stopTimer();

          /*
           * One intentional rerender.
           *
           * We need to replace the countdown with
           * the "reached" screen.
           */
          api.rerender(id);

          return;
        }


        /*
         * Update only changed units.
         */
        updateUnit(
          'days',
          values.days
        );

        updateUnit(
          'hours',
          values.hours
        );

        updateUnit(
          'minutes',
          values.minutes
        );

        updateUnit(
          'seconds',
          values.seconds
        );


        lastValues =
          values;
      }


      /*
       * ========================================================
       * HIGH-PRECISION TIMER
       * ========================================================
       *
       * Instead of:
       *
       * setInterval(update, 1000)
       *
       * we align updates to the actual second boundary.
       *
       * This prevents the countdown from drifting.
       */

      function scheduleNextTick(){

        if(timer !== null){
          clearTimeout(timer);
        }


        const now =
          Date.now();

        /*
         * Wait until just after the next second boundary.
         *
         * The +10ms gives the browser a tiny safety margin.
         */
        const delay =
          1000 -
          (now % 1000) +
          10;


        timer =
          setTimeout(
            () => {

              update();

              scheduleNextTick();

            },
            delay
          );
      }


      function startTimer(){

        stopTimer();

        /*
         * Immediately update.
         */
        update();

        /*
         * Then keep synchronized with real time.
         */
        scheduleNextTick();
      }


      function stopTimer(){

        if(timer !== null){

          clearTimeout(timer);

          timer = null;
        }


        if(animationFrame !== null){

          cancelAnimationFrame(
            animationFrame
          );

          animationFrame = null;
        }
      }


      /*
       * ========================================================
       * INITIALIZE
       * ========================================================
       */

      startTimer();


      /*
       * ========================================================
       * CLICK HANDLING
       * ========================================================
       */

      body.addEventListener(
        'click',
        e => {

          /*
           * ----------------------------------------------------
           * EDIT
           * ----------------------------------------------------
           */

          if(
            e.target.closest(
              '[data-act="edit"]'
            )
          ){

            const data =
              api.getData(id);

            if(!data){
              return;
            }


            /*
             * Stop ALL timer activity before replacing
             * the countdown with the form.
             */
            stopTimer();


            data.editing = true;

            api.rerender(id);

            return;
          }


          /*
           * ----------------------------------------------------
           * SAVE
           * ----------------------------------------------------
           */

          if(
            e.target.closest(
              '[data-act="save-edit"]'
            )
          ){

            const data =
              api.getData(id);

            if(!data){
              return;
            }


            const titleEl =
              body.querySelector(
                '[data-field="title"]'
              );

            const targetEl =
              body.querySelector(
                '[data-field="target"]'
              );


            if(titleEl){

              data.title =
                titleEl.value.trim() ||
                'countdown';
            }


            if(targetEl){

              data.target =
                targetEl.value;
            }


            data.editing = false;


            api.save();


            /*
             * Rebuild the display exactly once.
             */
            api.rerender(id);


            /*
             * Restart real-time updating.
             */
            startTimer();

            return;
          }

        }
      );


      /*
       * ========================================================
       * KEYBOARD HANDLING
       * ========================================================
       *
       * ENTER saves the edit form.
       */

      body.addEventListener(
        'keydown',
        e => {

          if(
            e.target.closest(
              '[data-field="target"]'
            ) &&
            e.key === 'Enter'
          ){

            e.preventDefault();

            const saveButton =
              body.querySelector(
                '[data-act="save-edit"]'
              );

            if(saveButton){
              saveButton.click();
            }
          }


          if(
            e.target.closest(
              '[data-field="title"]'
            ) &&
            e.key === 'Enter'
          ){

            e.preventDefault();

            const saveButton =
              body.querySelector(
                '[data-act="save-edit"]'
              );

            if(saveButton){
              saveButton.click();
            }
          }

        }
      );


      /*
       * Store the timer for possible host cleanup.
       */
      body.__countdownTimer =
        timer;
    }
  });


  /*
   * ============================================================
   * CALCULATE COUNTDOWN VALUES
   * ============================================================
   */

  function calculateValues(diff){

    if(
      diff === null ||
      !Number.isFinite(diff)
    ){

      return {
        reached: false,
        days: '--',
        hours: '--',
        minutes: '--',
        seconds: '--'
      };
    }


    if(diff <= 0){

      return {
        reached: true,
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00'
      };
    }


    const totalSec =
      Math.floor(
        diff / 1000
      );


    const days =
      Math.floor(
        totalSec / 86400
      );


    const hours =
      Math.floor(
        (totalSec % 86400) / 3600
      );


    const minutes =
      Math.floor(
        (totalSec % 3600) / 60
      );


    const seconds =
      totalSec % 60;


    const pad =
      n => String(n).padStart(2, '0');


    return {

      reached: false,

      days:
        String(days),

      hours:
        pad(hours),

      minutes:
        pad(minutes),

      seconds:
        pad(seconds)

    };
  }


  /*
   * ============================================================
   * COUNTDOWN UNIT
   * ============================================================
   */

  function _unit(
    value,
    label,
    key
  ){

    return (

      '<div ' +

        'data-unit="' +
        key +
        '" ' +

        'style="' +
          'display:flex;' +
          'flex-direction:column;' +
          'align-items:center;' +
          'min-width:36px;' +
        '">' +

        /*
         * Overflow hidden gives the number-change animation
         * a nice little "slot machine" feel.
         */
        '<div style="' +
          'height:29px;' +
          'overflow:hidden;' +
          'position:relative;' +
          'display:flex;' +
          'align-items:center;' +
          'justify-content:center;' +
        '">' +

          '<span ' +
            'data-value ' +
            'style="' +
              'font-size:26px;' +
              'font-weight:700;' +
              'line-height:1;' +
              'color:var(--foreground);' +
              'font-variant-numeric:tabular-nums;' +
              'display:block;' +
              'will-change:transform,opacity;' +
            '">' +

            value +

          '</span>' +

        '</div>' +

        '<span style="' +
          'font-size:10px;' +
          'color:var(--foreground);' +
          'opacity:.55;' +
          'margin-top:2px;' +
        '">' +

          label +

        '</span>' +

      '</div>'
    );
  }


  /*
   * ============================================================
   * SEPARATOR
   * ============================================================
   */

  function _sep(){

    return (

      '<span style="' +
        'font-size:22px;' +
        'font-weight:300;' +
        'color:var(--foreground);' +
        'opacity:.35;' +
        'padding-bottom:6px;' +
      '">' +

        ':' +

      '</span>'
    );
  }


  /*
   * ============================================================
   * ANIMATION STYLE
   * ============================================================
   *
   * Inject once globally.
   */

  if(
    !document.getElementById(
      'countdown-plugin-animation'
    )
  ){

    const style =
      document.createElement(
        'style'
      );

    style.id =
      'countdown-plugin-animation';


    style.textContent = `

      @keyframes countdownNumberChange {

        0% {
          opacity: 0.25;
          transform:
            translateY(-9px)
            scale(0.96);
        }

        45% {
          opacity: 0.75;
          transform:
            translateY(2px)
            scale(1.015);
        }

        100% {
          opacity: 1;
          transform:
            translateY(0)
            scale(1);
        }

      }


      .countdown-number-change {

        animation:
          countdownNumberChange
          280ms
          cubic-bezier(
            0.22,
            1,
            0.36,
            1
          );

      }

    `;


    document.head.appendChild(
      style
    );
  }

})();

