import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { lookupModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { ReactNativeSafeAreaContext } from '@valenced/externals/react-native-safe-area-context'
import {
	getModuleDependencies,
	isModuleInitialized,
} from '@valenced/modules/metro'
import { memo, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { switchTab } from './navigation'
import { found, useFoundModules, useSettings } from './state'
import type { ComponentType, ReactNode } from 'react'
import type { Badge, Props, Tab } from './state'

// The bar itself: icons, styles, badges, and the TabBar component.

const ICONS = 'design/components/Icon/native/redesign/generated/'
const AVATAR = 'design/void/Avatar/native/Avatar.tsx'

export const BAR_HEIGHT = 56
// AvatarSizes.TABS_22: the size Discord kept for the old You tab.
const TAB_AVATAR_SIZE = 'tabs22'

type Icon = ComponentType<{ size?: string; color?: unknown }>

// Icon modules load lazily. Only modules Discord has already run can be
// found by path, so each slot takes the first one that is there. On a cold
// start some of them may not have run yet when the bar first renders: the
// bar is drawn anyway with an empty slot, and start() re-renders it as each
// icon module arrives (ICON_PATHS + foundModulesChanged).
const ICON_CHOICES = {
	home: ['HomeIcon', 'ClydeIcon', 'ChatIcon'],
	bell: ['BellIcon'],
	user: ['UserCircleIcon', 'UserIcon'],
	settings: ['SettingsIcon'],
} as const

export const ICON_PATHS = [...new Set(Object.values(ICON_CHOICES).flat())].map(
	name => `${ICONS}${name}.tsx`,
)

const iconCache: Partial<Record<keyof typeof ICON_CHOICES, Icon>> = {}

function icon(slot: keyof typeof ICON_CHOICES): Icon | undefined {
	if (iconCache[slot]) return iconCache[slot]
	for (const name of ICON_CHOICES[slot]) {
		const [exports] = lookupModuleWithImportedPath(
			`${ICONS}${name}.tsx`,
		) as unknown[]
		const fn = (exports as Record<string, unknown> | undefined)?.[name]
		if (typeof fn === 'function') {
			iconCache[slot] = fn as Icon
			return iconCache[slot]
		}
	}
}

let avatarCache: ComponentType<Props> | undefined
function avatarComponent(): ComponentType<Props> | undefined {
	if (avatarCache) return avatarCache
	const [exports] = lookupModuleWithImportedPath(AVATAR) as unknown[]
	const fn = (exports as { default?: unknown } | undefined)?.default
	if (fn) avatarCache = fn as ComponentType<Props>
	return avatarCache
}

type UserStore = {
	getCurrentUser?: () => unknown
	addChangeListener?: (listener: () => void) => void
	removeChangeListener?: (listener: () => void) => void
}

function userStore() {
	return (Stores as Record<string, UserStore>).UserStore
}

function currentUser() {
	return userStore()?.getCurrentUser?.()
}

// The bar no longer re-renders with Discord's You bar, so it follows the
// current user itself (new avatar, account switch). UserStore emits for
// every user Discord loads; the state only changes when the current user
// record does, so other emits cost a getter call.
function useCurrentUser() {
	const [user, setUser] = useState(currentUser)
	useEffect(() => {
		const store = userStore()
		const update = () => setUser(currentUser())
		update()
		store?.addChangeListener?.(update)
		return () => store?.removeChangeListener?.(update)
	}, [])
	return user
}

// Long press on You: the account sheet (online status, switch accounts,
// theme), the same sheet Discord's You bar opens from its avatar, with the
// same soft haptic. showYouAccountActionSheet is imported by the You bar
// module, so it is loaded by the time this bar replaces it.
const ACCOUNT_SHEET =
	'modules/main_tabs_v2/native/tabs/you/utils/showYouAccountActionSheet.tsx'
const HAPTIC_MODULES = [
	'modules/haptics/HapticUtils.native.tsx',
	'modules/haptics/HapticFeedbackTypes.tsx',
]

function softHaptic() {
	let trigger: ((type: unknown) => void) | undefined
	let soft: unknown
	for (const path of HAPTIC_MODULES) {
		const [exports] = lookupModuleWithImportedPath(path) as {
			triggerHapticFeedback?: (type: unknown) => void
			HapticFeedbackTypes?: { SOFT?: unknown }
		}[]
		trigger ??= exports?.triggerHapticFeedback
		soft ??= exports?.HapticFeedbackTypes?.SOFT
	}
	if (trigger && soft !== undefined) trigger(soft)
}

type SheetModule = { showYouAccountActionSheet?: () => void }

// Modules whose press handlers lazy-import the account sheet in stock
// Discord. All of them are initialized once the You bar has rendered.
const SHEET_IMPORTERS = [
	'modules/main_tabs_v2/native/you_bar/YouBar.tsx',
	'modules/main_tabs_v2/native/you_bar/YouBarUser.tsx',
	'modules/main_tabs_v2/native/you_bar/YouBarAvatar.tsx',
	'modules/main_tabs_v2/native/you_bar/YouBarAvatarDefault.tsx',
	'modules/main_tabs_v2/native/you_bar/YouBarNameplate.tsx',
]

function sheetModule(): SheetModule | undefined {
	const [exports] = lookupModuleWithImportedPath(ACCOUNT_SHEET) as SheetModule[]
	if (exports) return exports
	// Discord initializes showYouAccountActionSheet only from press handlers
	// this bar replaced, so the module has no id yet. It is a lazy dependency
	// of one of the modules above: require their few uninitialized
	// dependencies until the path resolves.
	let budget = 12
	for (const path of SHEET_IMPORTERS) {
		const importer = lookupModuleWithImportedPath(path) as
			| [unknown, number]
			| []
		if (importer[1] === undefined) continue
		for (const dep of getModuleDependencies(importer[1]) ?? []) {
			if (isModuleInitialized(dep)) continue
			if (budget-- <= 0) return
			try {
				__r(dep)
			} catch {
				// A lazy chunk that failed to load; keep looking.
			}
			const [found] = lookupModuleWithImportedPath(
				ACCOUNT_SHEET,
			) as SheetModule[]
			if (found) return found
		}
	}
}

function openAccountSheet() {
	const show = sheetModule()?.showYouAccountActionSheet
	if (typeof show !== 'function') return
	softHaptic()
	show()
}

// The tokens module is an ES module; the token tables are on `default`.
function tokenColors(): Record<string, unknown> {
	return (
		(Tokens as { default?: { colors?: Record<string, unknown> } }).default
			?.colors ?? {}
	)
}

// Themes may give the background token an alpha channel so a wallpaper shows
// through. Content scrolls under the docked bar, so the bar itself must not
// be see-through: the alpha is stripped and the theme's color kept.
function opaque(color: unknown): unknown {
	if (typeof color !== 'string') return color
	const hex8 = /^#([0-9a-f]{6})[0-9a-f]{2}$/i.exec(color)
	if (hex8) return `#${hex8[1]}`
	const hex4 = /^#([0-9a-f]{3})[0-9a-f]$/i.exec(color)
	if (hex4) return `#${hex4[1]}`
	const fn = /^(rgb|hsl)a\((.+),[^,]*\)$/i.exec(color)
	if (fn) return `${fn[1]}(${fn[2]})`
	return color
}

const sheet = (colors = tokenColors()) => ({
	bar: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: 'row',
		backgroundColor: opaque(colors.BACKGROUND_BASE_LOWER),
		borderTopWidth: 1,
		borderTopColor: colors.BORDER_SUBTLE,
	},
	tab: {
		flex: 1,
		height: BAR_HEIGHT,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	iconBox: {
		height: 24,
		minWidth: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badge: {
		position: 'absolute',
		top: -4,
		left: 14,
		minWidth: 16,
		height: 16,
		paddingHorizontal: 4,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.STATUS_DANGER,
	},
	dot: {
		position: 'absolute',
		top: -2,
		left: 18,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.STATUS_DANGER,
	},
})

type Styles = Record<keyof ReturnType<typeof sheet>, object>

// Discord's design API is only there after init, so the sheet is built on
// first render.
let useStylesHook: (() => Styles) | undefined
function useStyles(): Styles {
	useStylesHook ??= Design.createStyles(sheet() as never) as () => Styles
	return useStylesHook()
}

type TabSpec = {
	tab: Tab
	label: string
	glyph: ReactNode
	badge?: 'home' | 'notifications'
}

// memo: the home bar is rendered from Discord's You bar, which re-renders
// on every presence, activity, and voice update. The bar's own hooks
// (settings, modules, badges, current user, theme) re-render it when
// something it shows changes; nothing else needs to.
export const TabBar = memo(function TabBar({ active }: { active: Tab }) {
	const styles = useStyles()
	const insets = ReactNativeSafeAreaContext?.useSafeAreaInsets?.()
	const settings = useSettings()
	// Re-render when a module (an icon, the badge hook) arrives after the
	// first render.
	useFoundModules()
	const user = useCurrentUser()

	const colors = tokenColors()
	const tint = (tab: Tab) =>
		active === tab
			? colors.INTERACTIVE_ICON_ACTIVE
			: colors.INTERACTIVE_ICON_DEFAULT

	// An icon whose module has not run yet leaves its slot empty until it
	// does; the bar itself is always drawn, so the You bar never shows.
	const Home = icon('home')
	const Bell = icon('bell')
	const Gear = icon('settings')
	const Avatar = avatarComponent()
	const UserIcon = icon('user')
	let you: ReactNode = null
	if (Avatar && user) you = <Avatar user={user} size={TAB_AVATAR_SIZE} />
	else if (UserIcon) you = <UserIcon size="md" color={tint('profile')} />

	const tabs: TabSpec[] = [
		{
			tab: 'home',
			label: 'Home',
			glyph: Home ? <Home size="md" color={tint('home')} /> : null,
			badge: 'home',
		},
		{
			tab: 'notifications',
			label: 'Notifications',
			glyph: Bell ? <Bell size="md" color={tint('notifications')} /> : null,
			badge: 'notifications',
		},
		{ tab: 'profile', label: 'You', glyph: you },
		{
			tab: 'settings',
			label: 'Settings',
			glyph: Gear ? <Gear size="md" color={tint('settings')} /> : null,
		},
	]

	return (
		<View style={[styles.bar, { paddingBottom: insets?.bottom ?? 0 }]}>
			{tabs
				.filter(spec => spec.tab === 'home' || settings.tabs[spec.tab])
				.map(spec => (
					<TabButton
						key={spec.tab}
						styles={styles}
						spec={spec}
						selected={active === spec.tab}
						showLabel={settings.showLabels}
					/>
				))}
		</View>
	)
})

function TabButton({
	styles,
	spec,
	selected,
	showLabel,
}: {
	styles: Styles
	spec: TabSpec
	selected: boolean
	showLabel: boolean
}) {
	let marker: ReactNode = null
	if (spec.badge === 'notifications')
		// The key remounts the badge when Discord's hook arrives late, so a
		// mounted instance never has to change which hook it calls.
		marker = (
			<NotificationsBadge
				key={found.badge ? 'live' : 'waiting'}
				styles={styles}
			/>
		)
	else if (spec.badge === 'home') marker = <MentionsBadge styles={styles} />

	return (
		<Pressable
			style={styles.tab}
			onPress={() => switchTab(spec.tab)}
			onLongPress={spec.tab === 'profile' ? openAccountSheet : undefined}
			accessibilityRole="tab"
			accessibilityLabel={spec.label}
			accessibilityState={{ selected }}
		>
			<View style={styles.iconBox}>
				{spec.glyph}
				{marker}
			</View>
			{showLabel ? (
				<Design.Text
					variant="text-xxs/medium"
					color={
						selected ? 'interactive-text-active' : 'interactive-text-default'
					}
				>
					{spec.label}
				</Design.Text>
			) : null}
		</Pressable>
	)
}

const NO_BADGE = (): Badge => ({})

// Discord's badge hook lives in its own component, so whatever hooks it runs
// inside can never shift the hook order of the bar. The hook is captured once
// per mounted instance (never swapped while mounted, so React's hook order
// holds); when the module loads late, the key in TabButton remounts this
// with the real hook instead of keeping the no-op.
function NotificationsBadge({ styles }: { styles: Styles }) {
	const [useBadge] = useState(() => found.badge ?? NO_BADGE)
	const badge: Badge = useBadge()
	return badgeView(styles, badge?.value ?? 0, badge?.showDot)
}

// Home: mentions across servers and DMs, like the old home tab and the red
// counts on the server rail. GuildReadStateStore.getTotalMentionCount() sums
// every guild plus the DM bucket (passing `true` would leave DMs out).
type MentionStore = {
	getTotalMentionCount?: (excludePrivate?: boolean) => number
	addChangeListener?: (listener: () => void) => void
	removeChangeListener?: (listener: () => void) => void
}

function readMentions() {
	const store = (Stores as Record<string, MentionStore>).GuildReadStateStore
	return store?.getTotalMentionCount?.() ?? 0
}

function MentionsBadge({ styles }: { styles: Styles }) {
	const [count, setCount] = useState(readMentions)
	useEffect(() => {
		const store = (Stores as Record<string, MentionStore>).GuildReadStateStore
		const update = () => setCount(readMentions())
		update()
		store?.addChangeListener?.(update)
		return () => store?.removeChangeListener?.(update)
	}, [])
	return badgeView(styles, count)
}

function badgeView(styles: Styles, count: number, showDot?: boolean) {
	if (count > 0)
		return (
			<View style={styles.badge}>
				<Design.Text variant="text-xxs/bold" color="white">
					{count > 99 ? '99+' : String(count)}
				</Design.Text>
			</View>
		)
	if (showDot) return <View style={styles.dot} />
	return null
}
