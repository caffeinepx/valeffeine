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

Shipped as 1.0.0 on 2026-11-02. Confirmed by Scarlett on a Pixel 9 (Valenced 352.6 Alpha, versionCode 352206), side by side with stock Discord 329.13 Stable.

The experiment route is dead. 329.13 picked the layout from `useMobileVisualRefreshConfig().chatInputFloating` (experiment `2026-02-mobile-visual-refresh`). 352.6 still registers the experiment, but `ChatInput.tsx` no longer reads it, and the floating pill is the only layout. Forcing the experiment does nothing.

What the plugin does, all inside a wrapper on `memo(ChatInput).type` (`modules/chat_input/native/ChatInput.tsx`):

- Drops `floatingContainer` from the bar's style array. What is left is Discord's own `container`: the 329.13 strip with `BACKGROUND_BASE_LOWER`, a 1px `BORDER_SUBTLE` top border, and `PX_8` padding.
- Clears the chrome on `floatingInputBox` and adds `paddingBottom: 8` there, because `FloatingChatInputContainer` puts an animated `paddingBottom` over the strip's padding.
- Rebuilds the row as `[circle(+)] [pill(field, gift/emoji)] [circle(send/mic)]`.
- Removes `ChatInputScrimGradient`, the solid scrim fill, and `floatingScrimOverlap`.
- Paints the safe-area bottom inset under the bar in the bar color, as 329.13 did.
- Sets `floatingChatInputEnabled` to false on the native chat list (`DCDChatList` hardcodes it to true).

Elements are matched by the key sets of the 352.6 style sheet entries (decoded from the bundle), not by guessed values.

Sizes are pinned, not read from tokens. The 329.13 token resolvers return one value with the refresh on and another with it off, and the old bar is the off column. 352.6 kept the token names, but they now return the on values. Old values: button 40, pill radius 24, pill border 0, pill margin 4, pill padding 2, field `marginLeft` 6. Measured on the phone at 384 dpi: buttons 96 px, gaps 19 px. Colors come from the floating box's own background (`#242429` on dark, against `#26262e` measured on 329.13), so they follow the theme.

Not in this plugin: the apps and gift buttons on the left. 352.6 shows gift inside the pill next to emoji. Send behavior is Discord's own (mic when empty).

Checked: the bar layout in DMs, against 329.13, keyboard closed. Scarlett called the task done before these were walked one by one: threads, server text channels, keyboard open, replies, edits, stickers, GIFs, slash commands, and disabling the plugin live (the render goes back on `cleanup`, and the bar changes on the next re-render). If a client update breaks it, check whether the style keys in `isFloatingContainer`, `isFloatingInputBox`, `isMainRow`, and `isInputFlat` still match.

How the bundles were read (no installs beyond the scratch download Scarlett approved): unzip the APK, then run `hermesc -b -dump-bytecode`. Use the hermesc in `node_modules/react-native` for bytecode v96 (329.13), and `hermes-compiler@250829098.0.19` from npm for v98 (352.6). Object literals were decoded from the raw buffers with a small script. The Gradle package task needs Java, which is not installed here. For local device tests, the ZIP is just `manifest.json` and `index.js` at the root.

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

Shipped as 1.0.0 on 2026-11-02. Confirmed by Scarlett on a Pixel 9 (Valenced 352.6 Alpha, versionCode 352206). The code is the same as the 0.2.6 test build; only the version changed.

The experiment route is dead in 352.6. None of the Tabs V2 / You Tab experiments are in the bundle, and `modules/main_tabs_v2/native/TabsNavigator.tsx` was deleted (329.13 still ships it next to the You bar). There is no legacy tab component left to remount, so the plugin draws the bar itself.

How 352.6 navigates (logged from the live root navigation state):

- Root stack: `main` > `tabs` (MainTabs) > the You bar stack: `guilds`, `icymi`, `notifications`.
- `you` (YouScreen) and `settings` (Settings > SettingsNavigator, a native stack starting at `Overview`) are root screens over `main`.
- The You bar (`memo(YouBarThemed)` in `native/you_bar/YouBar.tsx`) floats over `guilds`. The bell pushes `notifications`, the avatar opens `you`. Channels slide over it, so it is hidden in chats without any logic of its own.
- Lists keep `useYouBarTotalHeight()` free at the bottom: 56 + the bottom inset (80 dp on the Pixel 9).

What the plugin does:

- Wraps `memo(YouBarThemed).type`. The wrapper still calls Discord's render, so the hook order never changes, and returns a docked bar: Home, Notifications, You, Settings. It is 56 dp plus the safe-area inset, the space screens already leave for the You bar.
- `beforeJSX` on the `Notifications`, `YouScreen`, and `Settings` screen components renders each in a box that stops above the bar, with the bar under it. Swapping their exports does nothing, because the navigators hold their own reference.
- Inside those screens, components that are not exported are swapped by type from the rendered tree (a cached wrapper per type that edits the output): `HeaderInner` loses its back button (`PressableOpacity > LeftBackIconWithBadge`), `UnconnectedYouScreen` loses `BackButton` (the X), `YouBannerDecorations` loses the item with `testID=you_tab_settings_button` and its bottom padding, and the `Overview` screen in `SettingsNavigator` gets `headerLeft: () => null`. Settings subpages keep their back arrow. Matching is by function name and testID as they are in 352.6, so re-check them after a client update.
- Tab switches crossfade: `beforeJSX` on React Navigation's shared `Screen` component sets `animation: 'fade'` on the `notifications`, `you`, and `settings` routes instead of Discord's slide-in / slide-up. Setting it from inside the screen was too late for Settings, which loads through `getComponent`. The fade also hides the You screen laying out its banner on the first frames, which looked like a jump with `animation: 'none'`.
- Switching tabs keeps at most one tab screen over the home layout, so hardware Back from any tab lands on Home. With the fade, whatever sits under the incoming screen shows through, so the order matters: You and Settings are pushed over whatever is showing, and the screens left underneath are dropped 500 ms later (a root `RESET` that keeps `main` and the top route, plus `POP_TO_TOP` on the tabs stack). Going to Home or Notifications sets up the tabs stack while it is still covered and then pops the root screen. 0.2.5 popped first and pushed second, which flashed Home between Notifications and Settings. Everything goes through `getRootNavigationRef()` from `RootNavigationRef.native.tsx`.
- Badges: Notifications uses Discord's `useNotificationsTabBadge()`. Home shows mentions across servers and DMs from `GuildReadStateStore.getTotalMentionCount()` (it sums every guild plus the DM bucket; passing `true` leaves DMs out), refreshed with the store's change listener. Each badge is its own small component. Settings are read with plain `useState` + `subscribe`. An earlier build called `jsonStorage.use()` and the badge hook directly in the bar and crashed with a hook-order error on the frozen Home screen.
- Plugin settings (`storage.json`): `showLabels`, and `tabs.notifications` / `tabs.profile` / `tabs.settings`. Home is always on. You and Settings cannot both be off. With the Settings tab off, the You menu gets its Settings button back and Settings keeps its close button.
- Icons: ChatIcon for Home (HomeIcon and ClydeIcon are not loaded on 352.6, and only modules Discord has already run can be found by path), BellIcon, SettingsIcon, and the user's avatar at `AvatarSizes.TABS_22`. Colors are tokens (`Tokens.default.colors`).

Checked on the phone: cold start; every tab from every other tab with the right one selected and no slide; Notifications without its back button; You without the X, with Quests / Shop / Nitro only; Settings without the close button, subpages with their back arrow, bar on all of them; label toggle live; Settings tab off (three tabs, Settings button back on You, close button back on Settings) and on again; hardware Back from Notifications to Home; screen recordings of Notifications > Settings, Notifications > You, You > Settings, Settings > Notifications, and You > Home, all straight crossfades with no Home frame; the selected server on Home survives the cleanup; opening a DM hides the bar and Back brings it back; disabling the plugin live puts the You bar back (checked on 0.1.15).

Not checked: either badge with a real count. The Notifications hook and `getTotalMentionCount()` both returned 0 whenever they were read, because the one live ping was read when the app reopened in that channel. switching accounts, server text channels and threads (only a DM), and the connection banner. The You bar drew Discord's "connecting" banner and this bar drops it. Re-enabling the plugin live only swaps the bar on the next render of the You bar; a restart always does. With the Notifications tab off there is no other way into Notifications. ICYMI has no tab, same as the old layout.

Gotchas for the next session: Valenced applies an update from the local repo on the next start ("pending reload"), so a test cycle is build, restart, restart. A plugin that throws during render gets disabled and stays disabled across updates until it is turned back on in Plugins. `Design.createStyles` cannot run at module load, only after init.
