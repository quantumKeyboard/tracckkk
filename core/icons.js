/* ~track : icon set.
   Plain inline SVG strings, no icon font/library dependency (keeps the app
   fully offline-capable). Exposed as Track.ICONS -- plugins get the same
   object handed to them as api.icons, so a plugin can reuse "close", "plus",
   etc. instead of re-drawing common glyphs. */
(function(){
  window.Track = window.Track || {};

  window.Track.ICONS = {
    grip:`<svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><circle cx="6" cy="5" r="1.5"/><circle cx="14" cy="5" r="1.5"/><circle cx="6" cy="10" r="1.5"/><circle cx="14" cy="10" r="1.5"/><circle cx="6" cy="15" r="1.5"/><circle cx="14" cy="15" r="1.5"/></svg>`,
    close:`<svg viewBox="0 0 20 20" width="12" height="12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>`,
    gear:`<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
    chevLeft:`<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
    chevRight:`<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
    plus:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
    minus:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M5 12h14"/></svg>`,
    flame:`<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2c1.2 4.2-3.8 5.3-3.8 9.3a3.8 3.8 0 007.6 0c0-.9-.4-1.7-.9-1.9.4 1.8-.9 2.7-1.8 2.7s-1.8-.9-.9-2.7c-1 .9-1.9 1.9-1.9 3.6a3.8 3.8 0 003.8 3.8 5.7 5.7 0 005.7-5.7c0-4.7-3.8-4.7-7.8-9.1z"/></svg>`,
    shuffle:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`,
    grid:`<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    resize:`<svg viewBox="0 0 16 16" width="12" height="12" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M2 14L14 2M7 14L14 7M12 14L14 12"/></svg>`,
    trash:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>`,
    download:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-4-4l4 4 4-4M4 21h16"/></svg>`,
    upload:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9m-4 4l4-4 4 4M4 3h16"/></svg>`,
    file:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`,
  };
})();
