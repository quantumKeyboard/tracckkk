/* ~track : extra plugin manifest.
   note, checklist and counter ship by default and load automatically --
   they don't need to be listed here.

   To add a community plugin:
     1. drop the .plugin.js file in this /plugins folder
     2. add its filename to the list below
     3. refresh -- no build step, nothing else to configure

   (this is a .js file rather than a .json file on purpose: opening
   index.html directly from disk, some browsers block fetching local json
   files for security reasons, but a plain <script> tag always works.) */
window.TrackExtraPlugins = [
  'quote.plugin.js',
  '9-box-puzzle.plugin.js',
  'countdown.plugin.js',
  'pomodoro.plugin.js',
  'mood.plugin.js',
  'journal.plugin.js',
  'goals.plugin.js',
  'budget.plugin.js',
  'links.plugin.js',
];
