import type {
	AccentTone,
	ComparisonCategory,
	ThemeSpec,
	TimelineMilestone,
	TopicFactVideoSpec,
} from "./video-spec";

export type TopicFactVideoInput = {
	id: string;
	compositionId: string;
	topic: string;
	tickerItems?: string[];
	theme?: Partial<ThemeSpec>;
	hook: {
		label?: string;
		title: string;
		subtitle: string;
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
		accent?: AccentTone;
		durationInFrames?: number;
	};
	insight: {
		label?: string;
		title: string;
		subtitle: string;
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
		accent?: AccentTone;
		durationInFrames?: number;
	};
	timeline: {
		label?: string;
		title: string;
		subtitle: string;
		milestones: TimelineMilestone[];
		accent?: AccentTone;
		durationInFrames?: number;
	};
	comparison: {
		label?: string;
		title: string;
		subtitle: string;
		items: ComparisonCategory[];
		accent?: AccentTone;
		durationInFrames?: number;
	};
	checklist: {
		label?: string;
		title: string;
		subtitle: string;
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
		accent?: AccentTone;
		durationInFrames?: number;
	};
	outro: {
		label?: string;
		title: string;
		subtitle: string;
		summary: string;
		copy: string;
		nextSteps: Array<{
			label: string;
			copy: string;
		}>;
		accent?: AccentTone;
		durationInFrames?: number;
	};
};

export const createPortraitEducationSpec = (
	input: TopicFactVideoInput,
): TopicFactVideoSpec => {
	return {
		id: input.id,
		compositionId: input.compositionId,
		topic: input.topic,
		fps: 30,
		width: 1080,
		height: 1920,
		tickerItems:
			input.tickerItems ?? [input.topic, "知识短视频", "模板化结构", "可复用场景"],
		theme: input.theme,
		scenes: [
			{
				id: `${input.id}-hook`,
				type: "hook",
				label: input.hook.label ?? "开场",
				title: input.hook.title,
				subtitle: input.hook.subtitle,
				accent: input.hook.accent ?? "cyan",
				durationInFrames: input.hook.durationInFrames ?? 120,
				chips: input.hook.chips,
				highlight: input.hook.highlight,
				stat: input.hook.stat,
				footer: input.hook.footer,
			},
			{
				id: `${input.id}-insight`,
				type: "insight",
				label: input.insight.label ?? "拆解",
				title: input.insight.title,
				subtitle: input.insight.subtitle,
				accent: input.insight.accent ?? "gold",
				durationInFrames: input.insight.durationInFrames ?? 180,
				points: input.insight.points,
				spotlight: input.insight.spotlight,
			},
			{
				id: `${input.id}-timeline`,
				type: "timeline",
				label: input.timeline.label ?? "时间线",
				title: input.timeline.title,
				subtitle: input.timeline.subtitle,
				accent: input.timeline.accent ?? "cyan",
				durationInFrames: input.timeline.durationInFrames ?? 240,
				milestones: input.timeline.milestones,
			},
			{
				id: `${input.id}-comparison`,
				type: "comparison",
				label: input.comparison.label ?? "横向看",
				title: input.comparison.title,
				subtitle: input.comparison.subtitle,
				accent: input.comparison.accent ?? "coral",
				durationInFrames: input.comparison.durationInFrames ?? 360,
				items: input.comparison.items,
			},
			{
				id: `${input.id}-checklist`,
				type: "checklist",
				label: input.checklist.label ?? "怎么选",
				title: input.checklist.title,
				subtitle: input.checklist.subtitle,
				accent: input.checklist.accent ?? "gold",
				durationInFrames: input.checklist.durationInFrames ?? 210,
				tips: input.checklist.tips,
				callout: input.checklist.callout,
			},
			{
				id: `${input.id}-outro`,
				type: "outro",
				label: input.outro.label ?? "收尾",
				title: input.outro.title,
				subtitle: input.outro.subtitle,
				accent: input.outro.accent ?? "coral",
				durationInFrames: input.outro.durationInFrames ?? 150,
				summary: input.outro.summary,
				copy: input.outro.copy,
				nextSteps: input.outro.nextSteps,
			},
		],
	};
};
