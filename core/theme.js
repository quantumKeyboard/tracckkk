/* ~track : theme data.
   Exposes Track.THEMES, Track.THEME_NAMES, Track.applyTheme(name, dark, sharp).
   Only "background", "main" and the five chart colors vary by theme+mode --
   everything else (borders, focus rings, foreground text) only varies by
   light/dark and lives as plain CSS in core/styles.css. */
(function(){
  window.Track = window.Track || {};

  const THEMES = {
    pink:{ light:{bg:'oklch(95.16% 0.0242 343.23)', main:'oklch(71.5% 0.197 354.23)', c:['#FC64AB','#FACC00','#FF7A05','#FF4D50','#7A83FF']},
           dark:{bg:'oklch(26.3% 0.054 358.23)', main:'oklch(65.98% 0.2407 358.64)', c:['#FB3290','#E0B700','#EB6D00','#FF6669','#7A83FF']} },
    cyan:{ light:{bg:'oklch(94.61% 0.043 211.12)', main:'oklch(76.89% 0.139164 219.13)', c:['#00C8F0','#FF7A05','#7A83FF','#FF4D50','#FACC00']},
           dark:{bg:'oklch(27.11% 0.0303 225.38)', main:'oklch(64.37% 0.1162 218.75)', c:['#009DBD','#EB6D00','#7A83FF','#FF6669','#E0B700']} },
    blue:{ light:{bg:'oklch(95% 0.03 255)', main:'oklch(68% 0.16 258)', c:['#3B82F6','#FACC00','#FF7A05','#FF4D50','#00D696']},
           dark:{bg:'oklch(27% 0.04 255)', main:'oklch(60% 0.17 258)', c:['#2563EB','#E0B700','#EB6D00','#FF6669','#00BD84']} },
    rose:{ light:{bg:'oklch(93.37% 0.0339 12.05)', main:'oklch(70.79% 0.1862 16.25)', c:['#FF6678','#7A83FF','#FACC00','#00D696','#5294FF']},
           dark:{bg:'oklch(25.15% 0.0495 7.54)', main:'oklch(67.58% 0.2135 18.63)', c:['#FF4D61','#7A83FF','#E0B700','#00BD84','#5294FF']} },
    yellow:{ light:{bg:'oklch(96.79% 0.0654 102.26)', main:'oklch(86.03% 0.176 92.36)', c:['#FACC00','#7A83FF','#FF4D50','#00D696','#0099FF']},
           dark:{bg:'oklch(29.28% 0.0373 94.38)', main:'oklch(79.36% 0.1624 92.49)', c:['#E0B700','#7A83FF','#FF6669','#00BD84','#008AE5']} },
    orange:{ light:{bg:'oklch(95.38% 0.0357 72.89)', main:'oklch(72.27% 0.1894 50.19)', c:['#FF7A05','#0099FF','#FFBF00','#00D696','#7A83FF']},
           dark:{bg:'oklch(26.86% 0.0327 60.06)', main:'oklch(67.56% 0.1796 49.61)', c:['#EB6D00','#008AE5','#E5AC00','#00BD84','#7A83FF']} },
    red:{ light:{bg:'oklch(93.3% 0.0339 17.77)', main:'oklch(67.28% 0.2147 24.22)', c:['#FF4D50','#5294FF','#FACC00','#05E17A','#7A83FF']},
           dark:{bg:'oklch(24.95% 0.0491 20.19)', main:'oklch(70.49% 0.1869 22.23)', c:['#FF6669','#5294FF','#E0B700','#04C86D','#7A83FF']} },
  };

  function applyTheme(name, dark, sharp){
    const t = THEMES[name][dark ? 'dark':'light'];
    const r = document.documentElement.style;
    r.setProperty('--background', t.bg);
    r.setProperty('--main', t.main);
    t.c.forEach((col,i)=> r.setProperty('--chart-'+(i+1), col));
    document.body.classList.toggle('dark', dark);
    document.body.classList.toggle('sharp', sharp);
  }

  window.Track.THEMES = THEMES;
  window.Track.THEME_NAMES = Object.keys(THEMES);
  window.Track.applyTheme = applyTheme;
})();
