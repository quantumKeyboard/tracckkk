# contributing

## submitting a plugin

1. read `docs/PLUGIN_GUIDE.md` -- it's short.
2. write your plugin as `plugins/your-thing.plugin.js`.
3. add its filename to `window.TrackExtraPlugins` in `plugins/manifest.js`.
4. test the full lifecycle locally: add it, edit it, resize it, remove it, reload the
   page, confirm your data survived. try it in dark mode and at phone width too.
5. run `npm run check` (needs node 22+, no `npm install` required). it catches
   syntax errors, a missing manifest entry, contract mistakes, and hardcoded colors.
6. open a pull request containing just those two file changes (your new plugin file,
   plus the one added line in the manifest).

a few things reviewers will check:
- colors come from css variables, not hardcoded hex/rgb values (so it respects every
  theme and dark mode)
- existing classes are reused where they fit, instead of new global css being added
- all visible text is lowercase, matching the rest of the app
- no network calls, no reading/writing outside the plugin's own `data` object
- a plugin with a timer (see `pomodoro.plugin.js`) stops it once `api.getData(id)`
  comes back empty, so a removed element doesn't keep ticking forever
- `min` is a size the content is still usable at, not just "small enough to fit"

## reporting a bug / suggesting a core feature

open an issue (security problems: see `SECURITY.md` instead). for a bug, include: what you did, what you expected, what happened
instead, and your browser. for a feature suggestion, a short description of the
problem it solves is more useful than a description of the solution -- there's often
more than one way to fix a given problem, and the "why" is what's hard to guess later.

## setting up

```sh
git clone https://github.com/quantumKeyboard/tracckkk.git
cd tracckkk
npm run serve        # or just open index.html
```

`npm install` is only needed to build the native apps; see `docs/BUILDING.md`.
`PROJECT_MAP.md` explains where everything lives and how it fits together.

## working on the engine itself

`core/engine.js` is the one file every element (built-in or plugin) depends on, so
changes there are held to a higher bar than a plugin file: they need to keep the
existing plugin contract working exactly as documented, or the change needs to explain
why the contract itself is changing and how existing plugins are affected.

if you're not sure whether something belongs in the engine or should just be a plugin,
default to plugin -- it's much easier to promote a good plugin into core later than to
walk back a core change that turned out to only serve one use case.

## commit messages and versions

short, present-tense commit subjects ("add mood plugin", "fix puzzle url escaping").
user-visible changes get a line under *unreleased* in `CHANGELOG.md`.

by contributing you agree your work is released under the project's MIT license,
and to follow the [code of conduct](CODE_OF_CONDUCT.md).
