# changelog

all notable changes to this project are written down here. the format follows
[keep a changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/).

## [unreleased]

## [1.0.0] - 2026-10-20

first public release.

### added
- **installable apps**: a windows installer (`.exe` / `.msi`) and an android `.apk`,
  built with tauri 2 from the same files as the web app (`src-tauri/`).
- **pwa**: `manifest.webmanifest` + `sw.js`, so the hosted app works offline and can
  be installed from chrome/edge on desktop and android.
- `core/platform.js`: native "save as" for exports inside the apps, and external
  links open in the system browser.
- six new plugins: **pomodoro**, **mood**, **journal**, **goals**, **budget**, **links**.
- `npm run check`: syntax, manifest and plugin-contract checks, run in ci.
- github actions for ci, github pages, and tagged releases.
- `PROJECT_MAP.md`, `docs/BUILDING.md`, code of conduct, security policy, issue and
  pull request templates.

### changed
- the dm sans font is now vendored in `vendor/fonts/` instead of loaded from google
  fonts, so the app makes no third-party requests and looks right offline.

### fixed
- puzzle: an image url is now validated and escaped before it's placed in a style
  attribute. previously a crafted url (for example in an imported backup) could
  break out of the attribute and inject markup.
- puzzle: tile colors come from the theme's chart colors instead of hardcoded hex
  values, so they follow themes and dark mode.

[unreleased]: https://github.com/quantumKeyboard/tracckkk/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/quantumKeyboard/tracckkk/releases/tag/v1.0.0
