# valeffeine

Plugins for [Valenced](https://valenced.app), a client mod for Discord on mobile. This repo is [Scarlett](https://github.com/caffeinepx)'s.

The tree started from the [official plugin template](https://github.com/Valenced/valenced-plugin-template). Sample plugins that shipped with that template are gone. New work goes in `plugins/`. Theme packs (colors, backgrounds, fonts, icons, emoji) go in `themes/`. One git repo builds every plugin and publishes them as one Valenced repository.

Docs for the host API live at [valenced.app/docs/plugin-development](https://valenced.app/docs/plugin-development). If you are picking this up in a new coding session, read `GROK.md` and `docs/STATUS.md` before editing a plugin.

## Install

Nothing is on the catalog yet. After the first release lands on GitHub Pages, add this URL in the app:

**Settings > Valenced > Plugins > repository settings**

```
https://caffeinepx.github.io/valeffeine
```

You can also install a single ZIP with **Install from file** on that same screen. Valenced checks the ZIP before it asks you to confirm.

## What's in a plugin

Each folder under `plugins/` or `themes/` is one plugin. The folder name is a build label (kebab-case). The `id` inside `manifest.json` is the identity Valenced stores. Change the folder if you want. Do not change the id after a release, or existing installs will not see updates and will lose their settings.

```
plugins/silent-typing/
  manifest.json      # id, version, dependencies, dist paths
  tsconfig.json      # { "extends": "../../tsconfig.base.json" }
  js/index.ts        # JS entry, bundled to index.js
  assets/            # optional files copied into the ZIP
  src/main/kotlin/   # only when the plugin needs native Android code
```

The bundler looks for the JS entry in this order: `js/index.*`, then `src/index.*`, then `index.*`. Extensions it accepts are `.ts`, `.tsx`, `.js`, `.jsx`.

Plugin ids here use the prefix `dev.caffeinepx.`. A typing blocker would be `dev.caffeinepx.silent-typing`.

`manifest.json` format is `1`. Always depend on `valenced.api` (something like `>=1 <2`) and `discord` (`*`, or a floor you have actually run). Version strings look like `1.2.0` or `1.3.0-beta1`. Ranges use `<`, `<=`, `=`, `>=`, `>`, or `*`. Caret and tilde ranges are not valid.

## Build

JS-only plugins need [Bun](https://bun.com/) (Node 22.18+ also works):

```sh
bun install
bun run build          # every plugin
bun run build silent-typing
bun run serve          # local repository on port 8080
```

On a phone that can see your LAN, add the URL `bun run serve` prints. Emulators and some USB setups block cleartext LAN. Forward the port and pin the base URL:

```sh
bun run serve -- --base-url http://127.0.0.1:8080
adb reverse tcp:8080 tcp:8080
```

`bun run lint` runs Biome. `bun run lint:types` typechecks every plugin that has a `tsconfig.json`. With an empty `plugins/` directory that glob matches nothing, so run it again once the first plugin exists.

Native Kotlin also needs JDK 25 and Android SDK platform 36 (`ANDROID_HOME` or `sdk.dir` in `local.properties`). The Valenced Android API comes from GitHub Packages. Put a read-only token in `~/.gradle/gradle.properties`:

```
GitHubPackagesUsername=YOUR_GITHUB_USERNAME
GitHubPackagesPassword=YOUR_PERSONAL_ACCESS_TOKEN
```

The token needs the `read:packages` scope. CI expects the same token as the `READ_PACKAGES_TOKEN` secret, and the Actions variable `ACKNOWLEDGE_PR_SECURITY_WARNING` set to `true` after you require approval for workflows from outside collaborators. Details are in the comment at the top of `.github/workflows/validate.yml`.

Gradle task names come from the folder. `plugins/silent-typing/` becomes `packageSilentTyping`. Folder names must be unique across `plugins/` and `themes/`.

## Releases

Push to `main` after you bump `version` in each changed `manifest.json`. The release workflow builds ZIPs, keeps older versions in a pool (so people already on an old build can still download it), and publishes `index.json` to `gh-pages`.

`repo.config.json` is the name and blurb shown for this repository inside Valenced. Channels in that file are optional pins, not a substitute for bumping versions.

## License

[GPL-3.0](LICENSE), inherited from the Valenced plugin template.
