export type AccentTone = "cyan" | "coral" | "gold";

export type ThemePalette = {
	bg: string;
	panel: string;
	text: string;
	muted: string;
	cyan: string;
	coral: string;
	gold: string;
};

export type ThemeFonts = {
	display: string;
	body: string;
};

export type ThemeSpec = {
	palette: Partial<ThemePalette>;
	fonts: Partial<ThemeFonts>;
};

type SceneBase = {
	id: string;
	label: string;
	title: string;
	subtitle: string;
	accent?: AccentTone;
	durationInFrames: number;
};

export type HookSceneSpec = SceneBase & {
	type: "hook";
	chips: string[];
	highlight: {
		badge: string;
		title: string;
		copy: string;
	};
	stat: {
		label: string;
		value: string;
		note: string;
	};
	footer: string;
};

export type InsightSceneSpec = SceneBase & {
	type: "insight";
	points: Array<{
		badge: string;
		title: string;
		copy: string;
		accent?: AccentTone;
	}>;
	spotlight: {
		badge: string;
		title: string;
		copy: string;
		note: string;
	};
};

export type TimelineMilestone = {
	era: string;
	title: string;
	copy: string;
};

export type TimelineSceneSpec = SceneBase & {
	type: "timeline";
	milestones: TimelineMilestone[];
};

export type ComparisonCategory = {
	name: string;
	tag: string;
	accent?: AccentTone;
	pros: string;
	cons: string;
};

export type ComparisonSceneSpec = SceneBase & {
	type: "comparison";
	items: ComparisonCategory[];
};

export type ChecklistSceneSpec = SceneBase & {
	type: "checklist";
	tips: Array<{
		kicker: string;
		title: string;
		copy: string;
	}>;
	callout: {
		badge: string;
		title: string;
		copy: string;
	};
};

export type OutroSceneSpec = SceneBase & {
	type: "outro";
	summary: string;
	copy: string;
	nextSteps: Array<{
		label: string;
		copy: string;
	}>;
};

export type VideoSceneSpec =
	| HookSceneSpec
	| InsightSceneSpec
	| TimelineSceneSpec
	| ComparisonSceneSpec
	| ChecklistSceneSpec
	| OutroSceneSpec;

export type TopicFactVideoSpec = {
	id: string;
	compositionId: string;
	topic: string;
	fps: number;
	width: number;
	height: number;
	tickerItems: string[];
	theme?: Partial<ThemeSpec>;
	scenes: VideoSceneSpec[];
};

export const defaultPalette: ThemePalette = {
	bg: "#060a16",
	panel: "rgba(14, 20, 41, 0.78)",
	text: "#f7f7fb",
	muted: "rgba(235, 240, 255, 0.78)",
	cyan: "#36f3e5",
	coral: "#ff7a59",
	gold: "#ffd166",
};

export const defaultFonts: ThemeFonts = {
	display:
		'"Avenir Next Condensed", "Arial Narrow", "PingFang SC", "Hiragino Sans GB", sans-serif',
	body:
		'"Avenir Next", "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif',
};

export const resolveTheme = (spec: TopicFactVideoSpec) => ({
	palette: {
		...defaultPalette,
		...spec.theme?.palette,
	},
	fonts: {
		...defaultFonts,
		...spec.theme?.fonts,
	},
});

export const getAccentColor = (
	spec: TopicFactVideoSpec,
	accent: AccentTone | undefined,
) => {
	const theme = resolveTheme(spec);

	switch (accent) {
		case "coral":
			return theme.palette.coral;
		case "gold":
			return theme.palette.gold;
		case "cyan":
		default:
			return theme.palette.cyan;
	}
};

export const getDurationInFrames = (spec: TopicFactVideoSpec) =>
	spec.scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
