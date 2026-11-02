<div align="center">

# valeffeine

**Plugins for [Valenced](https://valenced.app), the Discord mobile client mod.**
Bring back the old chat bar and the old bottom tabs.

<p>
  <a href="https://github.com/caffeinepx/valeffeine/commits/main"><img alt="Commits" src="https://img.shields.io/github/commit-activity/t/caffeinepx/valeffeine?style=for-the-badge&logo=git&logoColor=white&label=commits&color=5865F2"></a>
  <a href="https://github.com/caffeinepx/valeffeine/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/caffeinepx/valeffeine?style=for-the-badge&logo=github&logoColor=white&label=last%20commit&color=3ba55d"></a>
  <a href="https://github.com/caffeinepx/valeffeine/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/caffeinepx/valeffeine?style=for-the-badge&logo=github&logoColor=white&color=f0b232"></a>
</p>
<p>
  <a href="https://github.com/caffeinepx/valeffeine/actions/workflows/validate.yml"><img alt="Validate" src="https://img.shields.io/github/actions/workflow/status/caffeinepx/valeffeine/validate.yml?style=flat-square&label=validate"></a>
  <a href="https://github.com/caffeinepx/valeffeine/actions/workflows/release.yml"><img alt="Release" src="https://img.shields.io/github/actions/workflow/status/caffeinepx/valeffeine/release.yml?style=flat-square&label=release"></a>
  <a href="https://github.com/caffeinepx/valeffeine/issues"><img alt="Issues" src="https://img.shields.io/github/issues/caffeinepx/valeffeine?style=flat-square"></a>
  <a href="https://github.com/caffeinepx/valeffeine/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/caffeinepx/valeffeine?style=flat-square&color=f0b232"></a>
  <img alt="Bun" src="https://img.shields.io/badge/built%20with-Bun-black?style=flat-square&logo=bun&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/github/languages/top/caffeinepx/valeffeine?style=flat-square&logo=typescript&logoColor=white">
  <img alt="Repo size" src="https://img.shields.io/github/repo-size/caffeinepx/valeffeine?style=flat-square">
</p>

</div>

---

## Plugins

| Plugin | Version | What it does |
| --- | --- | --- |
| **NoYouBar** <br><sub>`dev.caffeinepx.no-you-bar`</sub> | 1.0.1 | Removes the You bar and restores the old bottom tabs: Home, Notifications, Profile and Settings. |

Confirmed on a Pixel 9 with Valenced 352.6. Turning the plugin off puts Discord's current UI back.

## Install

Add the repository in the app:

**Settings > Valenced > Plugins > repository settings**

```
https://caffeinepx.github.io/valeffeine
```

Then pick the plugins from the catalog. To install a single build instead, use **Install from file** on the same screen and choose a plugin ZIP.

## Build from source

You need [Bun](https://bun.com/) (Node 22.18+ also works).

```sh
git clone https://github.com/caffeinepx/valeffeine.git
cd valeffeine
bun install

bun run build                 # every plugin
bun run build no-you-bar      # one plugin
bun run serve                 # local repository on port 8080
```

Add the URL that `serve` prints in the app. If your phone can't reach your LAN, forward the port over USB:

```sh
bun run serve -- --base-url http://127.0.0.1:8080
adb reverse tcp:8080 tcp:8080
```

Other scripts: `bun run lint` (Biome) and `bun run lint:types` (TypeScript).

Native Kotlin plugins also need JDK 25, Android SDK platform 36, and a GitHub Packages token. None of the plugins here use native code, so you can skip that.

## Layout

```
plugins/<name>/
  manifest.json     # id, version, dependencies
  js/index.ts       # entry, bundled to index.js
themes/             # theme packs (none yet)
docs/               # status and task notes
```

Ids use the prefix `dev.caffeinepx.`. Don't change an id after a release, or installs won't see updates.

## Releases

Bump `version` in the changed `manifest.json`, then push to `main`. The release workflow builds the ZIPs and publishes the index to `gh-pages`.

## Docs

- [Valenced plugin development](https://valenced.app/docs/plugin-development)
- [`docs/STATUS.md`](docs/STATUS.md) for what's shipped
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for how each plugin was built
- [`GROK.md`](GROK.md) for coding agents working in this repo

## License

[GPL-3.0](LICENSE)
