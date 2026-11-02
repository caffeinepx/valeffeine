# Development tasks

This file is the queue. A session that is told "do task 1" implements only task 1. "Do task 2" implements only task 2. Do not start the other task, and do not invent a third plugin.

Read `GROK.md` first. Host API docs: https://valenced.app/docs/plugin-development

Update the matching row in `docs/STATUS.md` when the task moves (`planned` to `in progress` to `shipped`). Leave a short note at the bottom of the task section: what you patched, which Discord build you checked, and what you could not verify on a device.

## Shared rules

Both plugins are JS-only unless a session proves the old UI only exists in native code. Start with:

```
plugins/<folder>/manifest.json
plugins/<folder>/tsconfig.json      # { "extends": "../../tsconfig.base.json" }
plugins/<folder>/js/index.ts
```

- Id prefix `dev.caffeinepx.`. Folder name is the last segment.
- Author: `Scarlett (https://github.com/caffeinepx "GitHub")`.
- `format` is `1`. `dist.script` is `index.js`.
- Depend on `valenced.api` with `>=1 <2` and `discord` with `*`.
- Version starts at `0.1.0`. Bump to `1.0.0` only after the behavior below is confirmed in the app.
- `export default plugin({ start, stop })`. Put every patch and subscription into `cleanup`.
- Find modules with `@valenced/modules` finders. Do not hardcode webpack ids. Discord renames display names, so filter on stable props and re-check after a client update.
- If an experiment flag still gates the old UI, prefer setting that flag over redrawing the screen. If the flag is gone, patch the component that renders the new UI.
- No settings screen on the first version unless a toggle is required to avoid breaking a screen. Ship the restoration on by default while the plugin is enabled. Stopping the plugin must restore Discord's current UI.
- Do not fork an entire old plugin repo into this tree. Read it, reimplement against the Valenced API, and if a real chunk of code is copied, name the source in `plugins/<folder>/CREDITS.md` and add the author to `contributors` in the manifest. Match their license. This repo is GPL-3.0, so copied code has to be GPL-compatible.
- A search on 2026-11-02 did not find a Valenced, Revenge, or Vendetta plugin that already does either task as specified. The links below are leads, not ports.

## Task 1. Chatbar Restore

**Folder:** `plugins/chatbar-restore`  
**Id:** `dev.caffeinepx.chatbar-restore`  
**Name:** Chatbar Restore  
**Description:** Restores the old chat bar. No floating composer, no extra padding on the sides.

### What "done" looks like

In a text channel, a DM, and a thread:

- The composer sits on the bottom edge, full width, the way it did before the floating pill.
- The left and right gaps around the floating bar are gone.
- Typing, send, the plus / attach button, replies, and edits still work.
- The keyboard opening does not leave a hole or cover the field.
- Stickers, GIF picker, and slash-command suggestions still open against the bar.
- Disabling the plugin brings the floating bar back.

Out of scope: theming the bar, hiding buttons, changing send behavior.

### Where to look first

Vendetta-era clients got the pre-redesign composer by forcing the experiment **Mobile Chat Input Action Menu** to **Not Eligible**. That writeup is on WikiHow ("Get Old Discord Layout", the Vendetta experiments section): https://www.wikihow.com/Get-Old-Discord-Layout

Treat that as a hint that Discord shipped the floating field behind an experiment, not as a recipe. The experiment name may have been removed. Check Valenced's experiments API and the client build on the test device before writing a style patch.

Search terms that have matched this UI in Metro dumps: `ChatInput`, `chat-input`, floating composer, `action menu`. Also look at message list bottom inset. The floating bar usually adds horizontal margin on the input and extra bottom padding on the list so messages clear the pill. Both have to go, or the list still looks inset.

### Implementation order

1. Scaffold the plugin and confirm it loads (`logger` in `start` and `stop`).
2. On the device, identify the component that wraps the composer. Log its props once. Write down the module filter in a comment next to the patch.
3. If an experiment still selects the floating variant, override it for this plugin's lifetime and undo that on `cleanup`.
4. If there is no experiment, patch the style or the render so the bar is full bleed and the message list inset matches the old bar height. Do not clip the safe-area inset at the very bottom. Home indicators still need room. The padding to remove is the extra inset on the left and right of the pill, and the gap between the pill and the screen edges.
5. Walk the done checklist above. Fix the screen that breaks before calling the task finished.

### Notes from the session that does this

(fill in)

## Task 2. NoYouBar

**Folder:** `plugins/no-you-bar`  
**Id:** `dev.caffeinepx.no-you-bar`  
**Name:** NoYouBar  
**Description:** Removes Discord's You bar and restores the old bottom tabs: DMs and servers, Notifications, and Profile plus Settings.

### What "done" looks like

The bottom of the app shows the older three-way tab bar:

1. DMs / servers (the old home tab).
2. Notifications.
3. Profile, with the path through to settings that used to live on that tab.

The You bar is not visible on those screens. Tapping each restored tab opens the same destinations it used to. Unread badges on notifications still show if Discord still computes them. Quitting the plugin puts the You bar back.

Out of scope: a custom server drawer, moving settings into a new screen we design, or restyling the tabs.

### Where to look first

Same Vendetta-era experiment list as task 1, from https://www.wikihow.com/Get-Old-Discord-Layout :

- **Tabs V2 - redesign opt-out for T2** set to **Treatment 1: show**
- **Tabs V2 - redesign opt-out/in for all** set to **Not Eligible**
- **You Tab Individual Feature** set to **Not Eligible**

Those names are from 2024 client builds. Confirm they still exist. If Discord deleted the legacy tab component, an experiment flip will no-op and the session has to patch the tab bar component itself.

Related, and not a port: [Server Drawer](https://github.com/kmmiio99o/vd-plugins) by kmmiio99o hides the quest dock / guilds bar and puts a drawer above the You bar. It does not restore the old tabs. Read it only if you need to see how someone found the bottom bar. Do not copy it unless you credit `plugins/no-you-bar/CREDITS.md`.

Valenced's typed Discord modules include things like `@valenced/discord/modules/main_tabs_v2`. Start there, then finders if the tab bar is not in that package. The import map is the runtime path. Do not guess `valenced.discord.modules.main_tabs_v2` from the specifier without checking `.importmap.json`.

### Implementation order

1. Scaffold the plugin and confirm it loads.
2. Find whether Tabs V2 / You Tab experiments still exist. If they do, apply the legacy treatment while the plugin is started and revert on cleanup.
3. If the experiments are gone, find the component that renders the You bar and the component that still contains the old tabs (dead code in the bundle is common). Patch the navigator so the three legacy routes mount and the You route does not.
4. Check cold start, switching accounts if you can, and opening a channel then going back. The You bar has a habit of returning on the channel list after navigation.
5. Walk the done checklist. If notifications or settings are unreachable, the task is not done.

### Notes from the session that does this

(fill in)
