# building ~track

the app itself needs no build: `index.html` runs straight from disk. this guide is
for the three ways of *packaging* it.

| target | tool | output |
|---|---|---|
| web / pwa | `scripts/build-web.mjs` + `sw.js` | `dist/`, deployable to any static host |
| windows | [tauri 2](https://v2.tauri.app) | `.exe` (nsis) and `.msi` installers |
| android | tauri 2 | `.apk` (and `.aab` for the play store) |

all three ship the same files. `npm run build:web` copies them into `dist/`, and
tauri wraps `dist/` in a native window using the system webview (webview2 on
windows, android system webview), so installers stay small (a few mb, not ~150 mb).

---

## web / pwa

```sh
npm run build:web     # -> dist/
npm run serve         # try it at http://localhost:5173
```

service workers only run over `https://` or `http://localhost`, so offline support and
"install app" only appear when the app is served, not when it's opened from disk.

**github pages**: `.github/workflows/pages.yml` deploys `dist/` on every push to
`main`. enable it once under *repo settings -> pages -> source: github actions*.

if you change which files make up the app shell, update `SHELL` in `sw.js` and bump
its `CACHE` name so installed copies pick up the change.

---

## prerequisites for native builds

- **node 20+** and `npm install` (installs `@tauri-apps/cli`)
- **rust** (stable) via [rustup](https://rustup.rs)
- **windows**: microsoft c++ build tools ("desktop development with c++") and
  webview2 (already on windows 10/11)
- **android**, additionally:
  - android studio, or the sdk command-line tools, with an sdk platform and the **ndk**
  - a **jdk 17+** (android studio's bundled `jbr` works)
  - the rust android targets:
    ```sh
    rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
    ```
  - environment variables (adjust the paths; powershell shown, use `export` on bash):
    ```powershell
    $env:JAVA_HOME    = "C:\Program Files\Android\Android Studio\jbr"
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    $env:NDK_HOME     = "$env:ANDROID_HOME\ndk\<version>"
    ```

the official [tauri prerequisites page](https://v2.tauri.app/start/prerequisites/)
covers macos and linux too.

---

## windows

```sh
npm run desktop:dev      # run the app with the current files
npm run desktop:build    # build installers
```

installers land in `src-tauri/target/release/bundle/`:

- `nsis/track_<version>_x64-setup.exe`: per-user install, no admin prompt (recommended)
- `msi/track_<version>_x64_en-US.msi`: for managed / group-policy installs

the first build downloads the nsis and wix toolsets automatically.

**code signing**: unsigned installers work, but windows smartscreen will warn
("windows protected your pc" -> more info -> run anyway) until the app has a
reputation or is signed. see
[tauri's windows signing guide](https://v2.tauri.app/distribute/sign/windows/).

---

## android

`src-tauri/gen/android/` is committed, so you don't need to run `android init`
unless you delete it. (if you do, re-apply the signing block in
`app/build.gradle.kts` afterwards.)

```sh
npm run android:dev      # run on a connected device or a running emulator
npm run android:build    # release apk, all four cpu architectures
npx tauri android build --apk --target aarch64   # faster: 64-bit arm phones only
npx tauri android build --aab                    # play store bundle
npx tauri android build --apk --debug            # debug-signed, installs anywhere, larger
```

outputs land in `src-tauri/gen/android/app/build/outputs/`.

### signing a release apk

android refuses to install an unsigned apk. create a keystore once and **keep it
safe**: every future update must be signed with the same key.

```sh
keytool -genkey -v -keystore track-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias track
```

then create `src-tauri/gen/android/keystore.properties` (it's git-ignored):

```properties
keyAlias=track
password=<the password you chose>
storeFile=C:\\absolute\\path\\to\\track-release.jks
```

`npm run android:build` will now produce a signed
`app-universal-release.apk`.

for ci, add these repository secrets and the release workflow signs automatically:

| secret | value |
|---|---|
| `ANDROID_KEY_BASE64` | `base64 -w0 track-release.jks` (powershell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("track-release.jks"))`) |
| `ANDROID_KEY_ALIAS` | `track` |
| `ANDROID_KEY_PASSWORD` | the keystore password |

### "creation symbolic link is not allowed for this system"

on windows, tauri links the compiled rust library into the android project with a
symlink, which windows only allows with **developer mode** on: *settings -> system
-> for developers -> developer mode*. turn it on and re-run the build; the rust
part is cached, so the second run is quick. (ci builds on linux and never hits this.)

### installing on a phone

copy the `.apk` to the phone (or download it from a github release), open it, and
allow "install unknown apps" for the app you opened it from when android asks.

---

## releasing

1. bump `version` in `package.json` (tauri reads it from there) and in
   `src-tauri/Cargo.toml`, and add an entry to `CHANGELOG.md`.
2. commit, then tag and push:
   ```sh
   git tag v1.0.0
   git push origin main --tags
   ```
3. `.github/workflows/release.yml` builds the windows installers and the android apk
   and attaches them to a **draft** release. review it on github, then publish.

---

## things to know

- **app identifier** is `io.github.quantumkeyboard.track` (`src-tauri/tauri.conf.json`).
  it's permanent once people install the android app: changing it later makes a
  separate app that can't read the old one's data. change it *before* the first
  public release if you want a different one.
- **data in the native apps** lives in the webview's storage inside the app's data
  folder. uninstalling the app deletes it, so export a backup first.
- **connect a file** (settings -> storage) relies on the file system access api. it
  works in chromium browsers. inside the native apps the option may not appear, and
  storage falls back to the app's own storage automatically.
- the **moments** and **focus** panels load random photos from picsum.photos, so
  they're the one part of the app that needs a network connection.
