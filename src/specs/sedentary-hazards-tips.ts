import { createPortraitEducationSpec } from "../spec-builder";

export const sedentaryHazardsTipsSpec = createPortraitEducationSpec({
	id: "sedentary-hazards-tips",
	compositionId: "SedentaryHazardsTips",
	topic: "久坐危害与应对",
	tickerItems: [
		"每天坐8小时，早死风险增加15%",
		"久坐1小时 = 抽2根烟",
		"每坐1小时，深静脉血栓风险增10%",
		"久坐让臀部肌肉“失忆”",
		"每小时站5分钟，风险降低30%"
	],
	theme: {
		palette: {
			bg: "#1a1a2e",
			panel: "rgba(255,255,255,0.1)",
			cyan: "#00d2ff",
			coral: "#ff6b6b",
			gold: "#ffd700"
		}
	},
	hook: {
		title: "久坐的代价",
		subtitle: "你的身体在抗议",
		chips: [
			"上班族",
			"学生党",
			"游戏玩家"
		],
		highlight: {
			badge: "惊人数据",
			title: "每天久坐8小时",
			copy: "早死风险增加15%"
		},
		stat: {
			label: "久坐时间",
			value: "8h/天",
			note: "平均国民时长"
		},
		footer: "别慌，有办法"
	},
	insight: {
		title: "久坐3大隐形杀手",
		subtitle: "不只是腰疼",
		points: [
			{
				badge: "1",
				title: "脊椎压力",
				copy: "坐姿时腰椎压力是站姿的1.4倍，前倾时飙到1.8倍",
				accent: "coral"
			},
			{
				badge: "2",
				title: "代谢停滞",
				copy: "久坐让脂肪燃烧率下降90%，血糖代谢效率骤降",
				accent: "gold"
			},
			{
				badge: "3",
				title: "臀肌失忆",
				copy: "臀部肌肉长期不激活，会导致腰痛和膝盖压力",
				accent: "cyan"
			}
		],
		spotlight: {
			badge: "真相",
			title: "每小时动一动",
			copy: "哪怕只是站5分钟，也能重启代谢和肌肉",
			note: "关键在频率，而非时长"
		}
	},
	timeline: {
		title: "久坐时间线",
		subtitle: "危害在悄悄累积",
		milestones: [
			{
				era: "30分钟",
				title: "代谢开始减慢",
				copy: "身体开始降低能量消耗"
			},
			{
				era: "1小时",
				title: "肌肉紧张",
				copy: "肩颈和背部开始僵硬"
			},
			{
				era: "2小时",
				title: "风险翻倍",
				copy: "血栓风险显著上升"
			}
		]
	},
	comparison: {
		title: "久坐 vs 活动",
		subtitle: "差异惊人",
		items: [
			{
				name: "代谢率",
				tag: "脂肪燃烧",
				accent: "cyan",
				pros: "活动时高90%",
				cons: "久坐时几乎为零"
			},
			{
				name: "腰椎压力",
				tag: "脊柱健康",
				accent: "coral",
				pros: "站立减轻40%",
				cons: "坐姿增加1.4倍"
			},
			{
				name: "长寿几率",
				tag: "心血管",
				accent: "gold",
				pros: "每小时活动降低30%风险",
				cons: "久坐增加15%早死风险"
			}
		]
	},
	checklist: {
		title: "5分钟拯救计划",
		subtitle: "简单到不可能失败",
		tips: [
			{
				kicker: "动作1",
				title: "起来接杯水",
				copy: "每30分钟起身，顺便伸展一下"
			},
			{
				kicker: "动作2",
				title: "坐姿扭转",
				copy: "左右扭转脊柱，缓解腰部紧张"
			},
			{
				kicker: "动作3",
				title: "靠墙站立",
				copy: "每天累计10分钟，矫正体态"
			},
			{
				kicker: "动作4",
				title: "臀部激活",
				copy: "坐姿夹臀，每组10次，唤醒肌肉"
			}
		],
		callout: {
			badge: "关键",
			title: "打破连续久坐",
			copy: "每坐1小时，活动至少5分钟"
		}
	},
	outro: {
		title: "别让椅子吃掉你的健康",
		subtitle: "从今天开始行动",
		summary: "久坐危害虽大，但简单干预就能大幅降低风险",
		copy: "设置闹钟，每小时站一站，你的身体会感谢你",
		nextSteps: [
			{
				label: "设置提醒",
				copy: "手机或手表每小时震动一次"
			},
			{
				label: "尝试站立办公",
				copy: "每天累计站立2小时"
			}
		]
	}
});
