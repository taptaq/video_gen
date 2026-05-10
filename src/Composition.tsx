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
import type {
	ComparisonSceneSpec,
	HookSceneSpec,
	InsightSceneSpec,
	OutroSceneSpec,
	TimelineSceneSpec,
	TopicFactVideoSpec,
	VideoSceneSpec,
} from "./video-spec";
import { getAccentColor, getDurationInFrames, resolveTheme } from "./video-spec";

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
		interpolate(frame, [start, start + duration], [0, 1], {
			easing: Easing.bezier(0.7, 0, 0.3, 1),
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);

const withRise = (
	progress: number,
	options?: {
		x?: number;
		y?: number;
		scaleFrom?: number;
	},
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
	},
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

const BadgeRow = ({
	items,
	frame,
	accent,
}: {
	items: string[];
	frame: number;
	accent: string;
}) => {
	const { fps } = useVideoConfig();

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: 14,
			}}
		>
			{items.map((item, index) => {
				const progress = entranceProgress(frame, fps, 12 + index * 4);

				return (
					<div
						key={item}
						style={stackStyles(withRise(progress, { y: 20, scaleFrom: 0.95 }), {
							padding: "12px 18px",
							borderRadius: 999,
							border: `1px solid ${accent}55`,
							background: "rgba(255,255,255,0.04)",
							fontSize: 24,
							fontWeight: 650,
							letterSpacing: "-0.03em",
						})}
					>
						{item}
					</div>
				);
			})}
		</div>
	);
};

const SceneShell = ({
	scene,
	spec,
	frame,
	children,
}: {
	scene: VideoSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
	children: ReactNode;
}) => {
	const { fps } = useVideoConfig();
	const headerProgress = entranceProgress(frame, fps);
	const accent = getAccentColor(spec, scene.accent);

	return (
		<AbsoluteFill style={shellStyle}>
			<div
				style={stackStyles(withRise(headerProgress, { y: 42 }), {
					display: "flex",
					flexDirection: "column",
					gap: 18,
				})}
			>
				<div className="eyebrow">{scene.label}</div>
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
					{scene.title}
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
					{scene.subtitle}
				</p>
			</div>
			{children}
		</AbsoluteFill>
	);
};

const BackgroundDecor = ({
	frame,
	spec,
}: {
	frame: number;
	spec: TopicFactVideoSpec;
}) => {
	const { durationInFrames } = useVideoConfig();
	const theme = resolveTheme(spec);
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
					background: `radial-gradient(circle at 18% 18%, ${theme.palette.cyan}3d 0%, transparent 34%), radial-gradient(circle at 82% 18%, ${theme.palette.coral}2e 0%, transparent 33%), radial-gradient(circle at 52% 82%, ${theme.palette.gold}24 0%, transparent 30%)`,
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
					background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.92) 0%, ${theme.palette.cyan}d1 28%, rgba(11,16,34,0) 72%)`,
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
					background: `radial-gradient(circle at 25% 35%, rgba(255,255,255,0.92) 0%, ${theme.palette.coral}c2 25%, rgba(9,13,28,0) 76%)`,
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
					background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.8) 0%, ${theme.palette.gold}b3 26%, rgba(8,12,26,0) 74%)`,
				}}
			/>
		</AbsoluteFill>
	);
};

const BottomTicker = ({
	frame,
	spec,
}: {
	frame: number;
	spec: TopicFactVideoSpec;
}) => {
	const { durationInFrames } = useVideoConfig();
	const translateX = interpolate(frame, [0, durationInFrames], [0, -320], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const items = spec.tickerItems.length > 0 ? spec.tickerItems : [spec.topic];

	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				bottom: 46,
				overflow: "hidden",
				padding: "0 32px",
			}}
		>
			<div
				style={{
					display: "flex",
					gap: 22,
					transform: `translate3d(${translateX}px, 0, 0)`,
				}}
			>
				{[...items, ...items].map((item, index) => (
					<div
						key={`${item}-${index}`}
						style={{
							whiteSpace: "nowrap",
							padding: "12px 18px",
							borderRadius: 999,
							fontSize: 18,
							fontWeight: 700,
							letterSpacing: "0.18em",
							textTransform: "uppercase",
							color: "rgba(255,255,255,0.74)",
							background: "rgba(255,255,255,0.04)",
							border: "1px solid rgba(255,255,255,0.08)",
						}}
					>
						{item}
					</div>
				))}
			</div>
		</div>
	);
};

const HookScene = ({
	scene,
	spec,
	frame,
}: {
	scene: HookSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
}) => {
	const { fps } = useVideoConfig();
	const accent = getAccentColor(spec, scene.accent);

	return (
		<SceneShell scene={scene} spec={spec} frame={frame}>
			<div
				style={stackStyles(withExit(frame, scene.durationInFrames), {
					display: "flex",
					flexDirection: "column",
					gap: 26,
				})}
			>
				<BadgeRow items={scene.chips} frame={frame} accent={accent} />
				<div
					style={stackStyles(withRise(entranceProgress(frame, fps, 16), { y: 48 }), {
						...sceneCardStyle,
						padding: "34px 38px",
						display: "grid",
						gridTemplateColumns: "1.15fr 0.85fr",
						gap: 24,
						alignItems: "center",
					})}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						<div className="metric-badge">{scene.highlight.badge}</div>
						<div
							style={{
								fontSize: 54,
								lineHeight: 1.04,
								fontWeight: 700,
								letterSpacing: "-0.05em",
							}}
						>
							{scene.highlight.title}
						</div>
						<div
							style={{
								fontSize: 27,
								lineHeight: 1.55,
								color: "var(--muted)",
							}}
						>
							{scene.highlight.copy}
						</div>
					</div>
					<div
						style={{
							padding: "28px 24px 30px",
							borderRadius: 34,
							background: "rgba(255,255,255,0.05)",
							border: "1px solid rgba(255,255,255,0.08)",
							display: "flex",
							flexDirection: "column",
							gap: 8,
						}}
					>
						<div className="mini-title">{scene.stat.label}</div>
						<div
							style={stackStyles(gradientTextStyle(accent), {
								fontFamily: "var(--font-display)",
								fontSize: 90,
								lineHeight: 0.9,
								fontWeight: 750,
								letterSpacing: "-0.07em",
							})}
						>
							{scene.stat.value}
						</div>
						<div
							style={{
								fontSize: 24,
								lineHeight: 1.5,
								color: "var(--muted)",
							}}
						>
							{scene.stat.note}
						</div>
					</div>
				</div>
				<div
					style={stackStyles(withRise(entranceProgress(frame, fps, 22), { y: 32 }), {
						fontSize: 26,
						lineHeight: 1.55,
						color: "rgba(255,255,255,0.74)",
						maxWidth: 720,
					})}
				>
					{scene.footer}
				</div>
			</div>
		</SceneShell>
	);
};

const InsightScene = ({
	scene,
	spec,
	frame,
}: {
	scene: InsightSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
}) => {
	const { fps } = useVideoConfig();

	return (
		<SceneShell scene={scene} spec={spec} frame={frame}>
			<div
				style={stackStyles(withExit(frame, scene.durationInFrames), {
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 22,
				})}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr",
						gap: 18,
					}}
				>
					{scene.points.map((point, index) => {
						const pointAccent = getAccentColor(spec, point.accent ?? scene.accent);
						const progress = entranceProgress(frame, fps, 8 + index * 5);

						return (
							<div
								key={point.title}
								style={stackStyles(withRise(progress, { y: 34 }), {
									...sceneCardStyle,
									padding: "28px 30px",
									display: "flex",
									flexDirection: "column",
									gap: 10,
								})}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 18,
									}}
								>
									<div className="metric-badge">{point.badge}</div>
									<div
										style={{
											width: 16,
											height: 16,
											borderRadius: "50%",
											background: pointAccent,
											boxShadow: `0 0 28px ${pointAccent}`,
										}}
									/>
								</div>
								<div
									style={{
										fontSize: 38,
										lineHeight: 1.1,
										fontWeight: 680,
										letterSpacing: "-0.04em",
									}}
								>
									{point.title}
								</div>
								<div
									style={{
										fontSize: 24,
										lineHeight: 1.58,
										color: "var(--muted)",
									}}
								>
									{point.copy}
								</div>
							</div>
						);
					})}
				</div>
				<div
					style={stackStyles(withRise(entranceProgress(frame, fps, 24), { y: 40 }), {
						...sceneCardStyle,
						padding: "34px 34px 38px",
						display: "flex",
						flexDirection: "column",
						gap: 14,
						justifyContent: "space-between",
					})}
				>
					<div className="metric-badge">{scene.spotlight.badge}</div>
					<div
						style={{
							fontSize: 62,
							lineHeight: 1.02,
							fontWeight: 700,
							letterSpacing: "-0.05em",
							textWrap: "balance",
						}}
					>
						{scene.spotlight.title}
					</div>
					<div
						style={{
							fontSize: 28,
							lineHeight: 1.58,
							color: "var(--muted)",
						}}
					>
						{scene.spotlight.copy}
					</div>
					<div
						style={{
							paddingTop: 18,
							borderTop: "1px solid rgba(255,255,255,0.08)",
							fontSize: 22,
							lineHeight: 1.5,
							color: "rgba(255,255,255,0.74)",
						}}
					>
						{scene.spotlight.note}
					</div>
				</div>
			</div>
		</SceneShell>
	);
};

const TimelineScene = ({
	scene,
	spec,
	frame,
}: {
	scene: TimelineSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
}) => {
	const { fps } = useVideoConfig();
	const accent = getAccentColor(spec, scene.accent);

	return (
		<SceneShell scene={scene} spec={spec} frame={frame}>
			<div
				style={stackStyles(withExit(frame, scene.durationInFrames), {
					display: "grid",
					gridTemplateColumns: "100px 1fr",
					gap: 22,
					alignItems: "stretch",
				})}
			>
				<div
					style={stackStyles(withRise(entranceProgress(frame, fps, 6), { y: 26 }), {
						position: "relative",
						display: "flex",
						justifyContent: "center",
					})}
				>
					<div
						style={{
							width: 4,
							borderRadius: 999,
							background: `linear-gradient(180deg, ${accent} 0%, rgba(255,255,255,0.1) 100%)`,
							boxShadow: `0 0 28px ${accent}66`,
						}}
					/>
				</div>
				<div style={{ display: "grid", gap: 18 }}>
					{scene.milestones.map((milestone, index) => {
						const progress = entranceProgress(frame, fps, 12 + index * 8);
						return (
							<div
								key={milestone.era}
								style={stackStyles(withRise(progress, { y: 38 }), {
									...sceneCardStyle,
									padding: "28px 30px",
									display: "grid",
									gridTemplateColumns: "170px 1fr",
									gap: 24,
									alignItems: "start",
								})}
							>
								<div
									style={{
										color: accent,
										fontSize: 24,
										fontWeight: 700,
										letterSpacing: "0.1em",
										textTransform: "uppercase",
									}}
								>
									{milestone.era}
								</div>
								<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
									<div
										style={{
											fontSize: 38,
											lineHeight: 1.1,
											fontWeight: 680,
											letterSpacing: "-0.04em",
										}}
									>
										{milestone.title}
									</div>
									<div
										style={{
											fontSize: 24,
											lineHeight: 1.58,
											color: "var(--muted)",
										}}
									>
										{milestone.copy}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</SceneShell>
	);
};

const ComparisonScene = ({
	scene,
	spec,
	frame,
}: {
	scene: ComparisonSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
}) => {
	const { fps } = useVideoConfig();

	return (
		<SceneShell scene={scene} spec={spec} frame={frame}>
			<div
				style={stackStyles(withExit(frame, scene.durationInFrames), {
					display: "grid",
					gridTemplateColumns: "1fr",
					gap: 18,
				})}
			>
				{scene.items.map((item, index) => {
					const accent = getAccentColor(spec, item.accent ?? scene.accent);
					const progress = entranceProgress(frame, fps, 10 + index * 8);
					return (
						<div
							key={item.name}
							style={stackStyles(withRise(progress, { y: 42 }), {
								...sceneCardStyle,
								padding: "28px 30px",
								display: "grid",
								gridTemplateColumns: "220px 1fr 1fr",
								gap: 20,
								alignItems: "start",
							})}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
								<div className="metric-badge">{item.tag}</div>
								<div
									style={{
										fontSize: 50,
										lineHeight: 0.98,
										fontWeight: 720,
										letterSpacing: "-0.05em",
										color: accent,
									}}
								>
									{item.name}
								</div>
							</div>
							<div
								style={{
									padding: "20px 22px",
									borderRadius: 28,
									background: "rgba(255,255,255,0.04)",
									border: "1px solid rgba(255,255,255,0.08)",
								}}
							>
								<div className="mini-title">优点</div>
								<div
									style={{
										marginTop: 10,
										fontSize: 24,
										lineHeight: 1.55,
										color: "var(--text)",
									}}
								>
									{item.pros}
								</div>
							</div>
							<div
								style={{
									padding: "20px 22px",
									borderRadius: 28,
									background: "rgba(255,255,255,0.04)",
									border: "1px solid rgba(255,255,255,0.08)",
								}}
							>
								<div className="mini-title">留意点</div>
								<div
									style={{
										marginTop: 10,
										fontSize: 24,
										lineHeight: 1.55,
										color: "var(--muted)",
									}}
								>
									{item.cons}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</SceneShell>
	);
};

const ChecklistScene = ({
	scene,
	spec,
	frame,
}: {
	scene: VideoSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
}) => {
	const { fps } = useVideoConfig();
	const accent = getAccentColor(spec, scene.accent);

	if (scene.type !== "checklist") {
		return null;
	}

	return (
		<SceneShell scene={scene} spec={spec} frame={frame}>
			<div
				style={stackStyles(withExit(frame, scene.durationInFrames), {
					display: "grid",
					gridTemplateColumns: "1fr",
					gap: 18,
				})}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 18,
					}}
				>
					{scene.tips.map((tip, index) => {
						const progress = entranceProgress(frame, fps, 10 + index * 6);

						return (
							<div
								key={tip.title}
								style={stackStyles(withRise(progress, { y: 36 }), {
									...sceneCardStyle,
									padding: "26px 28px",
									display: "flex",
									flexDirection: "column",
									gap: 12,
								})}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 12,
									}}
								>
									<div
										style={{
											width: 14,
											height: 14,
											borderRadius: "50%",
											background: accent,
											boxShadow: `0 0 20px ${accent}`,
										}}
									/>
									<div className="mini-title">{tip.kicker}</div>
								</div>
								<div
									style={{
										fontSize: 36,
										lineHeight: 1.12,
										fontWeight: 670,
										letterSpacing: "-0.04em",
									}}
								>
									{tip.title}
								</div>
								<div
									style={{
										fontSize: 23,
										lineHeight: 1.58,
										color: "var(--muted)",
									}}
								>
									{tip.copy}
								</div>
							</div>
						);
					})}
				</div>
				<div
					style={stackStyles(withRise(entranceProgress(frame, fps, 30), { y: 48 }), {
						...sceneCardStyle,
						padding: "30px 34px",
						display: "grid",
						gridTemplateColumns: "1.1fr 0.9fr",
						gap: 24,
						alignItems: "center",
					})}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						<div className="metric-badge">{scene.callout.badge}</div>
						<div
							style={{
								fontSize: 42,
								lineHeight: 1.12,
								fontWeight: 680,
								letterSpacing: "-0.04em",
							}}
						>
							{scene.callout.title}
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
						{scene.callout.copy}
					</div>
				</div>
			</div>
		</SceneShell>
	);
};

const OutroScene = ({
	scene,
	spec,
	frame,
}: {
	scene: OutroSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
}) => {
	const { fps } = useVideoConfig();
	const accent = getAccentColor(spec, scene.accent);

	return (
		<SceneShell scene={scene} spec={spec} frame={frame}>
			<div
				style={stackStyles(withExit(frame, scene.durationInFrames), {
					display: "flex",
					flexDirection: "column",
					gap: 22,
				})}
			>
				<div
					style={stackStyles(withRise(entranceProgress(frame, fps, 10), { y: 52 }), {
						...sceneCardStyle,
						padding: "34px 36px",
						display: "flex",
						flexDirection: "column",
						gap: 16,
					})}
				>
					<div
						style={{
							fontSize: 58,
							lineHeight: 1.02,
							fontWeight: 700,
							letterSpacing: "-0.05em",
						}}
					>
						记住这一句:
						<span style={gradientTextStyle(accent)}> {scene.summary}</span>
					</div>
					<div
						style={{
							fontSize: 28,
							lineHeight: 1.52,
							color: "var(--muted)",
						}}
					>
						{scene.copy}
					</div>
				</div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 18,
					}}
				>
					{scene.nextSteps.map((step) => (
						<div
							key={step.label}
							style={{
								...sceneCardStyle,
								padding: "24px 28px",
								fontSize: 26,
								lineHeight: 1.55,
							}}
						>
							{step.label}:
							<span style={{ color: "var(--muted)" }}> {step.copy}</span>
						</div>
					))}
				</div>
			</div>
		</SceneShell>
	);
};

const renderScene = ({
	scene,
	spec,
	frame,
}: {
	scene: VideoSceneSpec;
	spec: TopicFactVideoSpec;
	frame: number;
}) => {
	switch (scene.type) {
		case "hook":
			return <HookScene scene={scene} spec={spec} frame={frame} />;
		case "insight":
			return <InsightScene scene={scene} spec={spec} frame={frame} />;
		case "timeline":
			return <TimelineScene scene={scene} spec={spec} frame={frame} />;
		case "comparison":
			return <ComparisonScene scene={scene} spec={spec} frame={frame} />;
		case "checklist":
			return <ChecklistScene scene={scene} spec={spec} frame={frame} />;
		case "outro":
			return <OutroScene scene={scene} spec={spec} frame={frame} />;
		default:
			return null;
	}
};

const getSequences = (spec: TopicFactVideoSpec) => {
	let from = 0;

	return spec.scenes.map((scene) => {
		const sequence = {
			scene,
			from,
		};
		from += scene.durationInFrames;
		return sequence;
	});
};

const createVariableStyle = (spec: TopicFactVideoSpec): CSSProperties => {
	const theme = resolveTheme(spec);

	return {
		"--bg": theme.palette.bg,
		"--panel": theme.palette.panel,
		"--text": theme.palette.text,
		"--muted": theme.palette.muted,
		"--cyan": theme.palette.cyan,
		"--coral": theme.palette.coral,
		"--gold": theme.palette.gold,
		"--font-display": theme.fonts.display,
		"--font-body": theme.fonts.body,
	} as CSSProperties;
};

export const FactVideoComposition = ({
	spec,
}: {
	spec: TopicFactVideoSpec;
}) => {
	const frame = useCurrentFrame();
	const sequences = getSequences(spec);

	return (
		<AbsoluteFill
			style={{
				...createVariableStyle(spec),
				color: "var(--text)",
				fontFamily: "var(--font-body)",
			}}
		>
			<BackgroundDecor frame={frame} spec={spec} />
			{sequences.map(({ scene, from }) => (
				<Sequence key={scene.id} from={from} durationInFrames={scene.durationInFrames}>
					{renderScene({
						scene,
						spec,
						frame: frame - from,
					})}
				</Sequence>
			))}
			<BottomTicker frame={frame} spec={spec} />
		</AbsoluteFill>
	);
};

export const getSpecDuration = (spec: TopicFactVideoSpec) => getDurationInFrames(spec);
