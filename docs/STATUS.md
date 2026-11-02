# Status

Living list of plugins in this repo. Update this file in the same change that adds, renames, or removes one.

Last updated: 2026-11-02. NoYouBar 1.1.0: split into modules, opaque bar on translucent themes, full screen Settings by default (toggleable). Confirmed on Discord 352.6. Specs are in `docs/DEVELOPMENT.md`.

## Plugins

| Folder | Id | Version | Status | What it does |
| --- | --- | --- | --- | --- |
| `plugins/no-you-bar` | `dev.caffeinepx.no-you-bar` | 1.1.0 | shipped | Task 2. Remove the You bar and bring back the old bottom tabs. |

## Themes

| Folder | Id | Version | Status | What it does |
| --- | --- | --- | --- | --- |
| | | | | |

## Decisions that already stick

- Repo is one Valenced plugin repository, published from `main` to `gh-pages` at `https://caffeinepx.github.io/valeffeine` after the first versioned release.
- Ids look like `dev.caffeinepx.<kebab-name>`. Folder name matches the last segment.
- Author line: `Scarlett (https://github.com/caffeinepx "GitHub")`.
- JS entry is `js/index.ts` unless the plugin is native-only.
- Native Kotlin is opt-in per plugin (`src/main/kotlin` plus `dist.android`). Most plugins should stay JS-only.
- Shared code between plugins is a library plugin under `plugins/`, not a private package.
- Versions in manifests are the Valenced format (`1.2.0`, optional `-label` of `[a-z0-9]+`). Bump the manifest before expecting a publish.
