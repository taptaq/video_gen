import type { CSSProperties, ReactNode } from "react";
import {
	AbsoluteFill,
	Easing,
	Sequence,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";

const historyMilestones = [
	{
		era: "更早以前",
		title: "植物油、动物脂先上场",
		copy: "核心目标很朴素: 先把摩擦降下来，但稳定性和清爽度都比较一般。",
	},
	{
		era: "后来",
		title: "出现更“滑”的替代品",
		copy: "有人会用凡士林类、按摩油类来顶一顶，但并不一定适合所有材质和场景。",
	},
	{
		era: "现代",
		title: "配方开始讲究舒适与兼容",
		copy: "现在更看重 pH、成分刺激性、清洁感，以及和安全套、玩具的兼容性。",
	},
] as const;

const lubricantTypes = [
	{
		name: "水基",
		tag: "入门友好",
		color: "var(--cyan)",
		pros: "清爽、好洗、和安全套及多数玩具更好搭。",
		cons: "蒸发更快，长时间使用时可能要补涂。",
	},
	{
		name: "硅基",
		tag: "超长待机",
		color: "var(--gold)",
		pros: "更持久，遇水也不容易马上失去润滑感。",
		cons: "比较难洗净，和硅胶玩具一起用前要先看说明。",
	},
	{
		name: "油基",
		tag: "顺滑感强",
		color: "var(--coral)",
		pros: "延展性强，外部按摩和长时间顺滑感会更明显。",
		cons: "不适合搭配乳胶安全套，清洁成本也更高。",
	},
] as const;

const sceneFrames = {
	hook: 120,
	normalize: 180,
	history: 240,
	types: 360,
	choice: 210,
	outro: 150,
};

const totalDuration =
	sceneFrames.hook +
	sceneFrames.normalize +
	sceneFrames.history +
	sceneFrames.types +
	sceneFrames.choice +
	sceneFrames.outro;

const shellStyle: CSSProperties = {
	padding: "170px 84px 178px",
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
};

const sceneCardStyle: CSSProperties = {
	borderRadius: 46,
	border: "1px solid rgba(255,255,255,0.12)",
	background:
		"linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(13,18,39,0.38) 100%)",
	boxShadow: "0 32px 90px rgba(4, 8, 24, 0.38)",
	backdropFilter: "blur(20px)",
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const entranceProgress = (frame: number, fps: number, delay = 0) =>
	clamp01(
		spring({
			frame: Math.max(0, frame - delay),
			fps,
			config: {
				damping: 17,
				stiffness: 160,
				mass: 0.8,
			},
		}),
	);

const exitProgress = (frame: number, start: number, duration: number) =>
	clamp01(
		interpolate(
			frame,
			[start, start + duration],
			[0, 1],
			{
				easing: Easing.bezier(0.7, 0, 0.3, 1),
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			},
		),
	);

const withRise = (
	progress: number,
	options?: {
		x?: number;
		y?: number;
		scaleFrom?: number;
	}
): CSSProperties => {
	const x = options?.x ?? 0;
	const y = options?.y ?? 52;
	const scaleFrom = options?.scaleFrom ?? 0.9;

	return {
		opacity: progress,
		transform: `translate3d(${(1 - progress) * x}px, ${(1 - progress) * y}px, 0) scale(${
			scaleFrom + (1 - scaleFrom) * progress
		})`,
	};
};

const withExit = (
	frame: number,
	sceneDuration: number,
	options?: {
		moveY?: number;
		fadeFrames?: number;
	}
): CSSProperties => {
	const fadeFrames = options?.fadeFrames ?? 14;
	const moveY = options?.moveY ?? -46;
	const progress = exitProgress(frame, sceneDuration - fadeFrames, fadeFrames);

	return {
		opacity: 1 - progress,
		transform: `translate3d(0, ${progress * moveY}px, 0) scale(${1 - progress * 0.03})`,
	};
};

const stackStyles = (...styles: Array<CSSProperties | undefined>): CSSProperties =>
	Object.assign({}, ...styles);

const gradientTextStyle = (accent: string): CSSProperties => ({
	backgroundImage: `linear-gradient(135deg, #ffffff 0%, ${accent} 56%, rgba(255,255,255,0.76) 100%)`,
	backgroundClip: "text",
	WebkitBackgroundClip: "text",
	color: "transparent",
});

const SceneShell = ({
	label,
	title,
	subtitle,
	frame,
	children,
	accent,
}: {
	label: string;
	title: string;
	subtitle: string;
	frame: number;
	children: ReactNode;
	accent: string;
}) => {
	const { fps } = useVideoConfig();
	const headerProgress = entranceProgress(frame, fps);

	return (
		<AbsoluteFill style={shellStyle}>
			<div
				style={stackStyles(withRise(headerProgress, { y: 42 }), {
					display: "flex",
					flexDirection: "column",
					gap: 18,
				})}
			>
				<div className="eyebrow">{label}</div>
				<h1
					style={stackStyles(gradientTextStyle(accent), {
						fontFamily: "var(--font-display)",
						fontSize: 108,
						lineHeight: 0.96,
						letterSpacing: "-0.06em",
						margin: 0,
						maxWidth: 900,
						textWrap: "balance",
					})}
				>
					{title}
				</h1>
				<p
					style={{
						margin: 0,
						maxWidth: 860,
						fontSize: 34,
						lineHeight: 1.45,
						color: "var(--muted)",
						letterSpacing: "-0.02em",
					}}
				>
					{subtitle}
				</p>
			</div>
			{children}
		</AbsoluteFill>
	);
};

const BackgroundDecor = ({ frame }: { frame: number }) => {
	const { durationInFrames } = useVideoConfig();
	const drift = interpolate(frame, [0, durationInFrames], [-90, 90], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const pulse = interpolate(frame % 120, [0, 60, 120], [0.96, 1.05, 0.96], {
		easing: Easing.bezier(0.34, 1.56, 0.64, 1),
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const orbit = interpolate(frame, [0, durationInFrames], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill style={{ overflow: "hidden", background: "var(--bg)" }}>
			<div className="noise-overlay" />
			<div className="grid-overlay" />
			<div
				style={{
					position: "absolute",
					inset: -120,
					background:
						"radial-gradient(circle at 18% 18%, rgba(54,243,229,0.24) 0%, rgba(54,243,229,0) 34%), radial-gradient(circle at 82% 18%, rgba(255,122,89,0.18) 0%, rgba(255,122,89,0) 33%), radial-gradient(circle at 52% 82%, rgba(255,209,102,0.14) 0%, rgba(255,209,102,0) 30%)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					width: 560,
					height: 560,
					left: -120 + drift,
					top: 120,
					borderRadius: "50%",
					filter: "blur(16px)",
					opacity: 0.84,
					transform: `scale(${pulse})`,
					background:
						"radial-gradient(circle at 30% 30%, rgba(255,255,255,0.92) 0%, rgba(54,243,229,0.82) 28%, rgba(11,16,34,0) 72%)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					width: 450,
					height: 450,
					right: -60 - drift * 0.45,
					top: 300,
					borderRadius: "46% 54% 59% 41% / 43% 44% 56% 57%",
					filter: "blur(8px)",
					opacity: 0.72,
					transform: `rotate(${orbit * 28}deg)`,
					background:
						"radial-gradient(circle at 25% 35%, rgba(255,255,255,0.92) 0%, rgba(255,122,89,0.76) 25%, rgba(9,13,28,0) 76%)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					width: 420,
					height: 420,
					left: 300,
					bottom: -110 - drift * 0.2,
					borderRadius: "55% 45% 48% 52% / 48% 39% 61% 52%",
					filter: "blur(4px)",
					opacity: 0.58,
					transform: `rotate(${-orbit * 24}deg) scale(${1 + orbit * 0.08})`,
					background:
						"radial-gradient(circle at 50% 42%, rgba(255,255,255,0.8) 0%, rgba(255,209,102,0.7) 26%, rgba(8,12,26,0) 74%)",
				}}
			/>
		</AbsoluteFill>
	);
};

const BottomTicker = ({ frame }: { frame: number }) => {
	const { durationInFrames } = useVideoConfig();
	const translateX = interpolate(frame, [0, durationInFrames], [0, -320], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<div
			style={{
				position: "absolute",
				left: -40,
				right: -40,
				bottom: 54,
				height: 88,
				display: "flex",
				alignItems: "center",
				overflow: "hidden",
				borderTop: "1px solid rgba(255,255,255,0.09)",
				borderBottom: "1px solid rgba(255,255,255,0.09)",
				background: "rgba(7, 12, 26, 0.42)",
				backdropFilter: "blur(14px)",
			}}
		>
			<div
				style={{
					display: "flex",
					gap: 40,
					paddingLeft: 44,
					transform: `translate3d(${translateX}px, 0, 0)`,
					whiteSpace: "nowrap",
					color: "rgba(255,255,255,0.78)",
					fontSize: 22,
					letterSpacing: "0.18em",
					textTransform: "uppercase",
				}}
			>
				{[
					"润滑液 ≠ 只在尴尬时才用",
					"发展史其实是一部配方升级史",
					"三大种类记住: 水基 / 硅基 / 油基",
					"先看舒适度，再看兼容性",
					"科普向内容，具体请以产品说明为准",
					"收藏这支，买前先对照",
				].map((text, index) => (
					<div
						key={`${text}-${index}`}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 18,
						}}
					>
						<span>{text}</span>
						<span style={{ color: "var(--cyan)" }}>●</span>
					</div>
				))}
			</div>
		</div>
	);
};

const HookScene = ({ frame }: { frame: number }) => {
	const { fps } = useVideoConfig();
	const chips = [
		"降低摩擦",
		"提升舒适度",
		"让节奏更顺",
	];

	return (
		<SceneShell
			label="亲密科普 / 第一眼先抓住"
			title="润滑液，真的不只是“救急用品”"
			subtitle="把它理解成体验优化工具，比把它当成尴尬信号更准确。"
			frame={frame}
			accent="var(--cyan)"
		>
			<div
				style={stackStyles(withRise(entranceProgress(frame, fps, 12), { y: 58 }), {
					display: "grid",
					gridTemplateColumns: "1.18fr 0.82fr",
					gap: 28,
					alignItems: "stretch",
				})}
			>
				<div
					style={{
						...sceneCardStyle,
						padding: "34px 36px 38px",
						display: "flex",
						flexDirection: "column",
						gap: 20,
					}}
				>
					<div className="metric-badge">误区纠正</div>
					<div
						style={{
							fontSize: 60,
							lineHeight: 1.02,
							fontWeight: 650,
							letterSpacing: "-0.05em",
							maxWidth: 420,
						}}
					>
						很多人以为它只在“不够”时出现。
					</div>
					<div
						style={{
							fontSize: 28,
							lineHeight: 1.48,
							color: "var(--muted)",
						}}
					>
						其实压力、节奏、时长、环境变化，都可能影响自然润滑状态。
					</div>
				</div>
				<div
					style={{
						...sceneCardStyle,
						padding: "30px 28px",
						position: "relative",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 18,
							borderRadius: 34,
							border: "1px solid rgba(255,255,255,0.08)",
							background:
								"radial-gradient(circle at 24% 28%, rgba(54,243,229,0.24) 0%, rgba(54,243,229,0) 32%), rgba(255,255,255,0.03)",
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: 42,
							top: 54,
							width: 124,
							height: 124,
							borderRadius: "50%",
							background:
								"radial-gradient(circle at 34% 34%, rgba(255,255,255,0.95) 0%, rgba(54,243,229,0.76) 38%, rgba(54,243,229,0) 74%)",
							transform: `translateY(${Math.sin(frame / 15) * 16}px)`,
						}}
					/>
					<div
						style={{
							position: "absolute",
							right: 54,
							top: 152,
							width: 158,
							height: 158,
							borderRadius: "48% 52% 43% 57% / 53% 41% 59% 47%",
							background:
								"radial-gradient(circle at 38% 34%, rgba(255,255,255,0.95) 0%, rgba(255,122,89,0.72) 34%, rgba(255,122,89,0) 76%)",
							transform: `translateY(${Math.cos(frame / 18) * 22}px) rotate(${frame * 0.6}deg)`,
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: 56,
							bottom: 44,
							display: "flex",
							flexDirection: "column",
							gap: 16,
							maxWidth: 280,
						}}
					>
						{chips.map((chip, index) => (
							<div
								key={chip}
								style={stackStyles(withRise(entranceProgress(frame, fps, 22 + index * 6), { x: -26, y: 0 }), {
									padding: "16px 18px",
									borderRadius: 999,
									fontSize: 24,
									fontWeight: 600,
									letterSpacing: "-0.03em",
									background: "rgba(8,12,26,0.58)",
									border: "1px solid rgba(255,255,255,0.08)",
									boxShadow: "0 18px 40px rgba(4, 8, 24, 0.34)",
								})}
							>
								{chip}
							</div>
						))}
					</div>
				</div>
			</div>
		</SceneShell>
	);
};

const NormalizeScene = ({ frame }: { frame: number }) => {
	const { fps } = useVideoConfig();
	const reasons = [
		"节奏太快，身体还没跟上",
		"紧张、疲劳、环境变化",
		"想让体验更柔和、可控",
	];

	return (
		<SceneShell
			label="为什么它会存在"
			title="它更像舒适度放大器，不是“出问题了”"
			subtitle="亲密体验里，舒服和顺滑本来就值得被认真对待。"
			frame={frame}
			accent="var(--gold)"
		>
			<div
				style={stackStyles(
					withRise(entranceProgress(frame, fps, 10), { y: 64 }),
					withExit(frame, sceneFrames.normalize),
					{
						display: "flex",
						flexDirection: "column",
						gap: 24,
					},
				)}
			>
				<div
					style={{
						...sceneCardStyle,
						padding: "34px 34px 26px",
						display: "grid",
						gridTemplateColumns: "0.92fr 1.08fr",
						gap: 28,
						alignItems: "center",
					}}
				>
					<div>
						<div className="metric-badge">关键认知</div>
						<div
							style={{
								marginTop: 18,
								fontSize: 72,
								lineHeight: 0.95,
								fontWeight: 700,
								letterSpacing: "-0.06em",
							}}
						>
							“用”不代表
							<br />
							“不行”
						</div>
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 14,
						}}
					>
						{reasons.map((reason, index) => (
							<div
								key={reason}
								style={stackStyles(withRise(entranceProgress(frame, fps, 18 + index * 5), { x: 38, y: 0 }), {
									padding: "20px 22px",
									borderRadius: 28,
									background: "rgba(255,255,255,0.04)",
									border: "1px solid rgba(255,255,255,0.08)",
									fontSize: 28,
									lineHeight: 1.36,
								})}
							>
								{reason}
							</div>
						))}
					</div>
				</div>
				<div
					style={{
						...sceneCardStyle,
						padding: "28px 32px",
						display: "flex",
						gap: 22,
						alignItems: "center",
					}}
				>
					<div
						style={{
							width: 88,
							height: 88,
							borderRadius: 28,
							background:
								"linear-gradient(135deg, rgba(255,209,102,0.88), rgba(255,122,89,0.88))",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: 38,
							fontWeight: 800,
							color: "#121624",
						}}
					>
						01
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						<div style={{ fontSize: 34, fontWeight: 650, letterSpacing: "-0.03em" }}>
							重点不是“要不要用”，而是“是不是更舒服、更安心”。
						</div>
						<div style={{ fontSize: 26, lineHeight: 1.5, color: "var(--muted)" }}>
							这也是现代配方为什么越来越重视温和感、兼容性和清洁感。
						</div>
					</div>
				</div>
			</div>
		</SceneShell>
	);
};

const HistoryScene = ({ frame }: { frame: number }) => {
	const { fps } = useVideoConfig();

	return (
		<SceneShell
			label="发展史"
			title="润滑液的演化，本质上是一场“从凑合到讲究”的升级"
			subtitle="人们一直在找更顺滑的办法，只是现代产品终于开始认真处理安全与体验。"
			frame={frame}
			accent="var(--coral)"
		>
			<div
				style={stackStyles(withExit(frame, sceneFrames.history), {
					...sceneCardStyle,
					padding: "34px 28px 30px",
					position: "relative",
					overflow: "hidden",
				})}
			>
				<div
					style={{
						position: "absolute",
						left: 76,
						top: 54,
						bottom: 54,
						width: 2,
						background:
							"linear-gradient(180deg, rgba(54,243,229,0.9), rgba(255,122,89,0.46) 52%, rgba(255,209,102,0.12))",
					}}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 24,
					}}
				>
					{historyMilestones.map((item, index) => {
						const progress = entranceProgress(frame, fps, 10 + index * 10);
						return (
							<div
								key={item.era}
								style={stackStyles(withRise(progress, { x: 38, y: 18, scaleFrom: 0.96 }), {
									display: "grid",
									gridTemplateColumns: "120px 1fr",
									gap: 22,
									alignItems: "start",
									position: "relative",
									padding: "10px 18px 10px 0",
								})}
							>
								<div
									style={{
										position: "relative",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: 20,
										letterSpacing: "0.08em",
										color: "rgba(255,255,255,0.72)",
										textTransform: "uppercase",
									}}
								>
									<div
										style={{
											position: "absolute",
											left: 40,
											width: 24,
											height: 24,
											borderRadius: "50%",
											background: index === 0 ? "var(--cyan)" : index === 1 ? "var(--coral)" : "var(--gold)",
											boxShadow: "0 0 0 10px rgba(255,255,255,0.05)",
										}}
									/>
									{item.era}
								</div>
								<div
									style={{
										...sceneCardStyle,
										padding: "24px 26px",
										display: "flex",
										flexDirection: "column",
										gap: 12,
										background:
											"linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(13,18,39,0.58) 100%)",
									}}
								>
									<div style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 650, letterSpacing: "-0.04em" }}>
										{item.title}
									</div>
									<div style={{ fontSize: 26, lineHeight: 1.5, color: "var(--muted)" }}>{item.copy}</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</SceneShell>
	);
};

const TypesScene = ({ frame }: { frame: number }) => {
	const { fps } = useVideoConfig();

	return (
		<SceneShell
			label="三大种类"
			title="真正要记住的，其实就这三类"
			subtitle="选得准，比追求“越滑越好”更重要。先看场景，再看兼容性。"
			frame={frame}
			accent="var(--cyan)"
		>
			<div
				style={stackStyles(withExit(frame, sceneFrames.types), {
					display: "grid",
					gridTemplateRows: "repeat(3, minmax(0, 1fr))",
					gap: 22,
				})}
			>
				{lubricantTypes.map((item, index) => {
					const progress = entranceProgress(frame, fps, 10 + index * 8);
					return (
						<div
							key={item.name}
							style={stackStyles(withRise(progress, { x: index % 2 === 0 ? -42 : 42, y: 20 }), {
								...sceneCardStyle,
								padding: "28px 30px",
								display: "grid",
								gridTemplateColumns: "178px 1fr",
								gap: 24,
								alignItems: "stretch",
								position: "relative",
								overflow: "hidden",
							})}
						>
							<div
								style={{
									position: "absolute",
									inset: 0,
									background: `radial-gradient(circle at 10% 20%, ${item.color}22 0%, transparent 36%)`,
								}}
							/>
							<div
								style={{
									position: "relative",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
									paddingRight: 12,
								}}
							>
								<div
									style={{
										fontSize: 72,
										fontWeight: 750,
										letterSpacing: "-0.08em",
										lineHeight: 0.95,
										...gradientTextStyle(item.color),
									}}
								>
									{item.name}
								</div>
								<div
									style={{
										alignSelf: "flex-start",
										padding: "10px 14px",
										borderRadius: 999,
										fontSize: 20,
										fontWeight: 700,
										color: "#091020",
										background: item.color,
									}}
								>
									{item.tag}
								</div>
							</div>
							<div
								style={{
									position: "relative",
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 16,
								}}
							>
								<div
									style={{
										padding: "18px 18px 20px",
										borderRadius: 28,
										background: "rgba(255,255,255,0.04)",
										border: "1px solid rgba(255,255,255,0.08)",
										display: "flex",
										flexDirection: "column",
										gap: 12,
									}}
								>
									<div className="mini-title">适合点</div>
									<div style={{ fontSize: 24, lineHeight: 1.45, color: "rgba(255,255,255,0.9)" }}>{item.pros}</div>
								</div>
								<div
									style={{
										padding: "18px 18px 20px",
										borderRadius: 28,
										background: "rgba(8,12,26,0.48)",
										border: "1px solid rgba(255,255,255,0.08)",
										display: "flex",
										flexDirection: "column",
										gap: 12,
									}}
								>
									<div className="mini-title">要注意</div>
									<div style={{ fontSize: 24, lineHeight: 1.45, color: "rgba(255,255,255,0.9)" }}>{item.cons}</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</SceneShell>
	);
};

const ChoiceScene = ({ frame }: { frame: number }) => {
	const { fps } = useVideoConfig();
	const rules = [
		{
			title: "第一次尝试 / 想稳妥一点",
			pick: "先看水基",
			accent: "var(--cyan)",
		},
		{
			title: "想更持久 / 遇水环境",
			pick: "考虑硅基",
			accent: "var(--gold)",
		},
		{
			title: "如果要配乳胶安全套",
			pick: "避开油基",
			accent: "var(--coral)",
		},
	];

	return (
		<SceneShell
			label="怎么选"
			title="一张简单速查表，比盲买靠谱得多"
			subtitle="顺序就三步: 看场景、看兼容、看自己是否容易敏感。"
			frame={frame}
			accent="var(--gold)"
		>
			<div
				style={stackStyles(withExit(frame, sceneFrames.choice), {
					display: "flex",
					flexDirection: "column",
					gap: 22,
				})}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3, 1fr)",
						gap: 18,
					}}
				>
					{rules.map((rule, index) => (
						<div
							key={rule.title}
							style={stackStyles(withRise(entranceProgress(frame, fps, 10 + index * 7), { y: 36 }), {
								...sceneCardStyle,
								padding: "26px 22px",
								display: "flex",
								flexDirection: "column",
								gap: 18,
								minHeight: 280,
							})}
						>
							<div
								style={{
									width: 52,
									height: 52,
									borderRadius: 18,
									background: rule.accent,
									color: "#111726",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: 24,
									fontWeight: 800,
								}}
							>
								{index + 1}
							</div>
							<div style={{ fontSize: 28, lineHeight: 1.36, color: "var(--muted)" }}>{rule.title}</div>
							<div style={{ fontSize: 44, lineHeight: 1.04, fontWeight: 700, letterSpacing: "-0.05em" }}>{rule.pick}</div>
						</div>
					))}
				</div>
				<div
					style={stackStyles(withRise(entranceProgress(frame, fps, 26), { y: 28 }), {
						...sceneCardStyle,
						padding: "30px 34px",
						display: "grid",
						gridTemplateColumns: "1.1fr 0.9fr",
						gap: 24,
						alignItems: "center",
					})}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						<div className="metric-badge">最后一条很重要</div>
						<div style={{ fontSize: 42, lineHeight: 1.12, fontWeight: 680, letterSpacing: "-0.04em" }}>
							如果你容易刺激、灼热或反复不舒服，
							<br />
							优先选成分简单、无香精、无噱头型。
						</div>
					</div>
					<div
						style={{
							padding: "24px 24px 28px",
							borderRadius: 32,
							background: "rgba(255,255,255,0.04)",
							border: "1px solid rgba(255,255,255,0.08)",
							fontSize: 24,
							lineHeight: 1.6,
							color: "var(--muted)",
						}}
					>
						持续疼痛、出血或明显刺激感，不建议只靠换产品硬扛。
					</div>
				</div>
			</div>
		</SceneShell>
	);
};

const OutroScene = ({ frame }: { frame: number }) => {
	const { fps } = useVideoConfig();

	return (
		<SceneShell
			label="收尾"
			title="懂类型，比跟风买“最火那瓶”更重要"
			subtitle="把这支当作一张入门速查卡，下次选购时先想场景，再想兼容性。"
			frame={frame}
			accent="var(--coral)"
		>
			<div
				style={stackStyles(withRise(entranceProgress(frame, fps, 10), { y: 52 }), {
					display: "flex",
					flexDirection: "column",
					gap: 22,
				})}
			>
				<div
					style={{
						...sceneCardStyle,
						padding: "34px 36px",
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					<div style={{ fontSize: 58, lineHeight: 1.02, fontWeight: 700, letterSpacing: "-0.05em" }}>
						记住这一句:
						<span style={gradientTextStyle("var(--gold)")}> 先舒服，再顺滑，最后看兼容。</span>
					</div>
					<div style={{ fontSize: 28, lineHeight: 1.52, color: "var(--muted)" }}>
						如果你想继续完善，我下一步还能把这支视频补成口播版、字幕版，或者直接加 BGM 节点。
					</div>
				</div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 18,
					}}
				>
					<div
						style={{
							...sceneCardStyle,
							padding: "24px 28px",
							fontSize: 26,
							lineHeight: 1.55,
						}}
					>
						适合投放方式:
						<span style={{ color: "var(--muted)" }}> 抖音知识类、两性健康科普、购物前对比类短视频。</span>
					</div>
					<div
						style={{
							...sceneCardStyle,
							padding: "24px 28px",
							fontSize: 26,
							lineHeight: 1.55,
						}}
					>
						可继续扩展:
						<span style={{ color: "var(--muted)" }}> 成分避雷、和安全套/玩具的搭配、适合新手的购买顺序。</span>
					</div>
				</div>
			</div>
		</SceneShell>
	);
};

export const MyComposition = () => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill
			style={{
				color: "var(--text)",
				fontFamily: "var(--font-body)",
			}}
		>
			<BackgroundDecor frame={frame} />
			<Sequence durationInFrames={sceneFrames.hook}>
				<HookScene frame={frame} />
			</Sequence>
			<Sequence from={sceneFrames.hook} durationInFrames={sceneFrames.normalize}>
				<NormalizeScene frame={frame - sceneFrames.hook} />
			</Sequence>
			<Sequence
				from={sceneFrames.hook + sceneFrames.normalize}
				durationInFrames={sceneFrames.history}
			>
				<HistoryScene frame={frame - sceneFrames.hook - sceneFrames.normalize} />
			</Sequence>
			<Sequence
				from={sceneFrames.hook + sceneFrames.normalize + sceneFrames.history}
				durationInFrames={sceneFrames.types}
			>
				<TypesScene
					frame={
						frame - sceneFrames.hook - sceneFrames.normalize - sceneFrames.history
					}
				/>
			</Sequence>
			<Sequence
				from={
					sceneFrames.hook +
					sceneFrames.normalize +
					sceneFrames.history +
					sceneFrames.types
				}
				durationInFrames={sceneFrames.choice}
			>
				<ChoiceScene
					frame={
						frame -
						sceneFrames.hook -
						sceneFrames.normalize -
						sceneFrames.history -
						sceneFrames.types
					}
				/>
			</Sequence>
			<Sequence
				from={
					sceneFrames.hook +
					sceneFrames.normalize +
					sceneFrames.history +
					sceneFrames.types +
					sceneFrames.choice
				}
				durationInFrames={sceneFrames.outro}
			>
				<OutroScene
					frame={
						frame -
						sceneFrames.hook -
						sceneFrames.normalize -
						sceneFrames.history -
						sceneFrames.types -
						sceneFrames.choice
					}
				/>
			</Sequence>
			<BottomTicker frame={frame} />
		</AbsoluteFill>
	);
};

export const durationInFrames = totalDuration;
