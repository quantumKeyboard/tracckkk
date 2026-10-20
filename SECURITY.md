# security policy

~track runs entirely on your device: no accounts, no server, no telemetry. the
realistic risks are things like a crafted backup file or plugin data injecting
markup into the page, or the native app being able to do more than it should.

## reporting a vulnerability

please **don't open a public issue** for a security problem. instead, use github's
private reporting: the **security** tab of this repository -> *report a
vulnerability*.

include what you did, what happened, and the version/platform (browser, windows
app, android app). you can expect an acknowledgement within a week. once a fix is
released you'll be credited in the changelog, unless you'd rather not be.

## supported versions

only the latest release gets security fixes.

## scope notes

- **third-party plugins** you add yourself run with the same access as the app.
  only install plugins you've read or trust.
- the native app's permissions are listed in `src-tauri/capabilities/default.json`.
  anything that widens them gets extra review.
