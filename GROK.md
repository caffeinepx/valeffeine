# GROK.md

Instructions for coding agents working in this repo. Read this file and `docs/STATUS.md` at the start of a session before you add or change a plugin.

## What this repo is

`valeffeine` is Scarlett's monorepo of plugins for [Valenced](https://valenced.app) (Discord mobile client mod). GitHub: https://github.com/caffeinepx/valeffeine. Author string to put in new manifests:

```
Scarlett (https://github.com/caffeinepx "GitHub")
```

There is no Discord user id on file. Do not invent one.

The checkout was generated from https://github.com/Valenced/valenced-plugin-template on 2026-11-02. Sample plugins and sample themes were removed on purpose. Do not restore `example-*` or `always-errors` unless Scarlett asks.

Host docs (source of truth for the API, not this file):

- Overview: https://valenced.app/docs/plugin-development
- Setup: https://valenced.app/docs/plugin-development/getting-started/setting-up-your-environment
- Template layout: https://valenced.app/docs/plugin-development/getting-started/the-plugin-template
- First plugin: https://valenced.app/docs/plugin-development/getting-started/your-first-plugin
- Libraries: https://valenced.app/docs/plugin-development/getting-started/making-library-plugins
- Testing: https://valenced.app/docs/plugin-development/getting-started/testing-your-plugin
- Publishing: https://valenced.app/docs/plugin-development/getting-started/publishing-your-plugin
- API index: https://valenced.app/docs/plugin-development/api-reference
- Machine-readable map: https://valenced.app/llms.txt

When the docs and this file disagree about the API, trust the docs and update this file.

## Where code goes

| Kind | Path | Id |
| --- | --- | --- |
| JS or native plugin | `plugins/<kebab-name>/` | `dev.caffeinepx.<kebab-name>` |
| Theme, background, font, icon, or emoji pack | `themes/<kebab-name>/` | `dev.caffeinepx.<kebab-name>` |

Folder names must be unique across both directories. Gradle turns the folder name into the task, so `my-plugin` packages as `packageMyPlugin`. Keep names kebab-case.

Minimum files for a JS plugin:

```
plugins/<name>/manifest.json
plugins/<name>/tsconfig.json    # { "extends": "../../tsconfig.base.json" }
plugins/<name>/js/index.ts
```

`format` is `1`. `dist.script` is `index.js` (the bundle output, not the TS source). Dependencies must include `valenced.api` and `discord`.

Native code, when a plugin actually needs it, lives in `src/main/kotlin/` and is declared under `dist.android` (`path` + `class`). Add `@file:JvmName` so the class name does not pick up the Kotlin `Kt` suffix. JS stays in `js/` so it does not mix with `src/main`.

Runtime files the plugin reads (fonts, images) go in `assets/` next to the manifest. Packaging copies that folder into the ZIP.

A plugin with no `tsconfig.json` is skipped by `bun run lint:types`. Add the tsconfig.

## How a plugin is shaped

Entrypoint is `export default plugin({ ... })` from the ambient helper in `@valenced/types`. Lifecycle methods receive a scoped `api`: `cleanup`, `logger`, `jsonStorage`, `decorate`, `unscoped`, and the stage-specific surface.

APIs show up by stage. `patcher`, `modules`, `plugins`, `assets`, `externals`, `utils`, `react`, and most of `discord` exist from `preInit`. Some Discord submodules wait until `init`. Reading an API before its stage throws.

Register teardown with `cleanup(...)`. Patches and Flux subscriptions return unsubscribers. Pass those in.

Settings persist through `jsonStorage` (`storage.json` in the plugin data dir). Declare `jsonStorage: { load: true, default: { ... } }` on the plugin object when the plugin has settings.

Imports use `@valenced/*`. The bundler rewrites them from the import map in `@valenced/types`. Do not hand-roll `valenced.foo` paths from the module specifier. A few mappings are not obvious (`@valenced/externals/*` lands on PascalCase).

Library plugins are ordinary plugins. Dependents list the library id under `dependencies`. Expose shared helpers on `unscoped` in `start` and delete them in `stop`, or use `decorate` when the helper needs the caller's plugin id, logger, or cleanup.

## Commands

```sh
bun install
bun run build                 # valenced-plugin build
bun run build:dev
bun run build <folder-name>
bun run serve                 # http://<lan-ip>:8080
bun run lint                  # biome
bun run lint:types            # fails while plugins/ and themes/ have zero tsconfigs
bun run plan-releases
```

DevTools, if you need a live client:

```sh
bun install --global @revenge-mod/devtools-server
revenge-devtools
```

Connect from the device at Settings > Valenced > Developer > Connect to DevTools (`localhost:7864`).

Native builds: JDK 25, Android SDK platform 36, and `GitHubPackagesUsername` / `GitHubPackagesPassword` in `~/.gradle/gradle.properties` (`read:packages`). Do not commit that file or any token. `gradle/libs.versions.toml` pins `valencedApi`.

## Releases

Bump `version` in the plugin's `manifest.json` before a push to `main` that should publish. The workflow keeps old ZIPs. Do not force-downgrade a version. `repo.config.json` holds the repository display name (`valeffeine`) and description. Edit it when the catalog's public blurb should change, not for every plugin.

Pages URL, once a release exists: `https://caffeinepx.github.io/valeffeine`.

CI validate uses `pull_request_target` and will fail until the repo variable `ACKNOWLEDGE_PR_SECURITY_WARNING` is `true` and `READ_PACKAGES_TOKEN` is set. Say so if a PR build fails for that reason. Do not weaken the workflow to skip the check.

## Session bookkeeping

When you add, rename, or drop a plugin, update `docs/STATUS.md` in the same change. One row per plugin: folder, id, version, one-line purpose, status (`planned`, `in progress`, `shipped`).

Keep `README.md` and this file free of em dashes. Write them like a person who has used the repo: short sentences, concrete paths, no brochure language. Public README is for someone installing or browsing GitHub. This file is for the next agent.

Do not commit `node_modules/`, `build/`, or `local.properties`.
