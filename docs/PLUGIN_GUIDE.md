# writing a ~track plugin

a plugin is one javascript file. it registers itself, the app picks it up, and it
appears in settings -> elements as something people can add to their canvas. there's
no build step and no api key -- if you can write a function that returns some html,
you can write a plugin.

this guide walks through the contract, then the full `quote` plugin
(`plugins/quote.plugin.js`) line by line, since reading a real working example is worth
more than reading a spec.

---

## the contract

every plugin file looks like this:

```js
window.TrackPlugins = window.TrackPlugins || [];
window.TrackPlugins.push({
  type: 'countdown',
  label: 'countdown',
  icon: '<svg viewBox="0 0 24 24" width="14" height="14">...</svg>',
  min: [200, 140],
  defaultSize: [240, 180],

  createData(){
    return { title: 'countdown', targetDate: '' };
  },

  render(body, id, api){
    // build body.innerHTML from api.getData(id)
  },

  init(body, id, api){
    // attach event listeners to `body`, once
  },
});
```

| field | what it is |
|---|---|
| `type` | a unique, lowercase id for this plugin (letters/numbers/hyphens). used internally and as part of the css hook -- pick something no other plugin is likely to also pick. |
| `label` | the short name shown in the ui. keep it lowercase and one or two words. |
| `icon` | a small inline svg string (roughly a 14x14-24x24 viewBox), shown on the "add element" button. use `stroke="currentColor"` or `fill="currentColor"` so it follows the theme. |
| `min` | `[width, height]` in pixels -- the smallest the element can be resized to. |
| `defaultSize` | `[width, height]` -- the size a freshly-added instance starts at. |
| `createData()` | returns the starting data for a **new instance**. called once, when someone clicks your button in settings. whatever shape you return here is what `api.getData(id)` will hand back later -- design it however your plugin needs. |
| `render(body, id, api)` | fills in the element's content. called once when the element is first created, and again every time `api.rerender(id)` is called. `body` is an empty `<div>` -- set `body.innerHTML`. |
| `init(body, id, api)` | called once, right before the first `render`. attach your event listeners here, not in `render` -- `render` can run many times, `init` never does. |

a person can add as many instances of your plugin as they like -- each one gets its own
`id` and its own independent data. never assume there's only one.

---

## the `api` object

`render` and `init` both receive the same `api`:

| method | what it does |
|---|---|
| `api.getData(id)` | returns the **live** data object for this instance. mutate its fields directly -- `data.count++`, `data.items.push(...)`, etc. |
| `api.save()` | schedules a save of the whole app's data (debounced -- call it after every change, it's cheap). |
| `api.rerender(id)` | re-runs your `render` function so the screen reflects a data change. call this after `api.save()` whenever the change should be visible immediately. |
| `api.escapeHtml(str)` | escapes a string before you put it in `innerHTML`. **always wrap user-typed text in this** before rendering it back -- otherwise someone typing `<b>` into your plugin breaks the layout. |
| `api.uid()` | a short random id, handy for list items (`{ id: api.uid(), text: '...' }`). |
| `api.icons` | the app's shared icon set: `close`, `plus`, `minus`, `chevLeft`, `chevRight`, `shuffle`, `trash`, `download`, `upload`, `grip`. reuse these instead of drawing your own for common actions. |

that's the whole surface. plugins never touch engine internals, global state, or other
plugins' data -- which is deliberate, so the engine can keep changing underneath without
breaking anyone's plugin.

---

## walkthrough: `quote.plugin.js`

the full file is in `/plugins` -- open it side by side with this section.

**the data shape.** a quote plugin needs a list of quotes and which one is showing:

```js
createData(){
  return { title: 'quote', quotes: DEFAULT_QUOTES.slice(), index: 0 };
}
```

`title` is a convention, not a requirement of the contract -- the engine uses
`data.title` for the editable label in the element's header if it's present, so it's
worth including, but your plugin is free to ignore it internally.

**render reads data, never assumes it exists.** the very first render of a brand-new
instance happens right after `createData()`, so `data` is always there in practice --
but defensive code is one line and saves you a crash if data ever comes back malformed
(e.g. from an old export):

```js
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
}
```

two things worth noticing:
- the quote text goes through `api.escapeHtml` even though *this* plugin never lets
  the user type a quote in -- it's cheap insurance, and it's the habit to build.
- the shuffle button reuses `.icon-btn` and `.shuffle-btn`, both of which already exist
  in the app's stylesheet. no new css was written for this plugin at all.

**init attaches one listener, using delegation.** rather than binding a click handler
to the button directly (which would need re-binding every render), listen on `body`
once and check what was actually clicked:

```js
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
}
```

mutate `data` directly, `save()`, then `rerender(id)` to reflect it. that's the whole
lifecycle of a plugin interaction.

---

## styling

- **never hardcode colors.** always use the app's css variables so your plugin follows
  every theme and dark mode automatically, for free:
  `var(--main)`, `var(--background)`, `var(--secondary-background)`, `var(--foreground)`,
  `var(--border)`, `var(--radius-base)`.
- **reuse existing classes before inventing new ones.** the stylesheet already has:
  - `.icon-btn` -- an icon-only button
  - `.add-row-btn` -- a full-width dashed-border button with an icon and label
  - `.shuffle-btn` -- a full-width bordered button (used for "regenerate"-style actions)
  - `.ktick` + `.ktext` -- a checkbox-and-editable-text row (see `checklist.plugin.js`)
  - `.kadd` (wrapping an `<input>` and a button) -- an "add item" row (see `checklist.plugin.js`)
  - `.mini-x` -- a small round delete button
- **if nothing fits, use an inline `style="..."`** built from the same css variables,
  the way `quote.plugin.js` does for its text block. there's currently no mechanism for
  a plugin to ship its own stylesheet, so inline styles (with variables, not literal
  colors) are the escape hatch.
- **keep all visible text lowercase.** the entire app is intentionally all-lowercase as
  a design choice -- match it.

## a few rules that keep things from breaking

- pick a `type` that's unlikely to collide with someone else's plugin (the engine will
  warn in the console and let the later one win, but it's better to just avoid it).
- never read or write another element's data, `localStorage`, or engine internals --
  the only door in is the `api` you're given.
- no network calls. a plugin's whole job is to read and write its own `data` object.
- test the full lifecycle before you consider it done: add it, edit it, resize it below
  and above its `min`, remove it, reload the page, confirm it comes back exactly as you
  left it.

---

## more examples

once `quote` makes sense, these show patterns it doesn't:

| plugin | shows how to |
|---|---|
| `note.plugin.js` | keep a textarea from being clobbered while someone types |
| `checklist.plugin.js` | a list of sub-items with add / edit / remove |
| `pomodoro.plugin.js` | a live ticking display that updates text in place, a timer that stops itself when the element is removed, and state stored as a timestamp so it survives reloads |
| `mood.plugin.js` | shading with `color-mix()` over `var(--main)` so a heatmap follows every theme |
| `journal.plugin.js` | per-day data keyed by date, and building the skeleton once then updating parts of it |
| `goals.plugin.js` | in-place editable numbers that are only parsed on blur |
| `budget.plugin.js` | reusing the insights panel's `.stat` blocks, month navigation |
| `links.plugin.js` | validating urls before they reach an `href` |

## a note on timers

the contract has no "destroy" hook. if your plugin uses `setInterval`, check
`api.getData(id)` on each tick and clear the interval when it returns nothing: that
means the element was removed (or everything was reset or replaced by an import).

```js
const timer = setInterval(()=>{
  const data = api.getData(id);
  if(!data){ clearInterval(timer); return; }
  // ...update the display
}, 1000);
```

## trying it locally

1. write your file as `plugins/your-thing.plugin.js`, following the shape above.
2. open `plugins/manifest.js` and add the filename to the list:
   ```js
   window.TrackExtraPlugins = [
     'quote.plugin.js',
     'your-thing.plugin.js',
   ];
   ```
3. refresh `index.html`. your plugin's button should appear under
   settings -> elements, next to note / checklist / counter / quote.
4. run `npm run check` to catch contract mistakes before anyone else does.

**if it doesn't show up**, open settings -> elements first -- a red banner there will
tell you exactly what went wrong (the file couldn't be found, it threw an error while
loading, or it loaded but never called `window.TrackPlugins.push(...)`). the same
detail is also logged to the browser console if you'd rather look there.

no build step, no restart, nothing else to configure.

## sharing it

see `CONTRIBUTING.md` for how to submit a plugin back to the project.
